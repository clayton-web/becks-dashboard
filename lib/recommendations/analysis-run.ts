import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  directionIdsInBoardOrder,
  flattenScoredBoardToResultRows,
  parsePersistedReasonsV1,
  parseTransitionInputSnapshotV1,
  sortGroupedResultsForDirection,
  type AnalysisTrackResultInsertRow,
  type GroupedDbResultRow,
  type TransitionAnalysisInputSnapshotV1,
} from "@/lib/recommendations/analysis-serialization";
import {
  loadReferenceTrackForRecommendation,
  queryRecommendationCandidatePool,
} from "@/lib/recommendations/candidates";
import { DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX } from "@/lib/recommendations/candidates-core";
import {
  RECOMMENDATION_DIRECTION_ORDER,
  recommendationDirectionLabel,
} from "@/lib/recommendations/directions";
import {
  ANALYSIS_TYPE_TRANSITION_BOARD,
  RECOMMENDATION_SCORING_RULES_VERSION,
} from "@/lib/recommendations/scoring-version";
import { scoreTransitionDirections } from "@/lib/recommendations/scoring";
import {
  DEFAULT_MAX_RESULTS_PER_DIRECTION,
  type DirectionScoreFacts,
} from "@/lib/recommendations/scoring-core";
import type { Database, Json } from "@/types/supabase";
import type {
  LoadedTransitionBoardDirection,
  LoadedTransitionBoardReference,
  LoadedTransitionBoardRow,
  LoadedTransitionBoardTrackInfo,
  LoadTransitionBoardAnalysisResult,
} from "@/lib/recommendations/transition-board-types";

import {
  mergeEnrichmentRowsToSnapshot,
  type EnrichmentValueRow,
} from "@/lib/enrichment/read-model";

type UserClient = SupabaseClient<Database>;

const RESULT_INSERT_CHUNK = 80;

export type PersistTransitionBoardAnalysisInput = {
  userId: string;
  referenceTrackId: string;
  crateIds?: string[] | null;
  maxCandidates?: number;
  maxPerDirection?: number;
};

export type PersistTransitionBoardAnalysisOk = {
  ok: true;
  runId: string;
  scored: ReturnType<typeof scoreTransitionDirections>;
  inputSnapshot: TransitionAnalysisInputSnapshotV1;
};

export type PersistTransitionBoardAnalysisResult =
  | PersistTransitionBoardAnalysisOk
  | { ok: false; error: string };

export type {
  LoadedTransitionBoardAnalysis,
  LoadedTransitionBoardDirection,
  LoadedTransitionBoardReference,
  LoadedTransitionBoardReferenceIntel,
  LoadedTransitionBoardRow,
  LoadedTransitionBoardTrackInfo,
  LoadTransitionBoardAnalysisResult,
} from "@/lib/recommendations/transition-board-types";

