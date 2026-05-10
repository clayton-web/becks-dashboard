import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";
import {
  formatBpmDelta,
  formatCamelotSteps,
  formatEnergyDelta,
  formatSemanticShiftLine,
  sanitizeBoardText,
} from "@/lib/recommendations/board-display";
import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";

export type SavedTransitionExportRow = {
  directionLabel: string;
  referenceTitle: string;
  referenceArtist: string;
  candidateTitle: string;
  candidateArtist: string;
  score: number;
  rank: number;
  explanation: string;
  facts: DirectionScoreFacts;
  rulesVersion: string;
  savedAtIso: string;
  runId: string;
  userNote: string | null;
};

export function savedListItemToExportRow(item: SavedTransitionListItem): SavedTransitionExportRow {
  return {
    directionLabel: item.directionLabel,
    referenceTitle: item.referenceDisplay.title,
    referenceArtist: item.referenceDisplay.artist,
    candidateTitle: item.candidateDisplay.title,
    candidateArtist: item.candidateDisplay.artist,
    score: item.score,
    rank: item.rankAtSave,
    explanation: item.explanation,
    facts: item.factsSnapshot,
    rulesVersion: item.rulesVersionAtSave,
    savedAtIso: item.createdAt,
    runId: item.analysisRunId,
    userNote: item.userNote,
  };
}

export function escapeCsvField(value: string): string {
  const v = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function formatSavedTransitionPlainText(row: SavedTransitionExportRow): string {
  const exp = sanitizeBoardText(row.explanation);
  const note = row.userNote?.trim();
  const lines = [
    `Direction: ${row.directionLabel}`,
    `Reference: ${row.referenceTitle} — ${row.referenceArtist}`,
    `Candidate: ${row.candidateTitle} — ${row.candidateArtist}`,
    `Score: ${row.score} · Rank #${row.rank}`,
    `Rules (at save): ${row.rulesVersion}`,
    `Saved: ${row.savedAtIso}`,
    `Run: ${row.runId}`,
    `BPM Δ ${formatBpmDelta(row.facts.bpmDelta)} · Key ${formatCamelotSteps(row.facts.camelotDistance)} · Energy Δ ${formatEnergyDelta(row.facts.energyDelta)}`,
    `Shift: ${formatSemanticShiftLine(row.facts)}`,
    "",
    exp ? `Explanation:\n${exp}` : "Explanation: —",
  ];
  if (note) {
    lines.push("", `Note:\n${note}`);
  }
  return lines.join("\n");
}

export function formatSavedTransitionsPlainText(rows: readonly SavedTransitionExportRow[]): string {
  if (rows.length === 0) return "";
  return rows.map((r, i) => `--- ${i + 1} / ${rows.length} ---\n${formatSavedTransitionPlainText(r)}`).join("\n\n");
}

const CSV_HEADER = [
  "direction",
  "reference_title",
  "reference_artist",
  "candidate_title",
  "candidate_artist",
  "score",
  "rank",
  "rules_version_at_save",
  "saved_at",
  "analysis_run_id",
  "bpm_delta",
  "camelot_steps",
  "energy_delta",
  "semantic_shift",
  "explanation",
  "user_note",
] as const;

export function formatSavedTransitionsCsv(rows: readonly SavedTransitionExportRow[]): string {
  const lines: string[] = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.directionLabel),
        escapeCsvField(row.referenceTitle),
        escapeCsvField(row.referenceArtist),
        escapeCsvField(row.candidateTitle),
        escapeCsvField(row.candidateArtist),
        escapeCsvField(String(row.score)),
        escapeCsvField(String(row.rank)),
        escapeCsvField(row.rulesVersion),
        escapeCsvField(row.savedAtIso),
        escapeCsvField(row.runId),
        escapeCsvField(formatBpmDelta(row.facts.bpmDelta)),
        escapeCsvField(formatCamelotSteps(row.facts.camelotDistance)),
        escapeCsvField(formatEnergyDelta(row.facts.energyDelta)),
        escapeCsvField(formatSemanticShiftLine(row.facts)),
        escapeCsvField(sanitizeBoardText(row.explanation)),
        escapeCsvField(row.userNote?.trim() ?? ""),
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
