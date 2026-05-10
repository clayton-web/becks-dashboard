import { describe, expect, it } from "vitest";

import {
  normalizeBreakdownSnapshot,
  normalizeFactsSnapshot,
} from "@/lib/recommendations/saved-transition-snapshot";

describe("normalizeFactsSnapshot", () => {
  it("fills defaults for garbage input", () => {
    expect(normalizeFactsSnapshot(null)).toEqual({
      bpmDelta: null,
      camelotDistance: null,
      energyDelta: null,
      sharedSemanticTags: [],
      moodShift: null,
    });
  });

  it("parses partial objects", () => {
    expect(
      normalizeFactsSnapshot({
        bpmDelta: 3,
        sharedSemanticTags: ["x", 1, "y"],
        moodShift: "  warm  ",
      } as never),
    ).toEqual({
      bpmDelta: 3,
      camelotDistance: null,
      energyDelta: null,
      sharedSemanticTags: ["x", "y"],
      moodShift: "warm",
    });
  });
});

describe("normalizeBreakdownSnapshot", () => {
  it("drops non-numeric entries", () => {
    expect(normalizeBreakdownSnapshot({ a: 1, b: "nope" } as never)).toEqual({
      a: 1,
    });
  });
});
