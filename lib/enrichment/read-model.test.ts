import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import {
  mergeEnrichmentRowsToSnapshot,
  type EnrichmentValueRow,
} from "@/lib/enrichment/read-model";

const TRACK = "00000000-0000-4000-8000-0000000000aa";

function row(
  field_name: string,
  source: string,
  field_value: Record<string, unknown>,
  confidence: number | null = null,
): EnrichmentValueRow {
  return {
    track_id: TRACK,
    field_name,
    source,
    field_value,
    confidence,
  };
}

describe("mergeEnrichmentRowsToSnapshot", () => {
  it("prefers Spotify BPM over Gemini", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.GEMINI, { value: 999 }),
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 120 }),
    ]);
    expect(snap.bpm.value).toBe(120);
    expect(snap.bpm.provenance?.source).toBe(ENRICHMENT_SOURCE.SPOTIFY);
  });

  it("ignores Gemini-only BPM", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.GEMINI, { value: 130 }),
    ]);
    expect(snap.bpm.value).toBeNull();
    expect(snap.bpm.provenance).toBeNull();
  });

  it("prefers internal genre tags over Gemini", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.GENRE_TAGS, ENRICHMENT_SOURCE.GEMINI, {
        tags: ["ai-genre"],
      }),
      row(ENRICHMENT_FIELD.GENRE_TAGS, ENRICHMENT_SOURCE.INTERNAL, {
        tags: ["house"],
      }),
    ]);
    expect(snap.genreTags.value).toEqual(["house"]);
    expect(snap.genreTags.provenance?.source).toBe(ENRICHMENT_SOURCE.INTERNAL);
  });

  it("falls back to Gemini moods when internal empty", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.MOOD_TAGS, ENRICHMENT_SOURCE.INTERNAL, {
        tags: [],
      }),
      row(ENRICHMENT_FIELD.MOOD_TAGS, ENRICHMENT_SOURCE.GEMINI, {
        tags: ["euphoric"],
      }),
    ]);
    expect(snap.moodTags.value).toEqual(["euphoric"]);
    expect(snap.moodTags.provenance?.source).toBe(ENRICHMENT_SOURCE.GEMINI);
  });

  it("prefers Gemini moods when both non-empty", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.MOOD_TAGS, ENRICHMENT_SOURCE.INTERNAL, {
        tags: ["calm"],
      }),
      row(ENRICHMENT_FIELD.MOOD_TAGS, ENRICHMENT_SOURCE.GEMINI, {
        tags: ["hype"],
      }),
    ]);
    expect(snap.moodTags.value).toEqual(["hype"]);
    expect(snap.moodTags.provenance?.source).toBe(ENRICHMENT_SOURCE.GEMINI);
  });

  it("uses LRCLIB for lyrics only", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.LYRICS_PLAIN, ENRICHMENT_SOURCE.GEMINI, {
        text: "should not win",
      }),
      row(ENRICHMENT_FIELD.LYRICS_PLAIN, ENRICHMENT_SOURCE.LRCLIB, {
        text: "official lyrics",
      }),
    ]);
    expect(snap.lyricsPlain.value).toBe("official lyrics");
    expect(snap.lyricsPlain.provenance?.source).toBe(ENRICHMENT_SOURCE.LRCLIB);
  });

  it("scopes rows to track id", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      {
        ...row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 90 }),
        track_id: "other-track-id",
      },
    ]);
    expect(snap.bpm.value).toBeNull();
  });

  it("drops unknown field names", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row("legacy_unknown_field", ENRICHMENT_SOURCE.SPOTIFY, { value: 1 }),
    ]);
    expect(snap.bpm.value).toBeNull();
  });

  it("parses themes payload shape", () => {
    const snap = mergeEnrichmentRowsToSnapshot(TRACK, [
      row(ENRICHMENT_FIELD.THEMES, ENRICHMENT_SOURCE.GEMINI, {
        themes: ["night drive", "rain"],
      }),
    ]);
    expect(snap.themes.value).toEqual(["night drive", "rain"]);
  });
});
