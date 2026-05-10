import type { Json } from "@/types/supabase";

import type { RecommendationDirectionId } from "@/lib/recommendations/directions";
import { RECOMMENDATION_DIRECTION_ORDER } from "@/lib/recommendations/directions";
import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";
import type { TransitionDirectionsScoreOutput } from "@/lib/recommendations/scoring";

/** Stored in `analysis_runs.input_snapshot` for MVP transition analyses. */
export type TransitionAnalysisInputSnapshotV1 = {
  snapshot_format_version: 1;
  /** Crate ids included in the candidate query (null = all user crates). */
  crate_scope_ids: string[] | null;
  candidates_loaded: number;
  total_eligible_before_cap: number;
  pool_truncated: boolean;
  max_candidates: number;
  max_per_direction: number;
};

export type PersistedResultReasonsV1 = {
  reasons_format_version: 1;
  rank: number;
  explanation: string;
  facts: DirectionScoreFacts;
  score_breakdown: Record<string, number>;
};

export function buildTransitionInputSnapshotV1(args: {
  crateScopeIds: string[] | null;
  candidatesLoaded: number;
  totalEligibleBeforeCap: number;
  poolTruncated: boolean;
  maxCandidates: number;
  maxPerDirection: number;
}): TransitionAnalysisInputSnapshotV1 {
  return {
    snapshot_format_version: 1,
    crate_scope_ids: args.crateScopeIds,
    candidates_loaded: args.candidatesLoaded,
    total_eligible_before_cap: args.totalEligibleBeforeCap,
    pool_truncated: args.poolTruncated,
    max_candidates: args.maxCandidates,
    max_per_direction: args.maxPerDirection,
  };
}

export function parseTransitionInputSnapshotV1(
  raw: Json | null,
): TransitionAnalysisInputSnapshotV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.snapshot_format_version !== 1) return null;
  const candidates_loaded = o.candidates_loaded;
  const total_eligible_before_cap = o.total_eligible_before_cap;
  const pool_truncated = o.pool_truncated;
  const max_candidates = o.max_candidates;
  const max_per_direction = o.max_per_direction;
  if (typeof candidates_loaded !== "number") return null;
  if (typeof total_eligible_before_cap !== "number") return null;
  if (typeof pool_truncated !== "boolean") return null;
  if (typeof max_candidates !== "number") return null;
  if (typeof max_per_direction !== "number") return null;

  let crate_scope_ids: string[] | null = null;
  const cs = o.crate_scope_ids;
  if (cs === null) crate_scope_ids = null;
  else if (Array.isArray(cs)) {
    crate_scope_ids = cs.filter((x): x is string => typeof x === "string");
  } else return null;

  return {
    snapshot_format_version: 1,
    crate_scope_ids,
    candidates_loaded,
    total_eligible_before_cap,
    pool_truncated,
    max_candidates,
    max_per_direction,
  };
}

export function buildPersistedReasonsV1(args: {
  rank: number;
  explanation: string;
  facts: DirectionScoreFacts;
  scoreBreakdown: Record<string, number>;
}): PersistedResultReasonsV1 {
  return {
    reasons_format_version: 1,
    rank: args.rank,
    explanation: args.explanation,
    facts: args.facts,
    score_breakdown: args.scoreBreakdown,
  };
}

export type AnalysisTrackResultInsertRow = {
  analysis_run_id: string;
  track_id: string;
  score: number;
  result_type: RecommendationDirectionId;
  reasons: Json;
};

/**
 * Flattens scored board output into DB rows (one per candidate × direction slot).
 */
export function flattenScoredBoardToResultRows(
  runId: string,
  scored: TransitionDirectionsScoreOutput,
): AnalysisTrackResultInsertRow[] {
  const rows: AnalysisTrackResultInsertRow[] = [];
  for (const col of scored.directions) {
    const dir = col.directionId as RecommendationDirectionId;
    col.results.forEach((r, idx) => {
      const rank = idx + 1;
      const reasons = buildPersistedReasonsV1({
        rank,
        explanation: r.explanation,
        facts: r.facts,
        scoreBreakdown: r.scoreBreakdown,
      }) as unknown as Json;
      rows.push({
        analysis_run_id: runId,
        track_id: r.track.trackId,
        score: r.score,
        result_type: dir,
        reasons,
      });
    });
  }
  return rows;
}

export function parsePersistedReasonsV1(raw: Json | null): PersistedResultReasonsV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.reasons_format_version !== 1) return null;
  const rank = o.rank;
  const explanation = o.explanation;
  const facts = o.facts;
  const score_breakdown = o.score_breakdown;
  if (typeof rank !== "number" || !Number.isFinite(rank)) return null;
  if (typeof explanation !== "string") return null;
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return null;
  if (!score_breakdown || typeof score_breakdown !== "object" || Array.isArray(score_breakdown)) {
    return null;
  }
  return {
    reasons_format_version: 1,
    rank,
    explanation,
    facts: facts as DirectionScoreFacts,
    score_breakdown: score_breakdown as Record<string, number>,
  };
}

export type GroupedDbResultRow = {
  track_id: string;
  score: number | null;
  result_type: string | null;
  reasons: Json | null;
};

/**
 * Orders persisted rows per direction by rank (then score, track id) for reload.
 */
export function sortGroupedResultsForDirection(
  rows: GroupedDbResultRow[],
): GroupedDbResultRow[] {
  return [...rows].sort((a, b) => {
    const ra = parsePersistedReasonsV1(a.reasons)?.rank ?? 9999;
    const rb = parsePersistedReasonsV1(b.reasons)?.rank ?? 9999;
    if (ra !== rb) return ra - rb;
    const sa = a.score ?? -1;
    const sb = b.score ?? -1;
    if (sa !== sb) return sb - sa;
    return a.track_id.localeCompare(b.track_id);
  });
}

/**
 * Board column order for reload — includes empty directions for stable UI hooks.
 */
export function directionIdsInBoardOrder(): readonly RecommendationDirectionId[] {
  return RECOMMENDATION_DIRECTION_ORDER.map((d) => d.id);
}
