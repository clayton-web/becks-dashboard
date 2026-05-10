import { describe, expect, it } from "vitest";

import type {
  ResolvedScalar,
  ResolvedTags,
  ResolvedText,
  TrackIntelSnapshot,
} from "@/lib/enrichment/read-model";
import { camelotDistance } from "@/lib/music/key-camelot";
import type { RecommendationCandidateTrack } from "@/lib/recommendations/candidates-core";
import { RECOMMENDATION_DIRECTION_ORDER } from "@/lib/recommendations/directions";
import { buildDirectionExplanation } from "@/lib/recommendations/explanations";
import {
  computeDirectionScoreFacts,
  computeMoodShiftLabel,
  scoreCandidateForDirection,
} from "@/lib/recommendations/scoring-core";
import { scoreTransitionDirections } from "@/lib/recommendations/scoring";
import type { NormalizedSemanticSignals } from "@/lib/semantic/normalize";

function scalar(value: number | null): ResolvedScalar {
  return { value, provenance: null };
}

function text(value: string | null): ResolvedText {
  return { value, provenance: null };
}

function tags(values: string[]): ResolvedTags {
  return { value: values, provenance: null };
}

function intel(id: string, p: Partial<TrackIntelSnapshot>): TrackIntelSnapshot {
  const base: TrackIntelSnapshot = {
    trackId: id,
    bpm: scalar(null),
    key: text(null),
    camelot: text(null),
    energy: scalar(null),
    danceability: scalar(null),
    valence: scalar(null),
    loudness: scalar(null),
    moodTags: tags([]),
    genreTags: tags([]),
    themes: tags([]),
    lyricKeywords: tags([]),
    lyricsPlain: text(null),
    semanticTags: tags([]),
  };
  return { ...base, ...p, trackId: id };
}

function sem(p: Partial<NormalizedSemanticSignals>): NormalizedSemanticSignals {
  const base: NormalizedSemanticSignals = {
    moodTags: [],
    themes: [],
    lyricKeywords: [],
    semanticTags: [],
    all: [],
  };
  const merged = { ...base, ...p };
  if (!p.all && (p.moodTags || p.themes || p.lyricKeywords || p.semanticTags)) {
    merged.all = [
      ...merged.moodTags,
      ...merged.themes,
      ...merged.lyricKeywords,
      ...merged.semanticTags,
    ];
  }
  return merged;
}

function candidate(
  trackId: string,
  i: Partial<TrackIntelSnapshot>,
  s: Partial<NormalizedSemanticSignals>,
): RecommendationCandidateTrack {
  const fullIntel = intel(trackId, i);
  const fullSem = sem({
    moodTags: [],
    themes: [],
    lyricKeywords: [],
    semanticTags: [],
    ...s,
  });
  return {
    trackId,
    title: "Title",
    artist: "Artist",
    album: null,
    albumArtUrl: null,
    spotifyId: null,
    spotifyUri: null,
    isrc: null,
    crates: [],
    intel: fullIntel,
    semantics: fullSem,
  };
}

const REF_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("scoreTransitionDirections", () => {
  const reference = candidate(
    REF_ID,
    {
      bpm: scalar(120),
      camelot: text("8A"),
      energy: scalar(0.5),
      valence: scalar(0.5),
      genreTags: tags(["house"]),
    },
    { moodTags: ["dark"], all: ["dark"] },
  );

  it("returns every direction column with ranked rows", () => {
    const pool = [
      candidate(
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        {
          bpm: scalar(122),
          camelot: text("8A"),
          energy: scalar(0.52),
          genreTags: tags(["house"]),
        },
        { moodTags: ["dark"], all: ["dark"] },
      ),
      candidate(
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        {
          bpm: scalar(140),
          camelot: text("3B"),
          energy: scalar(0.8),
          genreTags: tags(["techno"]),
        },
        { moodTags: ["bright"], all: ["bright"] },
      ),
    ];

    const out = scoreTransitionDirections(reference, pool);
    expect(out.referenceTrackId).toBe(REF_ID);
    expect(out.directions).toHaveLength(RECOMMENDATION_DIRECTION_ORDER.length);
    for (const col of out.directions) {
      expect(col.results.length).toBeGreaterThan(0);
      expect(col.title.length).toBeGreaterThan(0);
      expect(col.directionId).toBeTruthy();
    }
  });

  it("respects maxPerDirection", () => {
    const pool = [
      candidate(
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        { bpm: scalar(121), camelot: text("8A"), energy: scalar(0.51) },
        { all: ["dark"] },
      ),
      candidate(
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        { bpm: scalar(121), camelot: text("8A"), energy: scalar(0.51) },
        { all: ["dark"] },
      ),
    ];
    const out = scoreTransitionDirections(reference, pool, { maxPerDirection: 1 });
    expect(out.directions[0]?.results).toHaveLength(1);
  });

  it("skips reference track id if duplicated in pool", () => {
    const pool = [
      candidate(
        REF_ID,
        { bpm: scalar(121), camelot: text("8A"), energy: scalar(0.51) },
        { all: ["dark"] },
      ),
      candidate(
        "ffffffff-ffff-4fff-8fff-ffffffffffff",
        { bpm: scalar(121), camelot: text("8A"), energy: scalar(0.51) },
        { all: ["dark"] },
      ),
    ];
    const out = scoreTransitionDirections(reference, pool);
    for (const col of out.directions) {
      expect(col.results.every((r) => r.track.trackId !== REF_ID)).toBe(true);
    }
  });

  it("handles empty pool without throwing", () => {
    const out = scoreTransitionDirections(reference, []);
    expect(out.directions.every((d) => d.results.length === 0)).toBe(true);
  });
});

