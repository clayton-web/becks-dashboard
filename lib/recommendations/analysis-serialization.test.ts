import { describe, expect, it } from "vitest";

import {
  directionIdsInBoardOrder,
  flattenScoredBoardToResultRows,
  parsePersistedReasonsV1,
  parseTransitionInputSnapshotV1,
  sortGroupedResultsForDirection,
} from "@/lib/recommendations/analysis-serialization";
import type { RecommendationCandidateTrack } from "@/lib/recommendations/candidates-core";
import type { TransitionDirectionsScoreOutput } from "@/lib/recommendations/scoring";
import { RECOMMENDATION_SCORING_RULES_VERSION } from "@/lib/recommendations/scoring-version";

function stubCandidate(trackId: string): RecommendationCandidateTrack {
  const intel = {
    trackId,
    bpm: { value: 120, provenance: null },
    key: { value: null, provenance: null },
    camelot: { value: "8A", provenance: null },
    energy: { value: 0.5, provenance: null },
    danceability: { value: null, provenance: null },
    valence: { value: 0.5, provenance: null },
    loudness: { value: null, provenance: null },
    moodTags: { value: [], provenance: null },
    genreTags: { value: [], provenance: null },
    themes: { value: [], provenance: null },
    lyricKeywords: { value: [], provenance: null },
    lyricsPlain: { value: null, provenance: null },
    semanticTags: { value: [], provenance: null },
  };
  return {
    trackId,
    title: "T",
    artist: "A",
    album: null,
    albumArtUrl: null,
    spotifyId: null,
    spotifyUri: null,
    isrc: null,
    crates: [],
    intel,
    semantics: {
      moodTags: [],
      themes: [],
      lyricKeywords: [],
      semanticTags: [],
      all: [],
    },
  };
}

const facts = {
  bpmDelta: 2,
  camelotDistance: 1 as number | null,
  energyDelta: 0.01,
  sharedSemanticTags: ["dark"],
  moodShift: null as string | null,
};

describe("directionIdsInBoardOrder", () => {
  it("returns ten directions", () => {
    expect(directionIdsInBoardOrder()).toHaveLength(10);
  });
});

describe("flattenScoredBoardToResultRows", () => {
  it("assigns ranks and preserves score breakdown", () => {
    const scored: TransitionDirectionsScoreOutput = {
      referenceTrackId: "ref",
      directions: [
        {
          directionId: "stay_similar",
          title: "Stay Similar",
          purpose: "p",
          results: [
            {
              track: stubCandidate("t-high"),
              score: 90,
              scoreBreakdown: { bpm_fit: 10 },
              explanation: "ex-high",
              facts,
            },
            {
              track: stubCandidate("t-low"),
              score: 70,
              scoreBreakdown: { bpm_fit: 8 },
              explanation: "ex-low",
              facts,
            },
          ],
        },
      ],
    };

    const rows = flattenScoredBoardToResultRows("run-1", scored);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.track_id).toBe("t-high");
    expect(rows[0]?.score).toBe(90);
    expect(rows[0]?.result_type).toBe("stay_similar");
    const r0 = parsePersistedReasonsV1(rows[0]?.reasons ?? null);
    expect(r0?.rank).toBe(1);
    const r1 = parsePersistedReasonsV1(rows[1]?.reasons ?? null);
    expect(r1?.rank).toBe(2);
    expect(r1?.score_breakdown.bpm_fit).toBe(8);
  });
});

describe("parsePersistedReasonsV1", () => {
  it("returns null for malformed payload", () => {
    expect(parsePersistedReasonsV1(null)).toBeNull();
    expect(
      parsePersistedReasonsV1({ foo: 1 } as unknown as Parameters<
        typeof parsePersistedReasonsV1
      >[0]),
    ).toBeNull();
  });
});

describe("parseTransitionInputSnapshotV1", () => {
  it("round-trips crate scope metadata", () => {
    const snap = {
      snapshot_format_version: 1,
      crate_scope_ids: ["c1", "c2"],
      candidates_loaded: 3,
      total_eligible_before_cap: 10,
      pool_truncated: false,
      max_candidates: 500,
      max_per_direction: 25,
    };
    const parsed = parseTransitionInputSnapshotV1(snap as never);
    expect(parsed?.crate_scope_ids).toEqual(["c1", "c2"]);
    expect(parsed?.max_per_direction).toBe(25);
  });

  it("accepts null crate scope", () => {
    const parsed = parseTransitionInputSnapshotV1({
      snapshot_format_version: 1,
      crate_scope_ids: null,
      candidates_loaded: 0,
      total_eligible_before_cap: 0,
      pool_truncated: false,
      max_candidates: 800,
      max_per_direction: 50,
    } as never);
    expect(parsed?.crate_scope_ids).toBeNull();
  });
});

describe("sortGroupedResultsForDirection", () => {
  it("orders by rank ascending", () => {
    const rows = [
      {
        track_id: "b",
        score: 80,
        result_type: "stay_similar",
        reasons: {
          reasons_format_version: 1,
          rank: 2,
          explanation: "",
          facts,
          score_breakdown: {},
        },
      },
      {
        track_id: "a",
        score: 90,
        result_type: "stay_similar",
        reasons: {
          reasons_format_version: 1,
          rank: 1,
          explanation: "",
          facts,
          score_breakdown: {},
        },
      },
    ];
    const sorted = sortGroupedResultsForDirection(rows);
    expect(sorted.map((r) => r.track_id)).toEqual(["a", "b"]);
  });
});

describe("rules version constant", () => {
  it("matches persisted phase label", () => {
    expect(RECOMMENDATION_SCORING_RULES_VERSION).toBe("phase9.v1");
  });
});
