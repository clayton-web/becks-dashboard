/**
 * Locked board directions — ids persist e.g. in `analysis_track_results.result_type`.
 */

export const RECOMMENDATION_DIRECTION = {
  STAY_SIMILAR: "stay_similar",
  BPM_SAFE: "bpm_safe",
  HARMONIC_MATCH: "harmonic_match",
  LIFT_ENERGY: "lift_energy",
  DROP_ENERGY: "drop_energy",
  GO_DARKER: "go_darker",
  GO_BRIGHTER: "go_brighter",
  GENRE_BRIDGE: "genre_bridge",
  LYRIC_WORDPLAY: "lyric_wordplay",
  RESET_ROOM: "reset_room",
} as const;

export type RecommendationDirectionId =
  (typeof RECOMMENDATION_DIRECTION)[keyof typeof RECOMMENDATION_DIRECTION];

export type RecommendationDirectionDefinition = {
  readonly id: RecommendationDirectionId;
  readonly label: string;
  /** Short UX blurb — board column subtitle. */
  readonly purpose: string;
};

export const RECOMMENDATION_DIRECTION_ORDER: readonly RecommendationDirectionDefinition[] =
  [
    {
      id: RECOMMENDATION_DIRECTION.STAY_SIMILAR,
      label: "Stay Similar",
      purpose: "Hold groove, timbre, and vibe close to the reference.",
    },
    {
      id: RECOMMENDATION_DIRECTION.BPM_SAFE,
      label: "BPM Safe",
      purpose: "Keep tempo transitions mixing-friendly without harmonic commitment.",
    },
    {
      id: RECOMMENDATION_DIRECTION.HARMONIC_MATCH,
      label: "Harmonic Match",
      purpose: "Prioritize compatible key / Camelot relationships.",
    },
    {
      id: RECOMMENDATION_DIRECTION.LIFT_ENERGY,
      label: "Lift Energy",
      purpose: "Raise intensity while staying coherent with the room.",
    },
    {
      id: RECOMMENDATION_DIRECTION.DROP_ENERGY,
      label: "Drop Energy",
      purpose: "Cool down intensity for breathing room or recovery.",
    },
    {
      id: RECOMMENDATION_DIRECTION.GO_DARKER,
      label: "Go Darker",
      purpose: "Shift tone moodier, heavier, or more restrained brightness.",
    },
    {
      id: RECOMMENDATION_DIRECTION.GO_BRIGHTER,
      label: "Go Brighter",
      purpose: "Shift tone lighter, airier, or more uplift on the emotional spectrum.",
    },
    {
      id: RECOMMENDATION_DIRECTION.GENRE_BRIDGE,
      label: "Genre Bridge",
      purpose: "Find credible stepping stones across genre borders.",
    },
    {
      id: RECOMMENDATION_DIRECTION.LYRIC_WORDPLAY,
      label: "Lyric / Wordplay",
      purpose: "Exploit semantic, thematic, or narrative connections.",
    },
    {
      id: RECOMMENDATION_DIRECTION.RESET_ROOM,
      label: "Reset Room",
      purpose: "Hard pivot — palette cleanser before a new chapter.",
    },
  ] as const;

export const RECOMMENDATION_DIRECTION_IDS: readonly RecommendationDirectionId[] =
  RECOMMENDATION_DIRECTION_ORDER.map((d) => d.id);

export function recommendationDirectionLabel(
  id: RecommendationDirectionId,
): string {
  const row = RECOMMENDATION_DIRECTION_ORDER.find((d) => d.id === id);
  return row?.label ?? id;
}

export function recommendationDirectionDefinition(
  id: RecommendationDirectionId,
): RecommendationDirectionDefinition | undefined {
  return RECOMMENDATION_DIRECTION_ORDER.find((d) => d.id === id);
}
