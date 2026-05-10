import "server-only";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import { lrclibOutcomeToLyricsUpsertOrNull } from "@/lib/enrichment/providers/lrclib";
import {
  upsertTrackEnrichmentValues,
} from "@/lib/enrichment/store";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import { fetchLrclibPlainLyrics } from "@/lib/lrclib/client";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const LRCLIB_ENRICHMENT_MAX_TRACK_IDS = 80;

export type EnsureLrclibLyricsEnrichmentInput = {
  /** Authenticated user — reserved for auditing (ownership enforced upstream). */
  userId: string;
  /** Caller-filtered catalogue ids (must already belong to this user's crates). */
  trackIds: string[];
  force?: boolean;
};

export type EnsureLrclibLyricsEnrichmentSummary = {
  requested: number;
  enriched: number;
  skipped: number;
  notFound: number;
  failed: number;
  errors: string[];
};

type TrackMetaRow = {
  id: string;
  canonical_title: string;
  canonical_artist: string;
  canonical_album: string | null;
  duration_ms: number | null;
};

export async function ensureLrclibLyricsEnrichment(
  input: EnsureLrclibLyricsEnrichmentInput,
): Promise<EnsureLrclibLyricsEnrichmentSummary> {
  void input.userId;

  const force = input.force === true;
  const ids = [
    ...new Set(input.trackIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];

  const summary: EnsureLrclibLyricsEnrichmentSummary = {
    requested: ids.length,
    enriched: 0,
    skipped: 0,
    notFound: 0,
    failed: 0,
    errors: [],
  };

  if (ids.length === 0) return summary;

  const admin = createSupabaseServiceRoleClient();

  const { data: existingRows, error: exErr } = await admin
    .from("track_enrichment_values")
    .select("track_id")
    .in("track_id", ids)
    .eq("source", ENRICHMENT_SOURCE.LRCLIB)
    .eq("field_name", ENRICHMENT_FIELD.LYRICS_PLAIN);

  if (exErr) {
    summary.errors.push(`lrclib cache probe failed: ${exErr.message}`);
    summary.failed = ids.length;
    return summary;
  }

  const cached = new Set(
    (existingRows ?? [])
      .map((r) => r.track_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const { data: trackRows, error: trErr } = await admin
    .from("tracks")
    .select("id, canonical_title, canonical_artist, canonical_album, duration_ms")
    .in("id", ids);

  if (trErr) {
    summary.errors.push(`tracks load failed: ${trErr.message}`);
    summary.failed = ids.length;
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
        duration_ms: t.duration_ms,
      },
    ]),
  );

  const pending: TrackEnrichmentUpsertInput[] = [];

  for (const id of ids) {
    if (cached.has(id) && !force) {
      summary.skipped += 1;
      continue;
    }

    const meta = trackMap.get(id);
    if (!meta) {
      summary.failed += 1;
      summary.errors.push(`[${id}] track not found in catalogue`);
      continue;
    }

    const outcome = await fetchLrclibPlainLyrics({
      artistName: meta.canonical_artist,
      trackName: meta.canonical_title,
      albumName: meta.canonical_album,
      durationMs: meta.duration_ms,
    });

    const upsert = lrclibOutcomeToLyricsUpsertOrNull(id, outcome);
    if (!upsert) {
      summary.failed += 1;
      const detail =
        !outcome.ok && outcome.detail
          ? outcome.detail
          : !outcome.ok
            ? `${outcome.reason}${outcome.status ? ` (${outcome.status})` : ""}`
            : "unknown";
      summary.errors.push(`[${id}] ${detail}`);
      continue;
    }

    pending.push(upsert);

    const fv = upsert.fieldValue as { text?: unknown };
    if (typeof fv.text === "string" && fv.text.trim().length > 0) {
      summary.enriched += 1;
    } else {
      summary.notFound += 1;
    }
  }

  if (pending.length > 0) {
    await upsertTrackEnrichmentValues(admin, pending);
  }

  return summary;
}
