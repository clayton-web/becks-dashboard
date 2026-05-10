import { describe, expect, it } from "vitest";

import {
  parseLrclibSearchResults,
  parseLrclibTrackRecord,
  trimLyricsText,
} from "@/lib/lrclib/parse";

describe("parseLrclibTrackRecord", () => {
  it("parses LRCLIB success payload", () => {
    const rec = parseLrclibTrackRecord({
      id: 3396226,
      trackName: "I Want to Live",
      artistName: "Borislav Slavov",
      albumName: "BG3",
      duration: 233,
      instrumental: false,
      plainLyrics: "Hello\nWorld\n",
    });
    expect(rec?.id).toBe(3396226);
    expect(rec?.plainLyrics).toContain("Hello");
  });

  it("returns null for malformed payloads", () => {
    expect(parseLrclibTrackRecord({})).toBeNull();
    expect(parseLrclibTrackRecord(null)).toBeNull();
  });
});

describe("parseLrclibSearchResults", () => {
  it("filters invalid array entries", () => {
    const list = parseLrclibSearchResults([
      { id: 1, trackName: "a", artistName: "b", albumName: "c", duration: 1 },
      "bad",
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.trackName).toBe("a");
  });
});

describe("trimLyricsText", () => {
  it("trims and collapses empty", () => {
    expect(trimLyricsText("  x  ")).toBe("x");
    expect(trimLyricsText("   ")).toBeNull();
    expect(trimLyricsText(null)).toBeNull();
  });
});
