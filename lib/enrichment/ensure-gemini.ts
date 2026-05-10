import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { filterTrackIdsOwnedByUser } from "@/lib/data/track-ownership";
import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import {
  buildGeminiSemanticSystemInstruction,
  buildGeminiSemanticUserPrompt,
  computeSemanticInputHash,
  excerptLyricsPlain,
  geminiSemanticValidatedToUpserts,
  mergeGeminiSemanticProbeRows,
  parseGeminiSemanticJson,
  shouldSkipGeminiSemanticCall,
  type GeminiSemanticProbeRow,
  type GeminiSemanticProviderInput,
} from "@/lib/enrichment/providers/gemini-semantic";
import {
  fetchTrackEnrichmentRowsForTracksAllSources,
  upsertTrackEnrichmentValues,
} from "@/lib/enrichment/store";
import { mergeEnrichmentRowsToSnapshot } from "@/lib/enrichment/read-model";
import { generateGeminiSemanticJson } from "@/lib/gemini/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/supabase";

export const GEMINI_SEMANTIC_ENRICHMENT_MAX_TRACK_IDS = 20;

const GEMINI_SEMANTIC_FIELD_NAMES = [
  ENRICHMENT_FIELD.MOOD_TAGS,
  ENRICHMENT_FIELD.THEMES,
  ENRICHMENT_FIELD.LYRIC_KEYWORDS,
  ENRICHMENT_FIELD.SEMANTIC_TAGS,
] as const;

export type EnsureGeminiSemanticEnrichmentInput = {
  userId: string;
  supabase: SupabaseClient<Database>;
  trackIds: string[];
  force?: boolean;
};

export type EnsureGeminiSemanticEnrichmentSummary = {
  requestedTotal: number;
  requested: number;
  enriched: number;
  skipped: number;
  failed: number;
  rejectedUnauthorized: number;
  rejectedUnauthorizedTrackIds: string[];
  errors: string[];
};

type TrackMetaRow = {
  id: string;
  canonical_title: string;
  canonical_artist: string;
  canonical_album: string | null;
};

export async function ensureGeminiSemanticEnrichment(
  input: EnsureGeminiSemanticEnrichmentInput,
): Promise<EnsureGeminiSemanticEnrichmentSummary> {
  const force = input.force === true;
  const uniq = [
    ...new Set(input.trackIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];

  const summary: EnsureGeminiSemanticEnrichmentSummary = {
    requestedTotal: uniq.length,
    requested: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    rejectedUnauthorized: 0,
    rejectedUnauthorizedTrackIds: [],
    errors: [],
  };

  if (uniq.length === 0) return summary;

  const ownership = await filterTrackIdsOwnedByUser(
    input.supabase,
    input.userId,
    uniq,
  );

  if (!ownership.ok) {
    summary.failed = uniq.length;
    summary.errors.push(`ownership lookup failed: ${ownership.error}`);
    return summary;
  }

  summary.rejectedUnauthorized = ownership.rejectedTrackIds.length;
  summary.rejectedUnauthorizedTrackIds = [...ownership.rejectedTrackIds];

  const ownedIds = ownership.ownedTrackIds;
  summary.requested = ownedIds.length;

  if (ownedIds.length === 0) {
    return summary;
  }

  const admin = createSupabaseServiceRoleClient();

  const { data: trackRows, error: tracksErr } = await admin
    .from("tracks")
    .select("id, canonical_title, canonical_artist, canonical_album")
    .in("id", ownedIds);

  if (tracksErr) {
    summary.failed += ownedIds.length;
    summary.errors.push(`tracks load failed: ${tracksErr.message}`);
    return summary;
  }

  const trackMap = new Map<string, TrackMetaRow>(
    (trackRows ?? []).map((t) => [
      t.id,
      {
        id: t.id,
        canonical_title: t.canonical_title,
        canonical_artist: t.canonical_artist,
        canonical_album: t.canonical_album,
      },
    ]),
  );

  const { data: probeRowsRaw, error: probeErr } = await admin
    .from("track_enrichment_values")
    .select("track_id, field_name, source_payload")
    .in("track_id", ownedIds)
    .eq("source", ENRICHMENT_SOURCE.GEMINI)
    .in("field_name", [...GEMINI_SEMANTIC_FIELD_NAMES]);

  if (probeErr) {
    summary.failed += ownedIds.length;
    summary.errors.push(`gemini probe failed: ${probeErr.message}`);
    return summary;
  }

  const probeMap = mergeGeminiSemanticProbeRows((probeRowsRaw ?? []) as GeminiSemanticProbeRow[]);

  let enrichmentRows: Awaited<ReturnType<typeof fetchTrackEnrichmentRowsForTracksAllSources>>;
  try {
    enrichmentRows = await fetchTrackEnrichmentRowsForTracksAllSources(admin, ownedIds);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    summary.failed += ownedIds.length;
    summary.errors.push(`enrichment rows load failed: ${msg}`);
    return summary;
  }

  const rowsByTrack = new Map<string, typeof enrichmentRows>();
  for (const row of enrichmentRows) {
    const list = rowsByTrack.get(row.track_id) ?? [];
    list.push(row);
    rowsByTrack.set(row.track_id, list);
  }

  const systemInstruction = buildGeminiSemanticSystemInstruction();

  for (const id of ownedIds) {
    const meta = trackMap.get(id);
    if (!meta) {
      summary.failed += 1;
      summary.errors.push(`[${id}] track not found in catalogue`);
      continue;
    }

    const snapshot = mergeEnrichmentRowsToSnapshot(id, rowsByTrack.get(id) ?? []);

    const providerInput: GeminiSemanticProviderInput = {
      title: meta.canonical_title,
      artist: meta.canonical_artist,
      album: meta.canonical_album,
      genreTags: snapshot.genreTags.value,
      lyricExcerpt: excerptLyricsPlain(snapshot.lyricsPlain.value),
      snapshot,
    };

    const computedHash = computeSemanticInputHash(providerInput);

    if (
      shouldSkipGeminiSemanticCall({
        force,
        probe: probeMap.get(id),
        computedHash,
      })
    ) {
      summary.skipped += 1;
      continue;
    }

    const userPrompt = buildGeminiSemanticUserPrompt(providerInput);

    let rawJson: string;
    try {
      rawJson = await generateGeminiSemanticJson({
        systemInstruction,
        userPrompt,
      });
    } catch (e) {
      summary.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`[${id}] gemini request failed: ${msg}`);
      continue;
    }

    const parsed = parseGeminiSemanticJson(rawJson);
    if (!parsed.ok) {
      summary.failed += 1;
      summary.errors.push(`[${id}] gemini output invalid: ${parsed.error}`);
      continue;
    }

    const upserts = geminiSemanticValidatedToUpserts(id, parsed.value, computedHash);

    try {
      await upsertTrackEnrichmentValues(admin, upserts);
      summary.enriched += 1;
    } catch (e) {
      summary.failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`[${id}] persist failed: ${msg}`);
    }
  }

  return summary;
}
