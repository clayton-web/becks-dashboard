import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";
import type { Json } from "@/types/supabase";

export function normalizeFactsSnapshot(raw: Json): DirectionScoreFacts {
  const empty: DirectionScoreFacts = {
    bpmDelta: null,
    camelotDistance: null,
    energyDelta: null,
    sharedSemanticTags: [],
    moodShift: null,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  const numOrNull = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const moodShift =
    typeof o.moodShift === "string" ? (o.moodShift.trim() || null) : null;
  const tags = Array.isArray(o.sharedSemanticTags)
    ? o.sharedSemanticTags.filter((x): x is string => typeof x === "string")
    : [];
  return {
    bpmDelta: numOrNull(o.bpmDelta),
    camelotDistance: numOrNull(o.camelotDistance),
    energyDelta: numOrNull(o.energyDelta),
    sharedSemanticTags: tags,
    moodShift,
  };
}

export function normalizeBreakdownSnapshot(raw: Json): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}
