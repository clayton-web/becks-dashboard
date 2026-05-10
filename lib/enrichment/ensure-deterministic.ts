import "server-only";

import {
  buildManifestKeys,
  filterUpsertsAgainstManifest,
  isDeterministicIntelSnapshotComplete,
  trackNeedsSpotifyAudioFeaturesFetchFromRows,
} from "@/lib/enrichment/deterministic-gate";
import { spotifyAudioFeaturesToInternalKeyUpserts } from "@/lib/enrichment/providers/internal-key";
import { spotifyAudioFeaturesToEnrichmentUpserts } from "@/lib/enrichment/providers/spotify-audio";
import {
  mergeEnrichmentRowsToSnapshot,
  type EnrichmentValueRow,
} from "@/lib/enrichment/read-model";
import {
  fetchTrackEnrichmentRowsForTracks,
  touchTrackLastEnrichedAt,
  upsertTrackEnrichmentValues,
} from "@/lib/enrichment/store";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import {
  fetchSpotifyAudioFeaturesBatch,
  type SpotifyAudioFeaturesObject,
} from "@/lib/spotify/audio-features";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const DETERMINISTIC_ENRICHMENT_MAX_TRACK_IDS = 80;

export type EnsureDeterministicTrackEnrichmentInput = {
  /** Authenticated Supabase user — ownership must match before enrichment. */
  userId: string;
  accessToken: string;
  trackIds: string[];
  force?: boolean;
};

export type EnsureDeterministicTrackEnrichmentSummary = {
  requested: number;
  enriched: number;
  skipped: number;
  missingSpotifyId: number;
  failed: number;
  errors: string[];
};

export async function ensureDeterministicTrackEnrichment(
  input: EnsureDeterministicTrackEnrichmentInput,
): Promise<EnsureDeterministicTrackEnrichmentSummary> {
  void input.userId;
  const force = input.force === true;
  const uniq = [
    ...new Set(input.trackIds.map((id) => id.trim()).filter(Boolean)),
  ];

  const summary: EnsureDeterministicTrackEnrichmentSummary = {
    requested: uniq.length,
    enriched: 0,
    skipped: 0,
    missingSpotifyId: 0,
    failed: 0,
    errors: [],
  };

  if (uniq.length === 0) return summary;

  const admin = createSupabaseServiceRoleClient();

  const { data: trackRows, error: tracksError } = await admin
    .from("tracks")
    .select("id,spotify_id")
    .in("id", uniq);

  if (tracksError) {
    summary.errors.push(`tracks lookup failed: ${tracksError.message}`);
    return summary;
  }

  const found = new Map(
    (trackRows ?? []).map((t) => [t.id, t.spotify_id as string | null]),
  );

  for (const id of uniq) {
    if (!found.has(id)) {
      summary.errors.push(`unknown track id: ${id}`);
    }
  }

  const validWithSpotify = [...found.entries()].filter(([, sid]) => {
    return typeof sid === "string" && sid.trim().length > 0;
  }) as [string, string][];

  summary.missingSpotifyId = uniq.filter((id) => {
    const sid = found.get(id);
    return !(typeof sid === "string" && sid.trim().length > 0);
  }).length;

  if (validWithSpotify.length === 0) {
    return summary;
  }

  const prefetchRows = await fetchTrackEnrichmentRowsForTracks(
    admin,
    validWithSpotify.map(([id]) => id),
  );

  const rowsByTrack = new Map<string, EnrichmentValueRow[]>();
  for (const row of prefetchRows) {
    const list = rowsByTrack.get(row.track_id) ?? [];
    list.push(row);
    rowsByTrack.set(row.track_id, list);
  }

  const needingFetch: { id: string; spotifyId: string }[] = [];
  let skipped = 0;

  for (const [id, spotifyId] of validWithSpotify) {
    const rows = rowsByTrack.get(id) ?? [];
    if (trackNeedsSpotifyAudioFeaturesFetchFromRows(rows, force)) {
      needingFetch.push({ id, spotifyId });
    } else {
      skipped += 1;
    }
  }

  summary.skipped = skipped;

  const pendingUpserts: TrackEnrichmentUpsertInput[] = [];

  const flushUpserts = async () => {
    if (pendingUpserts.length === 0) return;
    await upsertTrackEnrichmentValues(admin, pendingUpserts);
    pendingUpserts.length = 0;
  };

  if (needingFetch.length > 0) {
    let featureMap: Map<string, SpotifyAudioFeaturesObject | null>;
    try {
      featureMap = await fetchSpotifyAudioFeaturesBatch({
        accessToken: input.accessToken,
        spotifyTrackIds: needingFetch.map((t) => t.spotifyId),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`spotify audio-features request failed: ${msg}`);
      return summary;
    }

    for (const { id, spotifyId } of needingFetch) {
      const feat = featureMap.get(spotifyId) ?? null;
      if (!feat) {
        summary.failed += 1;
        summary.errors.push(`[${id}] Spotify returned no audio features`);
        continue;
      }

      const rows = rowsByTrack.get(id) ?? [];
      const manifest = buildManifestKeys(rows);

      const combined = [
        ...spotifyAudioFeaturesToEnrichmentUpserts(id, feat),
        ...spotifyAudioFeaturesToInternalKeyUpserts(id, feat),
      ];

      const filtered = filterUpsertsAgainstManifest(combined, manifest, force);
      if (filtered.length > 0) {
        summary.enriched += 1;
        pendingUpserts.push(...filtered);
      }
    }
  }

  await flushUpserts();

  const refreshIds = [...new Set(validWithSpotify.map(([id]) => id))];
  const postRows = await fetchTrackEnrichmentRowsForTracks(admin, refreshIds);
  const postByTrack = new Map<string, EnrichmentValueRow[]>();
  for (const row of postRows) {
    const list = postByTrack.get(row.track_id) ?? [];
    list.push(row);
    postByTrack.set(row.track_id, list);
  }

  for (const id of refreshIds) {
    const snap = mergeEnrichmentRowsToSnapshot(id, postByTrack.get(id) ?? []);
    if (isDeterministicIntelSnapshotComplete(snap)) {
      await touchTrackLastEnrichedAt(admin, id);
    }
  }

  return summary;
}
