import { describe, expect, it } from "vitest";

import {
  RECOMMENDATION_DIRECTION,
  RECOMMENDATION_DIRECTION_IDS,
  RECOMMENDATION_DIRECTION_ORDER,
} from "@/lib/recommendations/directions";

describe("recommendation directions", () => {
  it("exports exactly 10 ordered ids", () => {
    expect(RECOMMENDATION_DIRECTION_ORDER).toHaveLength(10);
    expect(RECOMMENDATION_DIRECTION_IDS).toHaveLength(10);
  });

  it("keeps ids unique", () => {
    expect(new Set(RECOMMENDATION_DIRECTION_IDS).size).toBe(10);
  });

  it("matches locked slug set", () => {
    expect(new Set(RECOMMENDATION_DIRECTION_IDS)).toEqual(
      new Set([
        RECOMMENDATION_DIRECTION.STAY_SIMILAR,
        RECOMMENDATION_DIRECTION.BPM_SAFE,
        RECOMMENDATION_DIRECTION.HARMONIC_MATCH,
        RECOMMENDATION_DIRECTION.LIFT_ENERGY,
        RECOMMENDATION_DIRECTION.DROP_ENERGY,
        RECOMMENDATION_DIRECTION.GO_DARKER,
        RECOMMENDATION_DIRECTION.GO_BRIGHTER,
        RECOMMENDATION_DIRECTION.GENRE_BRIDGE,
        RECOMMENDATION_DIRECTION.LYRIC_WORDPLAY,
        RECOMMENDATION_DIRECTION.RESET_ROOM,
      ]),
    );
  });

  it("order array aligns with object values", () => {
    const fromOrder = new Set(RECOMMENDATION_DIRECTION_ORDER.map((d) => d.id));
    const fromConst = new Set(Object.values(RECOMMENDATION_DIRECTION));
    expect(fromOrder).toEqual(fromConst);
  });
});
