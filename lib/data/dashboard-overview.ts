import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ANALYSIS_TYPE_TRANSITION_BOARD } from "@/lib/recommendations/scoring-version";
import {
  RECOMMENDATION_DIRECTION_IDS,
  recommendationDirectionLabel,
  type RecommendationDirectionId,
} from "@/lib/recommendations/directions";
import type { Database } from "@/types/supabase";

type UserClient = SupabaseClient<Database>;

const CRATE_ID_IN_CHUNK = 200;

function isDirectionId(id: string): id is RecommendationDirectionId {
  return (RECOMMENDATION_DIRECTION_IDS as readonly string[]).includes(id);
}

export type RecentAnalysisRunSummary = {
  id: string;
  createdAt: string;
  referenceTrackId: string | null;
  referenceTitle: string | null;
  referenceArtist: string | null;
};

export type RecentSavedTransitionSummary = {
  id: string;
  createdAt: string;
  directionId: string;
  directionLabel: string;
  candidateTitle: string;
  candidateArtist: string;
};

export type DashboardOverview =
  | {
      ok: true;
      crateCount: number;
      uniqueTracksInCrates: number;
      spotifyConnected: boolean;
      recentRuns: RecentAnalysisRunSummary[];
      recentSaved: RecentSavedTransitionSummary[];
    }
  | { ok: false; message: string };

async function fetchTrackLabels(
  supabase: UserClient,
  ids: string[],
): Promise<Map<string, { title: string; artist: string }>> {
  const uniq = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, { title: string; artist: string }>();
  if (uniq.length === 0) return map;

  const chunk = 120;
  for (let i = 0; i < uniq.length; i += chunk) {
    const slice = uniq.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("tracks")
      .select("id,canonical_title,canonical_artist")
      .in("id", slice);
    if (error) continue;
    for (const row of data ?? []) {
      map.set(row.id, {
        title: row.canonical_title,
        artist: row.canonical_artist,
      });
    }
  }
  return map;
}

/**
 * Crate counts, unique tracks linked across those crates (deduped by track id),
 * Spotify connection presence, recent transition-board runs, and recent saved transitions.
 */
export async function loadDashboardOverview(
  supabase: UserClient,
  userId: string,
): Promise<DashboardOverview> {
  const uid = userId.trim();
  if (!uid) {
    return { ok: false, message: "missing_user" };
  }

  const [
    cratesHead,
    spotifyHead,
    recentRunsRows,
    recentSavedRows,
  ] = await Promise.all([
    supabase.from("crates").select("*", { count: "exact", head: true }).eq("user_id", uid),
    supabase
      .from("spotify_connections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid),
    supabase
      .from("analysis_runs")
      .select("id,created_at,reference_track_id")
      .eq("user_id", uid)
      .eq("analysis_type", ANALYSIS_TYPE_TRANSITION_BOARD)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("saved_transitions")
      .select("id,created_at,direction_id,candidate_track_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (cratesHead.error) {
    return { ok: false, message: cratesHead.error.message };
  }
  if (spotifyHead.error) {
    return { ok: false, message: spotifyHead.error.message };
  }
  if (recentRunsRows.error) {
    return { ok: false, message: recentRunsRows.error.message };
  }
  if (recentSavedRows.error) {
    return { ok: false, message: recentSavedRows.error.message };
  }

  const { data: crateIdRows, error: crateIdsErr } = await supabase
    .from("crates")
    .select("id")
    .eq("user_id", uid);

  if (crateIdsErr) {
    return { ok: false, message: crateIdsErr.message };
  }

  const crateIds = (crateIdRows ?? [])
    .map((r) => r.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const trackIdSet = new Set<string>();

  if (crateIds.length > 0) {
    for (let i = 0; i < crateIds.length; i += CRATE_ID_IN_CHUNK) {
      const slice = crateIds.slice(i, i + CRATE_ID_IN_CHUNK);
      const { data: ct, error: ctErr } = await supabase
        .from("crate_tracks")
        .select("track_id")
        .in("crate_id", slice);
      if (ctErr) {
        return { ok: false, message: ctErr.message };
      }
      for (const row of ct ?? []) {
        if (typeof row.track_id === "string" && row.track_id) {
          trackIdSet.add(row.track_id);
        }
      }
    }
  }

  const runRefs = (recentRunsRows.data ?? []).map((r) => r.reference_track_id).filter(Boolean) as string[];
  const candIds = (recentSavedRows.data ?? []).map((r) => r.candidate_track_id).filter(Boolean) as string[];
  const labels = await fetchTrackLabels(supabase, [...runRefs, ...candIds]);

  const recentRuns: RecentAnalysisRunSummary[] = (recentRunsRows.data ?? []).map((r) => {
    const label = r.reference_track_id ? labels.get(r.reference_track_id) : undefined;
    return {
      id: r.id,
      createdAt: r.created_at,
      referenceTrackId: r.reference_track_id,
      referenceTitle: label?.title ?? null,
      referenceArtist: label?.artist ?? null,
    };
  });

  const recentSaved: RecentSavedTransitionSummary[] = (recentSavedRows.data ?? []).map((r) => {
    const cand = labels.get(r.candidate_track_id);
    const dirId = r.direction_id ?? "";
    return {
      id: r.id,
      createdAt: r.created_at,
      directionId: dirId,
      directionLabel: isDirectionId(dirId) ? recommendationDirectionLabel(dirId) : dirId,
      candidateTitle: cand?.title ?? "Track",
      candidateArtist: cand?.artist ?? "",
    };
  });

  return {
    ok: true,
    crateCount: cratesHead.count ?? 0,
    uniqueTracksInCrates: trackIdSet.size,
    spotifyConnected: (spotifyHead.count ?? 0) > 0,
    recentRuns,
    recentSaved,
  };
}
