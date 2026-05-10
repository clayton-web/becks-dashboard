import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { filterTrackIdsOwnedByUser } from "@/lib/data/track-ownership";
import type { EnrichmentValueRow } from "@/lib/enrichment/read-model";
import type { Database } from "@/types/supabase";

import {
  aggregateCrateMembership,
  applyCandidateCap,
  assembleRecommendationCandidate,
  DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
  referenceTrackAllowed,
  sortMembershipForCandidateOrdering,
  type CandidateCrateRef,
  type CrateTrackMembershipRow,
  type RecommendationCandidateTrack,
  type TrackMembershipAggregate,
} from "@/lib/recommendations/candidates-core";

export {
  applyCandidateCap,
  aggregateCrateMembership,
  assembleRecommendationCandidate,
  CANDIDATE_ORDERING_DESCRIPTION,
  DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
  referenceTrackAllowed,
  sortMembershipForCandidateOrdering,
  type CandidateCapResult,
  type CandidateCrateRef,
  type CrateTrackMembershipRow,
  type RecommendationCandidateTrack,
  type TrackMembershipAggregate,
} from "@/lib/recommendations/candidates-core";

type UserClient = SupabaseClient<Database>;

const QUERY_CHUNK = 120;

function uniqStrings(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

export type CandidatePoolQueryInput = {
  userId: string;
  referenceTrackId: string;
  /** When omitted, every crate owned by the user is included. */
  crateIds?: string[] | null;
  /** Hard cap on returned candidates (default {@link DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX}). */
  maxCandidates?: number;
};

export type CandidatePoolQueryResult =
  | {
      ok: true;
      candidates: RecommendationCandidateTrack[];
      truncated: boolean;
      totalEligibleBeforeCap: number;
    }
  | { ok: false; error: string };

export type LoadReferenceTrackResult =
  | { ok: true; track: RecommendationCandidateTrack }
  | {
      ok: false;
      reason: "unauthorized" | "not_found" | "lookup_failed";
      message: string;
    };

async function fetchRowsChunked<T>(
  fetchSlice: (slice: string[]) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  ids: string[],
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += QUERY_CHUNK) {
    const slice = ids.slice(i, i + QUERY_CHUNK);
    const { data, error } = await fetchSlice(slice);
    if (error) {
      return { ok: false, error: error.message };
    }
    rows.push(...((data ?? []) as T[]));
  }
  return { ok: true, rows };
}

/**
 * Resolves crate ids for querying: all owned crates, or a validated subset.
 */
