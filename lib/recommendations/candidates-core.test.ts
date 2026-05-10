import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import type { EnrichmentValueRow } from "@/lib/enrichment/read-model";
import {
  aggregateCrateMembership,
  applyCandidateCap,
  assembleRecommendationCandidate,
  DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
  referenceTrackAllowed,
  sortMembershipForCandidateOrdering,
} from "@/lib/recommendations/candidates-core";

const REF = "ref-track-id";

function moodRow(trackId: string): EnrichmentValueRow {
  return {
    track_id: trackId,
    field_name: ENRICHMENT_FIELD.MOOD_TAGS,
    source: ENRICHMENT_SOURCE.GEMINI,
    field_value: { tags: ["moody"] },
    confidence: null,
  };
}

describe("referenceTrackAllowed", () => {
  it("accepts non-empty owned ids", () => {
    expect(referenceTrackAllowed({ ok: true, ownedTrackIds: [REF] })).toBe(true);
  });

  it("rejects failed ownership lookup", () => {
    expect(referenceTrackAllowed({ ok: false, error: "db" })).toBe(false);
  });

  it("rejects empty owned list", () => {
    expect(referenceTrackAllowed({ ok: true, ownedTrackIds: [] })).toBe(false);
  });
});

describe("aggregateCrateMembership", () => {
  it("returns empty when only reference exists", () => {
    expect(
      aggregateCrateMembership(
        [
          {
            crateId: "c1",
            crateName: "A",
            trackId: REF,
            addedAt: "2026-01-01T00:00:00Z",
          },
        ],
        REF,
      ),
    ).toEqual([]);
  });

  it("excludes reference track", () => {
    const rows = [
      {
        crateId: "c1",
        crateName: "A",
        trackId: REF,
        addedAt: "2026-01-10T00:00:00Z",
      },
      {
        crateId: "c1",
        crateName: "A",
        trackId: "t2",
        addedAt: "2026-01-09T00:00:00Z",
      },
    ];
    const agg = aggregateCrateMembership(rows, REF);
    expect(agg.map((x) => x.trackId)).toEqual(["t2"]);
  });

  it("dedupes same track across crates", () => {
    const rows = [
      {
        crateId: "c1",
        crateName: "A",
        trackId: "t2",
        addedAt: "2026-01-01T00:00:00Z",
      },
      {
        crateId: "c2",
        crateName: "B",
        trackId: "t2",
        addedAt: "2026-01-02T00:00:00Z",
      },
    ];
    const agg = aggregateCrateMembership(rows, REF);
    expect(agg).toHaveLength(1);
    expect(agg[0]?.crates).toEqual([
      { crateId: "c1", crateName: "A" },
      { crateId: "c2", crateName: "B" },
    ]);
    expect(agg[0]?.lastAddedAt).toBe("2026-01-02T00:00:00Z");
  });
});

describe("sortMembershipForCandidateOrdering", () => {
  it("orders by lastAddedAt desc then track id", () => {
    const sorted = sortMembershipForCandidateOrdering([
      {
        trackId: "b",
        lastAddedAt: "2026-01-01T00:00:00Z",
        crates: [{ crateId: "c", crateName: "x" }],
      },
      {
        trackId: "a",
        lastAddedAt: "2026-01-02T00:00:00Z",
        crates: [{ crateId: "c", crateName: "x" }],
      },
      {
        trackId: "c",
        lastAddedAt: "2026-01-02T00:00:00Z",
        crates: [{ crateId: "c", crateName: "x" }],
      },
    ]);
    expect(sorted.map((x) => x.trackId)).toEqual(["a", "c", "b"]);
  });
});

describe("applyCandidateCap", () => {
  it("marks truncated when over max", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      trackId: `t${i}`,
      lastAddedAt: "2026-01-01T00:00:00Z",
      crates: [] as { crateId: string; crateName: string }[],
    }));
    const cap = applyCandidateCap(items, 3);
    expect(cap.kept).toHaveLength(3);
    expect(cap.truncated).toBe(true);
    expect(cap.totalEligibleBeforeCap).toBe(5);
  });
});

describe("assembleRecommendationCandidate", () => {
  it("preserves lyric keywords in semantics without synonym folding", () => {
    const tid = "tid-lyric";
    const c = assembleRecommendationCandidate({
      trackId: tid,
      catalogue: {
        canonical_title: "T",
        canonical_artist: "A",
        canonical_album: null,
        spotify_id: null,
        spotify_uri: null,
        isrc: null,
      },
      crates: [],
      enrichmentRows: [
        {
          track_id: tid,
          field_name: ENRICHMENT_FIELD.LYRIC_KEYWORDS,
          source: ENRICHMENT_SOURCE.GEMINI,
          field_value: { keywords: ["Dark Vibe"] },
          confidence: null,
        },
      ],
    });
    expect(c.intel.lyricKeywords.value).toEqual(["Dark Vibe"]);
    expect(c.semantics.lyricKeywords).toEqual(["dark vibe"]);
  });

  it("handles empty enrichment rows", () => {
    const tid = "tid-empty";
    const c = assembleRecommendationCandidate({
      trackId: tid,
      catalogue: {
        canonical_title: "T",
        canonical_artist: "A",
        canonical_album: null,
        spotify_id: null,
        spotify_uri: null,
        isrc: null,
      },
      crates: [],
      enrichmentRows: [],
    });
    expect(c.semantics.all).toEqual([]);
    expect(c.intel.bpm.value).toBeNull();
  });

  it("includes merged intel and normalized semantics", () => {
    const tid = "tid-1";
    const c = assembleRecommendationCandidate({
      trackId: tid,
      catalogue: {
        canonical_title: "Title",
        canonical_artist: "Artist",
        canonical_album: "Album",
        spotify_id: "spot123",
        spotify_uri: "spotify:track:spot123",
        isrc: "USXXX",
      },
      crates: [{ crateId: "c1", crateName: "Main" }],
      enrichmentRows: [moodRow(tid)],
    });

    expect(c.title).toBe("Title");
    expect(c.artist).toBe("Artist");
    expect(c.album).toBe("Album");
    expect(c.spotifyId).toBe("spot123");
    expect(c.isrc).toBe("USXXX");
    expect(c.albumArtUrl).toBeNull();
    expect(c.crates).toEqual([{ crateId: "c1", crateName: "Main" }]);
    expect(c.intel.trackId).toBe(tid);
    expect(c.intel.moodTags.value).toEqual(["moody"]);
    expect(c.semantics.moodTags).toContain("dark");
  });
});

describe("DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX", () => {
  it("is documented cap under 1000", () => {
    expect(DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX).toBe(800);
    expect(DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX).toBeLessThanOrEqual(1000);
  });
});