describe("deterministic tie-breaks", () => {
  const reference = candidate(
    REF_ID,
    {
      bpm: scalar(120),
      camelot: text("8A"),
      energy: scalar(0.5),
      genreTags: tags(["x"]),
    },
    { all: ["z"] },
  );

  it("sorts equal scores by track id ascending", () => {
    const cloneIntel = {
      bpm: scalar(120),
      camelot: text("8A"),
      energy: scalar(0.5),
      genreTags: tags(["x"]),
    };
    const cloneSem = { all: ["z"] as string[] };
    const pool = [
      candidate("zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz", cloneIntel, cloneSem),
      candidate("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", cloneIntel, cloneSem),
    ];
    const out = scoreTransitionDirections(reference, pool);
    const stay = out.directions.find((d) => d.directionId === "stay_similar");
    expect(
      stay?.results[0]?.track.trackId.localeCompare(stay.results[1]!.track.trackId),
    ).toBeLessThan(0);
  });
});

describe("scoreCandidateForDirection — signals", () => {
  const ref = candidate(
    REF_ID,
    {
      bpm: scalar(120),
      camelot: text("8A"),
      energy: scalar(0.55),
      valence: scalar(0.6),
      genreTags: tags(["house", "acid"]),
    },
    {
      lyricKeywords: ["rain"],
      themes: ["love"],
      moodTags: ["dark"],
      all: ["dark", "rain", "love"],
    },
  );

  it("stay_similar prefers tiny BPM delta", () => {
    const close = candidate(
      "c1",
      {
        bpm: scalar(121),
        camelot: text("8A"),
        energy: scalar(0.54),
        genreTags: tags(["house"]),
      },
      { all: ["dark"] },
    );
    const far = candidate(
      "c2",
      {
        bpm: scalar(145),
        camelot: text("8A"),
        energy: scalar(0.54),
        genreTags: tags(["house"]),
      },
      { all: ["dark"] },
    );
    const sClose = scoreCandidateForDirection("stay_similar", ref, close).score;
    const sFar = scoreCandidateForDirection("stay_similar", ref, far).score;
    expect(sClose).toBeGreaterThan(sFar);
  });

  it("harmonic_match prefers tighter Camelot distance", () => {
    const close = candidate(
      "h1",
      {
        bpm: scalar(122),
        camelot: text("9A"),
        energy: scalar(0.5),
      },
      { all: [] },
    );
    const far = candidate(
      "h2",
      {
        bpm: scalar(122),
        camelot: text("3B"),
        energy: scalar(0.5),
      },
      { all: [] },
    );
    expect(camelotDistance("8A", "9A")).not.toBeNull();
    const dClose = camelotDistance("8A", "9A")!;
    const dFar = camelotDistance("8A", "3B")!;
    expect(dClose).toBeLessThan(dFar);

    const sClose = scoreCandidateForDirection("harmonic_match", ref, close).score;
    const sFar = scoreCandidateForDirection("harmonic_match", ref, far).score;
    expect(sClose).toBeGreaterThan(sFar);
  });

  it("lift_energy penalizes equal-or-lower energy when both known", () => {
    const lift = candidate(
      "l1",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.72),
      },
      { all: [] },
    );
    const flat = candidate(
      "l2",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.54),
      },
      { all: [] },
    );
    expect(
      scoreCandidateForDirection("lift_energy", ref, lift).score,
    ).toBeGreaterThan(scoreCandidateForDirection("lift_energy", ref, flat).score);
  });

  it("drop_energy penalizes equal-or-higher energy when both known", () => {
    const drop = candidate(
      "d1",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.28),
      },
      { all: [] },
    );
    const flat = candidate(
      "d2",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.56),
      },
      { all: [] },
    );
    expect(
      scoreCandidateForDirection("drop_energy", ref, drop).score,
    ).toBeGreaterThan(scoreCandidateForDirection("drop_energy", ref, flat).score);
  });

  it("go_darker rewards darker semantics signal", () => {
    const darkCand = candidate(
      "gd1",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.5),
        valence: scalar(0.35),
      },
      { all: ["dark", "atmospheric"] },
    );
    const brightCand = candidate(
      "gd2",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.5),
        valence: scalar(0.72),
      },
      { all: ["bright", "summer"] },
    );
    expect(
      scoreCandidateForDirection("go_darker", ref, darkCand).score,
    ).toBeGreaterThan(scoreCandidateForDirection("go_darker", ref, brightCand).score);
  });

  it("go_brighter rewards brighter semantics signal", () => {
    const brightCand = candidate(
      "gb1",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.55),
        valence: scalar(0.78),
      },
      { all: ["bright", "playful"] },
    );
    const darkCand = candidate(
      "gb2",
      {
        bpm: scalar(122),
        camelot: text("8A"),
        energy: scalar(0.55),
        valence: scalar(0.32),
      },
      { all: ["dark", "melancholic"] },
    );
    expect(
      scoreCandidateForDirection("go_brighter", ref, brightCand).score,
    ).toBeGreaterThan(scoreCandidateForDirection("go_brighter", ref, darkCand).score);
  });

  it("lyric_wordplay responds to overlapping lyric keywords", () => {
    const overlap = candidate(
      "lw1",
      { bpm: scalar(122), camelot: text("8A"), energy: scalar(0.5) },
      { lyricKeywords: ["rain", "street"], all: ["rain"] },
    );
    const none = candidate(
      "lw2",
      { bpm: scalar(122), camelot: text("8A"), energy: scalar(0.5) },
      { lyricKeywords: ["ocean"], all: ["ocean"] },
    );
    expect(
      scoreCandidateForDirection("lyric_wordplay", ref, overlap).score,
    ).toBeGreaterThan(scoreCandidateForDirection("lyric_wordplay", ref, none).score);
  });

  it("does not throw when enrichment missing", () => {
    const sparseRef = candidate(REF_ID, {}, { all: [] });
    const sparseCand = candidate("sp", {}, { all: [] });
    expect(() =>
      scoreCandidateForDirection("stay_similar", sparseRef, sparseCand),
    ).not.toThrow();
    const bundle = scoreCandidateForDirection("lift_energy", sparseRef, sparseCand);
    expect(bundle.score).toBeGreaterThanOrEqual(0);
    expect(bundle.score).toBeLessThanOrEqual(100);
  });
});

