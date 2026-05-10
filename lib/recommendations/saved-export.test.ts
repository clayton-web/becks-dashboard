import { describe, expect, it } from "vitest";

import {
  escapeCsvField,
  formatSavedTransitionPlainText,
  formatSavedTransitionsCsv,
  formatSavedTransitionsPlainText,
  savedListItemToExportRow,
  type SavedTransitionExportRow,
} from "@/lib/recommendations/saved-export";
import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";

const sampleFacts = {
  bpmDelta: -2,
  camelotDistance: 1 as number | null,
  energyDelta: 0.05,
  sharedSemanticTags: ["dark"],
  moodShift: null as string | null,
};

const baseRow: SavedTransitionExportRow = {
  directionLabel: "Lift Energy",
  referenceTitle: "Ref Track",
  referenceArtist: "Ref Artist",
  candidateTitle: "Next",
  candidateArtist: "DJ X",
  score: 82,
  rank: 2,
  explanation: "Solid lift without breaking harmonic lane.",
  facts: sampleFacts,
  rulesVersion: "phase9.v1",
  savedAtIso: "2026-05-10T12:00:00.000Z",
  runId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  userNote: null,
};

describe("savedListItemToExportRow", () => {
  it("maps list rows for export", () => {
    const item: SavedTransitionListItem = {
      id: "i1",
      createdAt: "2026-01-01T00:00:00.000Z",
      analysisRunId: "run-1",
      directionId: "lift_energy",
      directionLabel: "Lift Energy",
      referenceTrackId: null,
      candidateTrackId: "c1",
      score: 90,
      rankAtSave: 1,
      explanation: "Nice",
      factsSnapshot: sampleFacts,
      scoreBreakdownSnapshot: {},
      rulesVersionAtSave: "phase9.v1",
      userNote: null,
      referenceDisplay: { title: "—", artist: "", missingFromCatalogue: false },
      candidateDisplay: { title: "Next", artist: "A", missingFromCatalogue: false },
    };
    const row = savedListItemToExportRow(item);
    expect(row.runId).toBe("run-1");
    expect(row.directionLabel).toBe("Lift Energy");
    expect(row.facts.bpmDelta).toBe(-2);
  });
});

describe("escapeCsvField", () => {
  it("quotes commas and newlines", () => {
    expect(escapeCsvField("a,b")).toBe(`"a,b"`);
    expect(escapeCsvField(`line1\nline2`)).toBe(`"line1\nline2"`);
  });

  it("doubles internal quotes", () => {
    expect(escapeCsvField(`say "hello"`)).toBe(`"say ""hello"""`);
  });
});

describe("formatSavedTransitionPlainText", () => {
  it("includes facts and explanation", () => {
    const t = formatSavedTransitionPlainText(baseRow);
    expect(t).toContain("Lift Energy");
    expect(t).toContain("Solid lift");
    expect(t).toContain("BPM Δ");
    expect(t).toContain("phase9.v1");
  });

  it("includes optional note", () => {
    const t = formatSavedTransitionPlainText({
      ...baseRow,
      userNote: "Try after peak",
    });
    expect(t).toContain("Try after peak");
  });
});

describe("formatSavedTransitionsPlainText", () => {
  it("handles empty list", () => {
    expect(formatSavedTransitionsPlainText([])).toBe("");
  });

  it("numbers sections", () => {
    const t = formatSavedTransitionsPlainText([baseRow, { ...baseRow, rank: 3 }]);
    expect(t).toContain("1 / 2");
    expect(t).toContain("2 / 2");
  });
});

describe("formatSavedTransitionsCsv", () => {
  it("includes header row", () => {
    const csv = formatSavedTransitionsCsv([baseRow]);
    expect(csv.split("\r\n")[0]).toContain("direction");
    expect(csv).toContain("Lift Energy");
  });
});
