import { describe, expect, it } from "vitest";

import { partitionTrackIdsByMembership } from "@/lib/data/track-ownership-utils";

describe("partitionTrackIdsByMembership", () => {
  it("keeps request order within owned subset", () => {
    const owned = new Set(["c", "a"]);
    expect(partitionTrackIdsByMembership(["c", "b", "a"], owned)).toEqual({
      ownedTrackIds: ["c", "a"],
      rejectedTrackIds: ["b"],
    });
  });

  it("rejects all when membership empty", () => {
    expect(partitionTrackIdsByMembership(["x", "y"], new Set())).toEqual({
      ownedTrackIds: [],
      rejectedTrackIds: ["x", "y"],
    });
  });

  it("accepts all when full membership", () => {
    expect(partitionTrackIdsByMembership(["x"], new Set(["x"]))).toEqual({
      ownedTrackIds: ["x"],
      rejectedTrackIds: [],
    });
  });
});