async function insertTrackResultsChunked(
  supabase: UserClient,
  rows: AnalysisTrackResultInsertRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (let i = 0; i < rows.length; i += RESULT_INSERT_CHUNK) {
    const slice = rows.slice(i, i + RESULT_INSERT_CHUNK);
    const { error } = await supabase.from("analysis_track_results").insert(slice);
    if (error) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

function buildTrackDisplayMap(
  rows: {
    id: string;
    canonical_title: string;
    canonical_artist: string;
    canonical_album: string | null;
    spotify_id: string | null;
  }[],
): Map<string, LoadedTransitionBoardTrackInfo> {
  const m = new Map<string, LoadedTransitionBoardTrackInfo>();
  for (const r of rows) {
    m.set(r.id, {
      trackId: r.id,
      title: r.canonical_title,
      artist: r.canonical_artist,
      album: r.canonical_album,
      spotifyId: r.spotify_id,
      missingFromCatalogue: false,
    });
  }
  return m;
}

async function fetchTracksDisplayChunked(
  supabase: UserClient,
  ids: string[],
): Promise<Map<string, LoadedTransitionBoardTrackInfo>> {
  const uniq = [...new Set(ids.filter((id) => id.trim()))];
  const map = new Map<string, LoadedTransitionBoardTrackInfo>();
  const CHUNK = 120;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("tracks")
      .select("id,canonical_title,canonical_artist,canonical_album,spotify_id")
      .in("id", slice);
    const merged = buildTrackDisplayMap((data ?? []) as Parameters<typeof buildTrackDisplayMap>[0]);
    for (const [k, v] of merged) map.set(k, v);
  }
  return map;
}

function missingTrackInfo(trackId: string): LoadedTransitionBoardTrackInfo {
  return {
    trackId,
    title: "Unavailable track",
    artist: "",
    album: null,
    spotifyId: null,
    missingFromCatalogue: true,
  };
}

/**
 * Loads reference + candidate pool, scores, persists `analysis_runs` + `analysis_track_results`.
 *
 * **Snapshot tradeoff (MVP):** ids + facts + breakdown + explanation only — not full
 * `TrackIntelSnapshot`. Reload shows **current** catalogue titles when tracks exist; DSP metrics
 * at scoring time are **not** frozen unless we add snapshot blobs later.
 */
export async function persistTransitionBoardAnalysis(
  supabase: UserClient,
  input: PersistTransitionBoardAnalysisInput,
): Promise<PersistTransitionBoardAnalysisResult> {
  const refLoad = await loadReferenceTrackForRecommendation(
    supabase,
    input.userId,
    input.referenceTrackId,
  );
  if (!refLoad.ok) {
    return {
      ok: false,
      error: `reference_track:${refLoad.reason}:${refLoad.message}`,
    };
  }

  const poolResult = await queryRecommendationCandidatePool(supabase, {
    userId: input.userId,
    referenceTrackId: input.referenceTrackId.trim(),
    crateIds: input.crateIds,
    maxCandidates: input.maxCandidates,
  });

  if (!poolResult.ok) {
    return { ok: false, error: poolResult.error };
  }

  const maxPerDir = input.maxPerDirection ?? DEFAULT_MAX_RESULTS_PER_DIRECTION;

  const scored = scoreTransitionDirections(refLoad.track, poolResult.candidates, {
    maxPerDirection: maxPerDir,
  });

  let crateScopeIds: string[] | null = null;
  if (input.crateIds != null) {
    crateScopeIds = [...new Set(input.crateIds.map((id) => id.trim()).filter(Boolean))];
    if (crateScopeIds.length === 0) crateScopeIds = [];
  }

  const maxCandUsed =
    typeof input.maxCandidates === "number"
      ? input.maxCandidates
      : DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX;

  const snapshotFinal: TransitionAnalysisInputSnapshotV1 = {
    snapshot_format_version: 1,
    crate_scope_ids: crateScopeIds,
    candidates_loaded: poolResult.candidates.length,
    total_eligible_before_cap: poolResult.totalEligibleBeforeCap,
    pool_truncated: poolResult.truncated,
    max_candidates: maxCandUsed,
    max_per_direction: maxPerDir,
  };

  const { data: runRow, error: runErr } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: input.userId,
      crate_id: null,
      reference_track_id: refLoad.track.trackId,
      analysis_type: ANALYSIS_TYPE_TRANSITION_BOARD,
      rules_version: RECOMMENDATION_SCORING_RULES_VERSION,
      input_snapshot: snapshotFinal as unknown as Json,
    })
    .select("id")
    .single();

  if (runErr || !runRow?.id) {
    return {
      ok: false,
      error: runErr?.message ?? "analysis_runs insert failed",
    };
  }

  const runId = runRow.id;

  const flatRows = flattenScoredBoardToResultRows(runId, scored);
  if (flatRows.length > 0) {
    const ins = await insertTrackResultsChunked(supabase, flatRows);
    if (!ins.ok) {
      await supabase.from("analysis_runs").delete().eq("id", runId);
      return { ok: false, error: `analysis_track_results:${ins.error}` };
    }
  }

  return {
    ok: true,
    runId,
    scored,
    inputSnapshot: snapshotFinal,
  };
}

