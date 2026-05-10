import type { RecommendationCandidateTrack } from "@/lib/recommendations/candidates-core";
import {
  RECOMMENDATION_DIRECTION_ORDER,
} from "@/lib/recommendations/directions";
import { buildDirectionExplanation } from "@/lib/recommendations/explanations";
import {
  DEFAULT_MAX_RESULTS_PER_DIRECTION,
  scoreCandidateForDirection,
  type DirectionScoreFacts,
  type ScoringReferenceTrack,
} from "@/lib/recommendations/scoring-core";

export type TransitionDirectionsScoreOutput = {
  referenceTrackId: string;
  directions: Array<{
    directionId: string;
    title: string;
    purpose: string;
    results: Array<{
      track: RecommendationCandidateTrack;
      score: number;
      scoreBreakdown: Record<string, number>;
      explanation: string;
      facts: DirectionScoreFacts;
    }>;
  }>;
};

export type ScoreTransitionDirectionsOptions = {
  maxPerDirection?: number;
};

export {
  DEFAULT_MAX_RESULTS_PER_DIRECTION,
  computeDirectionScoreFacts,
  computeMoodShiftLabel,
  scoreCandidateForDirection,
  type DirectionScoreFacts,
  type DirectionScoreBundle,
  type ScoringReferenceTrack,
} from "@/lib/recommendations/scoring-core";

export { buildDirectionExplanation } from "@/lib/recommendations/explanations";

/**
 * Deterministic board scoring: every direction column ranks the same filtered candidate list.
 * Reference track rows should be omitted upstream; any accidental duplicates are skipped here.
 */
export function scoreTransitionDirections(
  reference: ScoringReferenceTrack,
  candidates: readonly RecommendationCandidateTrack[],
  options?: ScoreTransitionDirectionsOptions,
): TransitionDirectionsScoreOutput {
  const maxPerDirection =
    options?.maxPerDirection ?? DEFAULT_MAX_RESULTS_PER_DIRECTION;

  const pool = candidates.filter((c) => c.trackId !== reference.trackId);

  const directions = RECOMMENDATION_DIRECTION_ORDER.map((def) => {
    const scored = pool.map((track) => {
      const bundle = scoreCandidateForDirection(def.id, reference, track);
      const explanation = buildDirectionExplanation(def.id, bundle.facts);
      return {
        track,
        score: bundle.score,
        scoreBreakdown: bundle.scoreBreakdown,
        explanation,
        facts: bundle.facts,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.track.trackId.localeCompare(b.track.trackId);
    });

    const results = scored.slice(0, maxPerDirection);

    return {
      directionId: def.id,
      title: def.label,
      purpose: def.purpose,
      results,
    };
  });

  return {
    referenceTrackId: reference.trackId,
    directions,
  };
}
