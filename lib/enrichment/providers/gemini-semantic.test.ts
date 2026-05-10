import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import {
  excerptLyricsPlain,
  geminiSemanticValidatedToUpserts,
  mergeGeminiSemanticProbeRows,
  parseGeminiSemanticJson,
  shouldSkipGeminiSemanticCall,
} from "@/lib/enrichment/providers/gemini-semantic";
describe("parseGeminiSemanticJson", () => {
  it("parses valid payload", () => {
    const r = parseGeminiSemanticJson(
      JSON.stringify({
        moodTags: [" melancholic ", "hopeful"],
        themes: ["loss"],
        lyricKeywords: ["rain", "midnight"],
        semanticTags: ["indie"],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.moodTags).toEqual(["melancholic", "hopeful"]);
    expect(r.value.themes).toEqual(["loss"]);
    expect(r.value.lyricKeywords).toEqual(["rain", "midnight"]);
    expect(r.value.semanticTags).toEqual(["indie"]);
  });

  it("trims array lengths", () => {
    const moodTags = Array.from({ length: 12 }, (_, i) => `m${i}`);
    const r = parseGeminiSemanticJson(
      JSON.stringify({
        moodTags,
        themes: [],
        lyricKeywords: [],
        semanticTags: [],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.moodTags.length).toBe(5);
  });

  it("rejects malformed JSON", () => {
    expect(parseGeminiSemanticJson("{").ok).toBe(false);
  });

  it("rejects unexpected keys", () => {
    const r = parseGeminiSemanticJson(
      JSON.stringify({
        moodTags: [],
        themes: [],
        lyricKeywords: [],
        semanticTags: [],
        extra: [],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects deterministic-style keys even when semantic arrays exist", () => {
    const r = parseGeminiSemanticJson(
      JSON.stringify({
        moodTags: ["calm"],
        themes: [],
        lyricKeywords: [],
        semanticTags: [],
        bpm: 128,
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("forbidden_field");
  });
});

describe("geminiSemanticValidatedToUpserts", () => {
  it("maps to gemini tag payloads", () => {
    const upserts = geminiSemanticValidatedToUpserts(
      "tid",
      {
        moodTags: ["x"],
        themes: ["y"],
        lyricKeywords: ["z"],
        semanticTags: ["w"],
      },
      "hash",
    );
    expect(upserts).toHaveLength(4);
    expect(upserts.every((u) => u.source === ENRICHMENT_SOURCE.GEMINI)).toBe(true);
    const moods = upserts.find((u) => u.fieldName === ENRICHMENT_FIELD.MOOD_TAGS);
    expect(moods?.fieldValue).toEqual({ tags: ["x"] });
    const themes = upserts.find((u) => u.fieldName === ENRICHMENT_FIELD.THEMES);
    expect(themes?.fieldValue).toEqual({ themes: ["y"] });
    const kw = upserts.find((u) => u.fieldName === ENRICHMENT_FIELD.LYRIC_KEYWORDS);
    expect(kw?.fieldValue).toEqual({ keywords: ["z"] });
    const sem = upserts.find((u) => u.fieldName === ENRICHMENT_FIELD.SEMANTIC_TAGS);
    expect(sem?.fieldValue).toEqual({ tags: ["w"] });
    expect(moods?.sourcePayload).toEqual({ input_hash: "hash" });
  });
});

describe("mergeGeminiSemanticProbeRows / shouldSkipGeminiSemanticCall", () => {
  const baseProbeRows = [
    {
      track_id: "t1",
      field_name: ENRICHMENT_FIELD.MOOD_TAGS,
      source_payload: { input_hash: "aaa" },
    },
    {
      track_id: "t1",
      field_name: ENRICHMENT_FIELD.THEMES,
      source_payload: { input_hash: "aaa" },
    },
    {
      track_id: "t1",
      field_name: ENRICHMENT_FIELD.LYRIC_KEYWORDS,
      source_payload: { input_hash: "aaa" },
    },
    {
      track_id: "t1",
      field_name: ENRICHMENT_FIELD.SEMANTIC_TAGS,
      source_payload: { input_hash: "aaa" },
    },
  ];

  it("skips when hash matches and not forcing", () => {
    const map = mergeGeminiSemanticProbeRows(baseProbeRows);
    expect(
      shouldSkipGeminiSemanticCall({
        force: false,
        probe: map.get("t1"),
        computedHash: "aaa",
      }),
    ).toBe(true);
  });

  it("does not skip when hash mismatches", () => {
    const map = mergeGeminiSemanticProbeRows(baseProbeRows);
    expect(
      shouldSkipGeminiSemanticCall({
        force: false,
        probe: map.get("t1"),
        computedHash: "bbb",
      }),
    ).toBe(false);
  });

  it("does not skip when forcing", () => {
    const map = mergeGeminiSemanticProbeRows(baseProbeRows);
    expect(
      shouldSkipGeminiSemanticCall({
        force: true,
        probe: map.get("t1"),
        computedHash: "aaa",
      }),
    ).toBe(false);
  });

  it("skips legacy rows without hash when complete", () => {
    const rows = baseProbeRows.map((r) =>
      r.field_name === ENRICHMENT_FIELD.MOOD_TAGS
        ? { ...r, source_payload: {} }
        : r,
    );
    const map = mergeGeminiSemanticProbeRows(rows);
    expect(
      shouldSkipGeminiSemanticCall({
        force: false,
        probe: map.get("t1"),
        computedHash: "anything",
      }),
    ).toBe(true);
  });
});

describe("excerptLyricsPlain", () => {
  it("returns null for empty", () => {
    expect(excerptLyricsPlain(null)).toBeNull();
    expect(excerptLyricsPlain("   \n")).toBeNull();
  });
});
