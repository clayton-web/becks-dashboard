import { describe, expect, it } from "vitest";

import {
  isPostgresUniqueViolation,
  savedTransitionCompositeKey,
} from "@/lib/recommendations/saved-transition-keys";

describe("savedTransitionCompositeKey", () => {
  it("is stable per direction + candidate", () => {
    expect(savedTransitionCompositeKey("lift_energy", "uuid-a")).toBe("lift_energy:uuid-a");
  });

  it("trims whitespace", () => {
    expect(savedTransitionCompositeKey("  stay_similar ", "  t ")).toBe("stay_similar:t");
  });
});

describe("isPostgresUniqueViolation", () => {
  it("detects unique violations", () => {
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
  });
});
