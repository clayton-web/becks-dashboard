import { describe, expect, it } from "vitest";

import type { TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import {
  CANONICAL_SEMANTIC_TAG_SET,
  SEMANTIC_SYNONYM_TO_CANONICAL,
} from "@/lib/semantic/taxonomy";
import {
  buildNormalizedSemanticSignals,
  normalizeLyricKeywords,
  normalizeMoodTags,
  normalizeSemanticLabel,
  normalizeSemanticRaw,
  normalizeSemanticTags,
  normalizeThemes,
} from "@/lib/semantic/normalize";
import { normalizedSemanticSignalsFromSnapshot } from "@/lib/semantic/signals";

describe("normalizeSemanticRaw / normalizeSemanticLabel", () => {
  it("trims and lowercases", () => {
    expect(normalizeSemanticRaw("  Dark ")).toBe("dark");
    expect(normalizeSemanticLabel("  Chill ", "tag")).toBe("chill");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeSemanticRaw("dark   vibe")).toBe("dark vibe");
  });

  it("maps synonyms for tag kind", () => {
    expect(normalizeSemanticLabel("moody", "tag")).toBe("dark");
    expect(normalizeSemanticLabel("dark vibe", "tag")).toBe("dark");
    expect(normalizeSemanticLabel("night drive", "tag")).toBe("late-night");
  });

  it("does not remap lyric keywords (preserve wordplay-friendly tokens)", () => {
    expect(normalizeSemanticLabel("dark vibe", "lyric_keyword")).toBe("dark vibe");
    expect(normalizeSemanticLabel("moody", "lyric_keyword")).toBe("moody");
  });

  it("passes through unknown terms normalized", () => {
    expect(normalizeSemanticLabel("Neon Cathedral", "tag")).toBe("neon cathedral");
  });

  it("handles empty and non-string safely", () => {
    expect(normalizeSemanticLabel("", "tag")).toBe("");
    expect(normalizeSemanticLabel("   ", "tag")).toBe("");
    // @ts-expect-error intentional malformed caller
    expect(normalizeSemanticLabel(null, "tag")).toBe("");
  });
});

describe("normalizeMoodTags / normalizeThemes / normalizeSemanticTags", () => {
  it("dedupes after canonical mapping", () => {
    expect(normalizeMoodTags(["dark", "moody", "brooding"])).toEqual(["dark"]);
  });

  it("dedupes case variants", () => {
    expect(normalizeThemes(["Chill", "chill", " CHILL "])).toEqual(["chill"]);
  });

  it("filters non-strings", () => {
    expect(
      normalizeSemanticTags(["bright", null, "bright", 123, "neon"] as unknown as string[]),
    ).toEqual(["bright", "neon"]);
  });
});

describe("normalizeLyricKeywords", () => {
  it("only trims lowercases and dedupes", () => {
    expect(normalizeLyricKeywords(["  Rain ", "rain", "MIDNIGHT"])).toEqual([
      "rain",
      "midnight",
    ]);
  });

  it("does not fold lyric phrases into mood synonyms", () => {
    expect(normalizeLyricKeywords(["dark vibe", "shadowy"])).toEqual(["dark vibe", "shadowy"]);
  });
});

describe("buildNormalizedSemanticSignals", () => {
  it("builds all with global dedupe in bucket order", () => {
    const s = buildNormalizedSemanticSignals({
      moodTags: ["dark", "moody"],
      themes: ["summer", "dark"],
      lyricKeywords: ["rain"],
      semanticTags: ["rain", "playful"],
    });
    expect(s.moodTags).toEqual(["dark"]);
    expect(s.themes).toEqual(["summer", "dark"]);
    expect(s.lyricKeywords).toEqual(["rain"]);
    expect(s.semanticTags).toEqual(["rain", "playful"]);
    expect(s.all).toEqual(["dark", "summer", "rain", "playful"]);
  });

  it("handles nullish and malformed containers", () => {
    const s = buildNormalizedSemanticSignals({
      moodTags: undefined,
      themes: null,
      lyricKeywords: [],
      semanticTags: [],
    });
    expect(s).toEqual({
      moodTags: [],
      themes: [],
      lyricKeywords: [],
      semanticTags: [],
      all: [],
    });
  });
});

describe("normalizedSemanticSignalsFromSnapshot", () => {
  it("reads ResolvedTags.value arrays", () => {
    const snapshot: TrackIntelSnapshot = {
      trackId: "t1",
      bpm: { value: null, provenance: null },
      key: { value: null, provenance: null },
      camelot: { value: null, provenance: null },
      energy: { value: null, provenance: null },
      danceability: { value: null, provenance: null },
      valence: { value: null, provenance: null },
      loudness: { value: null, provenance: null },
      moodTags: { value: ["moody"], provenance: null },
      genreTags: { value: [], provenance: null },
      themes: { value: ["Beach Vibes"], provenance: null },
      lyricKeywords: { value: ["Dark Vibe"], provenance: null },
      lyricsPlain: { value: null, provenance: null },
      semanticTags: { value: ["happy"], provenance: null },
    };

    const n = normalizedSemanticSignalsFromSnapshot(snapshot);
    expect(n.moodTags).toEqual(["dark"]);
    expect(n.themes).toEqual(["summer"]);
    expect(n.lyricKeywords).toEqual(["dark vibe"]);
    expect(n.semanticTags).toEqual(["bright"]);
    expect(n.all).toEqual(["dark", "summer", "dark vibe", "bright"]);
  });
});

describe("taxonomy integrity", () => {
  it("every synonym maps to a declared canonical tag", () => {
    for (const [key, canonical] of Object.entries(SEMANTIC_SYNONYM_TO_CANONICAL)) {
      expect(key).toBe(normalizeSemanticRaw(key));
      expect(CANONICAL_SEMANTIC_TAG_SET.has(canonical)).toBe(true);
    }
  });
});
