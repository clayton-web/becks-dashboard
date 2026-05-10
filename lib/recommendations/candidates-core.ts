import type { EnrichmentValueRow, TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import { mergeEnrichmentRowsToSnapshot } from "@/lib/enrichment/read-model";
import type { NormalizedSemanticSignals } from "@/lib/semantic/normalize";
import { normalizedSemanticSignalsFromSnapshot } from "@/lib/semantic/signals";

/** Default max candidates returned before Phase 9 scoring (deterministic pre-score cap). */
export const DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX = 800;

/**
 * Ordering: newest crate membership wins (`lastAddedAt`), then stable UUID tie-break.
 * Title-based ordering is intentionally omitted to avoid loading the full track catalogue
 * when pools are large.
 */
export const CANDIDATE_ORDERING_DESCRIPTION =
  "crate_tracks.added_at descending (max per track), then track id ascending";

export type CandidateCrateRef = {
  crateId: string;
  crateName: string;
};

export type RecommendationCandidateTrack = {
  trackId: string;
  title: string;
  artist: string;
  album: string | null;
  /** Spotify CDN artwork is not stored on `tracks` rows today — always null until ingest adds it. */
  albumArtUrl: string | null;
  spotifyId: string | null;
  spotifyUri: string | null;
  isrc: string | null;
  crates: CandidateCrateRef[];
  intel: TrackIntelSnapshot;
  semantics: NormalizedSemanticSignals;
};

export type CrateTrackMembershipRow = {
  crateId: string;
  crateName: string;
  trackId: string;
  addedAt: string;
};

export type TrackMembershipAggregate = {
  trackId: string;
  crates: CandidateCrateRef[];
  lastAddedAt: string;
};

export type CandidateCapResult = {
  kept: TrackMembershipAggregate[];
  truncated: boolean;
  totalEligibleBeforeCap: number;
};

export function referenceTrackAllowed(
  ownership:
    | { ok: true; ownedTrackIds: readonly string[] }
    | { ok: false; error?: string },
): ownership is { ok: true; ownedTrackIds: readonly string[] } {
  return ownership.ok === true && ownership.ownedTrackIds.length > 0;
}

/**
 * Rolls up crate rows per track (excludes reference), dedupes crates, tracks latest `added_at`.
 */
export function aggregateCrateMembership(
  rows: readonly CrateTrackMembershipRow[],
  referenceTrackId: string,
): TrackMembershipAggregate[] {
  const map = new Map<
    string,
    { crates: Map<string, string>; lastAddedAt: string }
  >();

  const ref = referenceTrackId.trim();
  for (const r of rows) {
    if (r.trackId === ref) continue;
    const slot =
      map.get(r.trackId) ?? {
        crates: new Map<string, string>(),
        lastAddedAt: r.addedAt,
      };
    slot.crates.set(r.crateId, r.crateName);
    if (r.addedAt > slot.lastAddedAt) slot.lastAddedAt = r.addedAt;
    map.set(r.trackId, slot);
  }

  const out: TrackMembershipAggregate[] = [];
  for (const [trackId, slot] of map) {
    const crates: CandidateCrateRef[] = [...slot.crates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([crateId, crateName]) => ({ crateId, crateName }));
    out.push({ trackId, crates, lastAddedAt: slot.lastAddedAt });
  }
  return out;
}

export function sortMembershipForCandidateOrdering(
  items: readonly TrackMembershipAggregate[],
): TrackMembershipAggregate[] {
  return [...items].sort((a, b) => {
    if (a.lastAddedAt !== b.lastAddedAt) {
      return a.lastAddedAt < b.lastAddedAt ? 1 : -1;
    }
    return a.trackId.localeCompare(b.trackId);
  });
}

export function applyCandidateCap(
  sorted: readonly TrackMembershipAggregate[],
  maxCandidates: number,
): CandidateCapResult {
  const totalEligibleBeforeCap = sorted.length;
  if (sorted.length <= maxCandidates) {
    return {
      kept: [...sorted],
      truncated: false,
      totalEligibleBeforeCap,
    };
  }
  return {
    kept: sorted.slice(0, maxCandidates),
    truncated: true,
    totalEligibleBeforeCap,
  };
}

export function assembleRecommendationCandidate(args: {
  trackId: string;
  catalogue: {
    canonical_title: string;
    canonical_artist: string;
    canonical_album: string | null;
    spotify_id: string | null;
    spotify_uri: string | null;
    isrc: string | null;
  };
  crates: CandidateCrateRef[];
  enrichmentRows: readonly EnrichmentValueRow[];
}): RecommendationCandidateTrack {
  const intel = mergeEnrichmentRowsToSnapshot(args.trackId, [...args.enrichmentRows]);
  const semantics = normalizedSemanticSignalsFromSnapshot(intel);
  return {
    trackId: args.trackId,
    title: args.catalogue.canonical_title,
    artist: args.catalogue.canonical_artist,
    album: args.catalogue.canonical_album,
    albumArtUrl: null,
    spotifyId: args.catalogue.spotify_id,
    spotifyUri: args.catalogue.spotify_uri,
    isrc: args.catalogue.isrc,
    crates: args.crates,
    intel,
    semantics,
  };
}