export async function loadTransitionBoardAnalysis(
  supabase: UserClient,
  runId: string,
): Promise<LoadTransitionBoardAnalysisResult> {
  const { data: run, error: runErr } = await supabase
    .from("analysis_runs")
    .select("id,reference_track_id,rules_version,analysis_type,input_snapshot,created_at")
    .eq("id", runId)
    .maybeSingle();

  if (runErr || !run) {
    return {
      ok: false,
      reason: "not_found",
      message: runErr?.message ?? "run not found",
    };
  }

  if (run.analysis_type !== ANALYSIS_TYPE_TRANSITION_BOARD) {
    return { ok: false, reason: "wrong_type", message: run.analysis_type };
  }

  const { data: resultRows, error: resErr } = await supabase
    .from("analysis_track_results")
    .select("track_id,score,result_type,reasons")
    .eq("analysis_run_id", runId);

  if (resErr) {
    return {
      ok: false,
      reason: "not_found",
      message: resErr.message,
    };
  }

  const grouped = new Map<string, GroupedDbResultRow[]>();
  for (const row of resultRows ?? []) {
    const rt = row.result_type ?? "";
    const list = grouped.get(rt) ?? [];
    list.push({
      track_id: row.track_id,
      score: row.score,
      result_type: row.result_type,
      reasons: row.reasons,
    });
    grouped.set(rt, list);
  }

  const trackIds = new Set<string>();
  if (run.reference_track_id) trackIds.add(run.reference_track_id);
  for (const row of resultRows ?? []) {
    trackIds.add(row.track_id);
  }

  const displayMap = await fetchTracksDisplayChunked(supabase, [...trackIds]);

  const inputSnapshot = parseTransitionInputSnapshotV1(run.input_snapshot);

  const directions: LoadedTransitionBoardDirection[] = [];
  for (const dirId of directionIdsInBoardOrder()) {
    const def = RECOMMENDATION_DIRECTION_ORDER.find((d) => d.id === dirId);
    const rawList = grouped.get(dirId) ?? [];
    const sorted = sortGroupedResultsForDirection(rawList);
    const results: LoadedTransitionBoardRow[] = [];

    for (const r of sorted) {
      const parsed = parsePersistedReasonsV1(r.reasons);
      const rank = parsed?.rank ?? 9999;
      const score = typeof r.score === "number" ? Math.round(r.score) : 0;
      const explanation =
        parsed?.explanation ?? "Explanation unavailable (legacy or malformed row).";
      const facts: DirectionScoreFacts =
        parsed?.facts ?? {
          bpmDelta: null,
          camelotDistance: null,
          energyDelta: null,
          sharedSemanticTags: [],
          moodShift: null,
        };
      const scoreBreakdown = parsed?.score_breakdown ?? {};
      const trackInfo = displayMap.get(r.track_id) ?? missingTrackInfo(r.track_id);

      results.push({
        rank,
        score,
        explanation,
        facts,
        scoreBreakdown,
        track: trackInfo,
      });
    }

    results.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.score !== a.score) return b.score - a.score;
      return a.track.trackId.localeCompare(b.track.trackId);
    });

    directions.push({
      directionId: dirId,
      title: def?.label ?? recommendationDirectionLabel(dirId),
      purpose: def?.purpose ?? "",
      results,
    });
  }

  let reference: LoadedTransitionBoardReference | undefined;
  const refId = run.reference_track_id;
  if (refId) {
    const base = displayMap.get(refId) ?? missingTrackInfo(refId);
    const { data: encRows, error: encErr } = await supabase
      .from("track_enrichment_values")
      .select("track_id,field_name,field_value,source,confidence")
      .eq("track_id", refId);
    const narrowRows = (encErr ? [] : (encRows ?? [])) as EnrichmentValueRow[];
    const snap = mergeEnrichmentRowsToSnapshot(refId, narrowRows);
    reference = {
      ...base,
      intel: {
        bpm: snap.bpm.value,
        key: snap.key.value,
        camelot: snap.camelot.value,
        energy: snap.energy.value,
        moodTags: [...snap.moodTags.value],
        semanticTags: [...snap.semanticTags.value],
        themes: [...snap.themes.value],
      },
    };
  }

  return {
    ok: true,
    analysis: {
      runId: run.id,
      referenceTrackId: run.reference_track_id,
      reference,
      rulesVersion: run.rules_version,
      analysisType: run.analysis_type,
      createdAt: run.created_at,
      inputSnapshot,
      directions,
    },
  };
}
