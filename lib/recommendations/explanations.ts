import type { RecommendationDirectionId } from "@/lib/recommendations/directions";

import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";

function bpmClause(delta: number | null): string {
  if (delta === null) return "tempo unknown vs reference";
  const rounded = Math.round(delta);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} BPM vs reference`;
}

function camelotClause(dist: number | null): string {
  if (dist === null) return "Camelot spacing unknown";
  if (dist === 0) return "same Camelot position";
  if (dist === 1) return "tight Camelot step";
  if (dist <= 3) return "compatible Camelot move";
  return "wider Camelot spacing";
}

function energyClause(delta: number | null): string {
  if (delta === null) return "energy unknown vs reference";
  const ad = Math.abs(delta);
  if (ad < 0.05) return "similar energy";
  if (delta > 0) return "energy higher than reference";
  return "energy lower than reference";
}

function sharedTagsClause(tags: readonly string[]): string {
  if (tags.length === 0) return "no overlapping semantic tags detected";
  const preview = tags.slice(0, 3).join(", ");
  const more = tags.length > 3 ? ` (+${tags.length - 3} more)` : "";
  return `shared tags: ${preview}${more}`;
}

/**
 * Deterministic copy derived only from measurable facts — never implies unavailable data exists.
 */
export function buildDirectionExplanation(
  directionId: RecommendationDirectionId,
  facts: DirectionScoreFacts,
): string {
  const pieces: string[] = [];

  switch (directionId) {
    case "stay_similar":
      pieces.push(bpmClause(facts.bpmDelta));
      pieces.push(camelotClause(facts.camelotDistance));
      pieces.push(energyClause(facts.energyDelta));
      pieces.push(sharedTagsClause(facts.sharedSemanticTags));
      break;
    case "bpm_safe":
      pieces.push(`mix-safe tempo focus — ${bpmClause(facts.bpmDelta)}`);
      pieces.push(camelotClause(facts.camelotDistance));
      break;
    case "harmonic_match":
      pieces.push(`harmonic-led — ${camelotClause(facts.camelotDistance)}`);
      pieces.push(bpmClause(facts.bpmDelta));
      pieces.push(energyClause(facts.energyDelta));
      break;
    case "lift_energy":
      pieces.push(energyClause(facts.energyDelta));
      pieces.push(bpmClause(facts.bpmDelta));
      pieces.push(camelotClause(facts.camelotDistance));
      break;
    case "drop_energy":
      pieces.push(energyClause(facts.energyDelta));
      pieces.push(bpmClause(facts.bpmDelta));
      pieces.push(camelotClause(facts.camelotDistance));
      break;
    case "go_darker":
      pieces.push(
        facts.moodShift === "darker"
          ? "darker semantic tone vs reference"
          : facts.moodShift === "brighter"
            ? "lighter semantic tone (weak darker pivot)"
            : "muted semantic dark/bright contrast",
      );
      pieces.push(sharedTagsClause(facts.sharedSemanticTags));
      pieces.push(camelotClause(facts.camelotDistance));
      pieces.push(bpmClause(facts.bpmDelta));
      break;
    case "go_brighter":
      pieces.push(
        facts.moodShift === "brighter"
          ? "brighter semantic tone vs reference"
          : facts.moodShift === "darker"
            ? "darker semantic tone (weak brighter pivot)"
            : "muted semantic bright/dark contrast",
      );
      pieces.push(sharedTagsClause(facts.sharedSemanticTags));
      pieces.push(camelotClause(facts.camelotDistance));
      pieces.push(bpmClause(facts.bpmDelta));
      break;
    case "genre_bridge":
      pieces.push(
        "genre bridge stance — blend relies on catalogue genre tags when present",
      );
      pieces.push(sharedTagsClause(facts.sharedSemanticTags));
      pieces.push(bpmClause(facts.bpmDelta));
      break;
    case "lyric_wordplay":
      pieces.push(sharedTagsClause(facts.sharedSemanticTags));
      if (facts.sharedSemanticTags.length === 0) {
        pieces.push("lyric overlap judged from keyword buckets only");
      }
      pieces.push(bpmClause(facts.bpmDelta));
      break;
    case "reset_room":
      pieces.push(
        "palette reset — tolerates larger tempo/harmonic moves while staying structured",
      );
      pieces.push(bpmClause(facts.bpmDelta));
      pieces.push(camelotClause(facts.camelotDistance));
      pieces.push(energyClause(facts.energyDelta));
      break;
  }

  return pieces
    .map((p) => (p.endsWith(".") ? p.slice(0, -1) : p))
    .join("; ")
    .concat(".");
}