async function resolveEffectiveCrateIds(
  supabase: UserClient,
  userId: string,
  crateScope: string[] | null | undefined,
): Promise<{ ok: true; crateIds: string[] } | { ok: false; error: string }> {
  if (crateScope == null) {
    const { data, error } = await supabase
      .from("crates")
      .select("id")
      .eq("user_id", userId);

    if (error) return { ok: false, error: error.message };
    const ids = (data ?? [])
      .map((r) => r.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return { ok: true, crateIds: ids };
  }

  const wanted = uniqStrings(crateScope);
  if (wanted.length === 0) {
    return { ok: true, crateIds: [] };
  }

  const { data, error } = await supabase
    .from("crates")
    .select("id")
    .eq("user_id", userId)
    .in("id", wanted);

  if (error) return { ok: false, error: error.message };

  const resolved = new Set(
    (data ?? []).map((r) => r.id).filter((id): id is string => typeof id === "string"),
  );

  if (resolved.size !== wanted.length) {
    return {
      ok: false,
      error:
        "crate_scope_invalid: one or more crate ids are missing or not owned by this user",
    };
  }

  return { ok: true, crateIds: wanted };
}

async function fetchCrateNames(
  supabase: UserClient,
  userId: string,
  crateIds: string[],
): Promise<{ ok: true; names: Map<string, string> } | { ok: false; error: string }> {
  if (crateIds.length === 0) return { ok: true, names: new Map() };

  const result = await fetchRowsChunked<{ id: string; name: string }>(
    (slice) =>
      supabase.from("crates").select("id,name").eq("user_id", userId).in("id", slice),
    crateIds,
  );

  if (!result.ok) return result;

  const names = new Map<string, string>();
  for (const row of result.rows) {
    names.set(row.id, row.name);
  }
  return { ok: true, names };
}

async function fetchMembershipRows(
  supabase: UserClient,
  crateIds: string[],
  crateNames: Map<string, string>,
): Promise<{ ok: true; rows: CrateTrackMembershipRow[] } | { ok: false; error: string }> {
  if (crateIds.length === 0) return { ok: true, rows: [] };

  const result = await fetchRowsChunked<{
    crate_id: string;
    track_id: string;
    added_at: string;
  }>(
    (slice) =>
      supabase
        .from("crate_tracks")
        .select("crate_id,track_id,added_at")
        .in("crate_id", slice),
    crateIds,
  );

  if (!result.ok) return result;

  const rows: CrateTrackMembershipRow[] = [];
  for (const r of result.rows) {
    const name = crateNames.get(r.crate_id);
    if (!name) continue;
    rows.push({
      crateId: r.crate_id,
      crateName: name,
      trackId: r.track_id,
      addedAt: r.added_at,
    });
  }

  return { ok: true, rows };
}

async function fetchTrackCatalogueRows(
  supabase: UserClient,
  trackIds: string[],
): Promise<
  | {
      ok: true;
      map: Map<
        string,
        {
          canonical_title: string;
          canonical_artist: string;
          canonical_album: string | null;
          spotify_id: string | null;
          spotify_uri: string | null;
          isrc: string | null;
        }
      >;
    }
  | { ok: false; error: string }
> {
  if (trackIds.length === 0) return { ok: true, map: new Map() };

  const result = await fetchRowsChunked<{
    id: string;
    canonical_title: string;
    canonical_artist: string;
    canonical_album: string | null;
    spotify_id: string | null;
    spotify_uri: string | null;
    isrc: string | null;
  }>(
    (slice) =>
      supabase
        .from("tracks")
        .select(
          "id,canonical_title,canonical_artist,canonical_album,spotify_id,spotify_uri,isrc",
        )
        .in("id", slice),
    trackIds,
  );

  if (!result.ok) return result;

  const map = new Map<
    string,
    {
      canonical_title: string;
      canonical_artist: string;
      canonical_album: string | null;
      spotify_id: string | null;
      spotify_uri: string | null;
      isrc: string | null;
    }
  >();

  for (const row of result.rows) {
    map.set(row.id, {
      canonical_title: row.canonical_title,
      canonical_artist: row.canonical_artist,
      canonical_album: row.canonical_album,
      spotify_id: row.spotify_id,
      spotify_uri: row.spotify_uri,
      isrc: row.isrc,
    });
  }

  return { ok: true, map };
}

async function fetchEnrichmentRowsForTracks(
  supabase: UserClient,
  trackIds: string[],
): Promise<{ ok: true; rows: EnrichmentValueRow[] } | { ok: false; error: string }> {
  if (trackIds.length === 0) return { ok: true, rows: [] };

  const result = await fetchRowsChunked<EnrichmentValueRow>(
    (slice) =>
      supabase
        .from("track_enrichment_values")
        .select("track_id,field_name,field_value,source,confidence")
        .in("track_id", slice),
    trackIds,
  );

  if (!result.ok) return result;
  return { ok: true, rows: result.rows };
}

function groupEnrichmentByTrack(
  rows: readonly EnrichmentValueRow[],
): Map<string, EnrichmentValueRow[]> {
  const map = new Map<string, EnrichmentValueRow[]>();
  for (const row of rows) {
    const list = map.get(row.track_id) ?? [];
    list.push(row);
    map.set(row.track_id, list);
  }
  return map;
}

function materializeCandidates(
  ordered: readonly TrackMembershipAggregate[],
  catalogue: Map<
    string,
    {
      canonical_title: string;
      canonical_artist: string;
      canonical_album: string | null;
      spotify_id: string | null;
      spotify_uri: string | null;
      isrc: string | null;
    }
  >,
  enrichmentByTrack: Map<string, EnrichmentValueRow[]>,
): RecommendationCandidateTrack[] {
  const out: RecommendationCandidateTrack[] = [];
  for (const m of ordered) {
    const cat = catalogue.get(m.trackId);
    if (!cat) continue;
    const rows = enrichmentByTrack.get(m.trackId) ?? [];
    out.push(
      assembleRecommendationCandidate({
        trackId: m.trackId,
        catalogue: cat,
        crates: m.crates,
        enrichmentRows: rows,
      }),
    );
  }
  return out;
}

/**
 * User-scoped candidate intake: tracks linked from the user's crates (optional crate filter),
 * excluding the reference id, deduped across crates, enrichment merged, semantics normalized.
 */
export async function queryRecommendationCandidatePool(
  supabase: UserClient,
  input: CandidatePoolQueryInput,
): Promise<CandidatePoolQueryResult> {
  const referenceTrackId = input.referenceTrackId.trim();
  if (!referenceTrackId) {
    return { ok: false, error: "reference_track_id_required" };
  }

  const ownership = await filterTrackIdsOwnedByUser(supabase, input.userId, [
    referenceTrackId,
  ]);
  if (!ownership.ok) {
    return { ok: false, error: ownership.error };
  }
  if (!referenceTrackAllowed(ownership)) {
    return {
      ok: false,
      error: "reference_track_unauthorized_or_not_in_library",
    };
  }

  const crateResolution = await resolveEffectiveCrateIds(
    supabase,
    input.userId,
    input.crateIds,
  );
  if (!crateResolution.ok) {
    return { ok: false, error: crateResolution.error };
  }

  if (crateResolution.crateIds.length === 0) {
    return {
      ok: true,
      candidates: [],
      truncated: false,
      totalEligibleBeforeCap: 0,
    };
  }

  const namesResult = await fetchCrateNames(supabase, input.userId, crateResolution.crateIds);
  if (!namesResult.ok) {
    return { ok: false, error: namesResult.error };
  }

  const membershipResult = await fetchMembershipRows(
    supabase,
    crateResolution.crateIds,
    namesResult.names,
  );
  if (!membershipResult.ok) {
    return { ok: false, error: membershipResult.error };
  }

  const aggregated = aggregateCrateMembership(membershipResult.rows, referenceTrackId);
  const sorted = sortMembershipForCandidateOrdering(aggregated);
  const maxCap = input.maxCandidates ?? DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX;
  const capped = applyCandidateCap(sorted, maxCap);

  const trackIds = capped.kept.map((k) => k.trackId);

  const catalogueResult = await fetchTrackCatalogueRows(supabase, trackIds);
  if (!catalogueResult.ok) {
    return { ok: false, error: catalogueResult.error };
  }

  const enrichResult = await fetchEnrichmentRowsForTracks(supabase, trackIds);
  if (!enrichResult.ok) {
    return { ok: false, error: enrichResult.error };
  }

  const enrichmentByTrack = groupEnrichmentByTrack(enrichResult.rows);

  const candidates = materializeCandidates(capped.kept, catalogueResult.map, enrichmentByTrack);

  return {
    ok: true,
    candidates,
    truncated: capped.truncated,
    totalEligibleBeforeCap: capped.totalEligibleBeforeCap,
  };
}

async function crateRefsForTrack(
  supabase: UserClient,
  userId: string,
  trackId: string,
): Promise<{ ok: true; crates: CandidateCrateRef[] } | { ok: false; error: string }> {
  const { data: links, error: linkErr } = await supabase
    .from("crate_tracks")
    .select("crate_id")
    .eq("track_id", trackId);

  if (linkErr) return { ok: false, error: linkErr.message };

  const crateIds = uniqStrings((links ?? []).map((l) => l.crate_id));
  if (crateIds.length === 0) return { ok: true, crates: [] };

  const { data: crates, error: crateErr } = await supabase
    .from("crates")
    .select("id,name")
    .eq("user_id", userId)
    .in("id", crateIds);

  if (crateErr) return { ok: false, error: crateErr.message };

  const refs: CandidateCrateRef[] = (crates ?? [])
    .filter((c): c is { id: string; name: string } => typeof c.id === "string")
    .map((c) => ({ crateId: c.id, crateName: c.name }))
    .sort((a, b) => a.crateId.localeCompare(b.crateId));

  return { ok: true, crates: refs };
}

/**
 * Loads the reference track with the same candidate packaging (intel + semantics),
 * after verifying it appears in at least one crate owned by the user.
 */
export async function loadReferenceTrackForRecommendation(
  supabase: UserClient,
  userId: string,
  referenceTrackId: string,
): Promise<LoadReferenceTrackResult> {
  const ref = referenceTrackId.trim();
  if (!ref) {
    return {
      ok: false,
      reason: "not_found",
      message: "reference_track_id_required",
    };
  }

  const ownership = await filterTrackIdsOwnedByUser(supabase, userId, [ref]);
  if (!ownership.ok) {
    return {
      ok: false,
      reason: "lookup_failed",
      message: ownership.error,
    };
  }
  if (!referenceTrackAllowed(ownership)) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "reference_track_not_in_user_crates",
    };
  }

  const { data: trackRow, error: trackErr } = await supabase
    .from("tracks")
    .select(
      "id,canonical_title,canonical_artist,canonical_album,spotify_id,spotify_uri,isrc",
    )
    .eq("id", ref)
    .maybeSingle();

  if (trackErr) {
    return {
      ok: false,
      reason: "lookup_failed",
      message: trackErr.message,
    };
  }

  if (!trackRow?.id) {
    return {
      ok: false,
      reason: "not_found",
      message: "reference_track_catalogue_row_missing",
    };
  }

  const cratesResult = await crateRefsForTrack(supabase, userId, ref);
  if (!cratesResult.ok) {
    return {
      ok: false,
      reason: "lookup_failed",
      message: cratesResult.error,
    };
  }

  const enrichResult = await fetchEnrichmentRowsForTracks(supabase, [ref]);
  if (!enrichResult.ok) {
    return {
      ok: false,
      reason: "lookup_failed",
      message: enrichResult.error,
    };
  }

  const candidate = assembleRecommendationCandidate({
    trackId: ref,
    catalogue: {
      canonical_title: trackRow.canonical_title,
      canonical_artist: trackRow.canonical_artist,
      canonical_album: trackRow.canonical_album,
      spotify_id: trackRow.spotify_id,
      spotify_uri: trackRow.spotify_uri,
      isrc: trackRow.isrc,
    },
    crates: cratesResult.crates,
    enrichmentRows: enrichResult.rows,
  });

  return { ok: true, track: candidate };
}
