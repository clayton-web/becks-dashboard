import { describe, expect, it } from "vitest";

import {
  formatBpmDelta,
  formatCamelotSteps,
  formatEnergyDelta,
  formatSemanticShiftLine,
  sanitizeBoardText,
} from "@/lib/recommendations/board-display";

describe("formatBpmDelta", () => {
  it("formats signed deltas", () => {
    expect(formatBpmDelta(3.3)).toBe("+3.3 BPM");
    expect(formatBpmDelta(-2)).toBe("-2 BPM");
  });

  it("handles null", () => {
    expect(formatBpmDelta(null)).toBe("—");
  });
});

describe("formatEnergyDelta", () => {
  it("formats signed energy", () => {
    expect(formatEnergyDelta(0.07)).toBe("+0.07");
    expect(formatEnergyDelta(-0.12)).toBe("-0.12");
  });
});

describe("formatCamelotSteps", () => {
  it("labels same wheel and distances", () => {
    expect(formatCamelotSteps(0)).toBe("Same wheel");
    expect(formatCamelotSteps(1)).toBe("1 Camelot step");
    expect(formatCamelotSteps(2)).toBe("2 Camelot steps");
  });

  it("handles null", () => {
    expect(formatCamelotSteps(null)).toBe("—");
  });
});

describe("sanitizeBoardText", () => {
  it("removes NUL and trims", () => {
    expect(sanitizeBoardText("  hello\u0000world  ")).toBe("helloworld");
  });
});

describe("formatSemanticShiftLine", () => {
  it("prefers mood shift", () => {
    expect(
      formatSemanticShiftLine({
        bpmDelta: null,
        camelotDistance: null,
        energyDelta: null,
        sharedSemanticTags: [],
        moodShift: "warmer",
      }),
    ).toBe("warmer");
  });

  it("falls back to overlap chips", () => {
    expect(
      formatSemanticShiftLine({
        bpmDelta: null,
        camelotDistance: null,
        energyDelta: null,
        sharedSemanticTags: ["a", "b", "c", "d", "e", "f"],
        moodShift: null,
      }),
    ).toBe("Overlap: a, b, c, d, e…");
  });

  it("handles empty facts", () => {
    expect(
      formatSemanticShiftLine({
        bpmDelta: null,
        camelotDistance: null,
        energyDelta: null,
        sharedSemanticTags: [],
        moodShift: null,
      }),
    ).toBe("—");
  });
});
