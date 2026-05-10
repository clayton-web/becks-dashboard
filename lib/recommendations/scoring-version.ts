/**
 * Bump when scoring weights / direction semantics change materially.
 * Persisted runs replay audit metadata using this label; scores are not recomputed automatically.
 */
export const RECOMMENDATION_SCORING_RULES_VERSION = "phase9.v1";

/** Stored on `analysis_runs.analysis_type` for transition-board analyses. */
export const ANALYSIS_TYPE_TRANSITION_BOARD = "transition_board";
