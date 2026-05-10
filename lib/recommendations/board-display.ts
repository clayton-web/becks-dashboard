import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";

export function formatBpmDelta(delta: number | null): string {
  if (delta == null || Number.isNaN(delta)) return "—";
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} BPM`;
}

export function formatEnergyDelta(delta: number | null): string {
  if (delta == null || Number.isNaN(delta)) return "—";
  const rounded = Math.round(delta * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

export function formatCamelotSteps(distance: number | null): string {
  if (distance == null || Number.isNaN(distance)) return "—";
  if (distance === 0) return "Same wheel";
  const n = Math.round(distance);
  return `${n} Camelot step${n === 1 ? "" : "s"}`;
}

/** Strip control characters; keeps explanation readable without injecting markup. */
export function sanitizeBoardText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

export function formatSemanticShiftLine(facts: DirectionScoreFacts): string {
  const mood = facts.moodShift?.trim();
  if (mood) return mood;
  const shared = facts.sharedSemanticTags;
  if (shared.length === 0) return "—";
  const slice = shared.slice(0, 5);
  const extra = shared.length > slice.length ? "…" : "";
  return `Overlap: ${slice.join(", ")}${extra}`;
}
