import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import { lrclibOutcomeToLyricsUpsertOrNull } from "@/lib/enrichment/providers/lrclib";

describe("lrclibOutcomeToLyricsUpsertOrNull", () => {
  it("maps lyrics hit", () => {
    const u = lrclibOutcomeToLyricsUpsertOrNull("tid", {
      ok: true,
      record: {
        id: 1,
        trackName: "x",
        artistName: "y",
        albumName: "z",
        duration: 100,
        instrumental: false,
        plainLyrics: " hi ",
      },
      plainLyricsTrimmed: "hi",
    });
    expect(u?.fieldName).toBe(ENRICHMENT_FIELD.LYRICS_PLAIN);
    expect(u?.source).toBe(ENRICHMENT_SOURCE.LRCLIB);
    expect(u?.fieldValue).toEqual({ text: "hi" });
  });

  it("writes tombstone on API not_found", () => {
    const u = lrclibOutcomeToLyricsUpsertOrNull("tid", {
      ok: false,
      reason: "not_found",
      status: 404,
    });
    expect(u?.fieldValue).toEqual({ text: null });
  });

  it("returns null on network failure", () => {
    expect(
      lrclibOutcomeToLyricsUpsertOrNull("tid", {
        ok: false,
        reason: "network",
        detail: "timeout",
      }),
    ).toBeNull();
  });

  it("tombstones instrumental hits", () => {
    const u = lrclibOutcomeToLyricsUpsertOrNull("tid", {
      ok: true,
      record: {
        id: 3,
        trackName: "x",
        artistName: "y",
        albumName: "z",
        duration: 100,
        instrumental: true,
        plainLyrics: null,
      },
      plainLyricsTrimmed: null,
    });
    expect(u?.fieldValue).toEqual({ text: null });
  });
});