describe("computeDirectionScoreFacts & mood shift", () => {
  it("computes deltas and intersections", () => {
    const refI = intel(REF_ID, {
      bpm: scalar(120),
      camelot: text("8A"),
      energy: scalar(0.5),
    });
    const candI = intel("x", {
      bpm: scalar(128),
      camelot: text("9A"),
      energy: scalar(0.62),
    });
    const refS = sem({ all: ["dark", "club"] });
    const candS = sem({ all: ["dark", "summer"] });
    const f = computeDirectionScoreFacts(refI, candI, refS, candS);
    expect(f.bpmDelta).toBe(8);
    expect(f.camelotDistance).toBe(camelotDistance("8A", "9A"));
    expect(f.energyDelta).toBeCloseTo(0.12);
    expect(f.sharedSemanticTags).toEqual(["dark"]);
    expect(computeMoodShiftLabel(refS, candS)).not.toBeNull();
  });
});

describe("buildDirectionExplanation", () => {
  it("references BPM clause only from facts", () => {
    const facts = computeDirectionScoreFacts(
      intel(REF_ID, { bpm: scalar(120), camelot: text("8A"), energy: scalar(0.5) }),
      intel("c", { bpm: scalar(125), camelot: text("9A"), energy: scalar(0.48) }),
      sem({ all: ["x"] }),
      sem({ all: ["x", "y"] }),
    );
    const textOut = buildDirectionExplanation("stay_similar", facts);
    expect(textOut).toContain("+5 BPM");
    expect(textOut.toLowerCase()).toContain("camelot");
  });

  it("signals unknown tempo without inventing numbers", () => {
    const facts = computeDirectionScoreFacts(
      intel(REF_ID, { bpm: scalar(null), camelot: text(null), energy: scalar(null) }),
      intel("c", { bpm: scalar(null), camelot: text(null), energy: scalar(null) }),
      sem({ all: [] }),
      sem({ all: [] }),
    );
    const textOut = buildDirectionExplanation("bpm_safe", facts);
    expect(textOut.toLowerCase()).toContain("tempo unknown");
  });
});
