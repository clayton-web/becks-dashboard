import { describe, expect, it } from "vitest";

import {
  camelotDistance,
  parseCamelotCode,
  spotifyKeyModeToCamelot,
  spotifyKeyModeToLabel,
} from "@/lib/music/key-camelot";

describe("spotifyKeyModeToLabel", () => {
  it("maps C major", () => {
    expect(spotifyKeyModeToLabel(0, 1)).toBe("C major");
  });

  it("maps A minor", () => {
    expect(spotifyKeyModeToLabel(9, 0)).toBe("A minor");
  });

  it("returns null for unknown Spotify key", () => {
    expect(spotifyKeyModeToLabel(-1, 1)).toBeNull();
  });
});

describe("spotifyKeyModeToCamelot", () => {
  it("maps C major to 8B", () => {
    expect(spotifyKeyModeToCamelot(0, 1)).toBe("8B");
  });

  it("maps A minor to 8A", () => {
    expect(spotifyKeyModeToCamelot(9, 0)).toBe("8A");
  });

  it("returns null when key unknown", () => {
    expect(spotifyKeyModeToCamelot(-1, 1)).toBeNull();
  });
});

describe("parseCamelotCode", () => {
  it("parses lowercase", () => {
    expect(parseCamelotCode("12b")).toEqual({ num: 12, letter: "B" });
  });
});

describe("camelotDistance", () => {
  it("adjacent same-letter codes", () => {
    expect(camelotDistance("8B", "9B")).toBe(1);
  });

  it("parallel major/minor same number", () => {
    expect(camelotDistance("8B", "8A")).toBe(0);
  });

  it("same-letter separation", () => {
    expect(camelotDistance("8B", "10B")).toBe(2);
  });

  it("returns null for garbage input", () => {
    expect(camelotDistance("8B", "nope")).toBeNull();
  });
});
