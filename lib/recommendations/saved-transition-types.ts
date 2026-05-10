import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";

export type SavedTransitionListItem = {
  id: string;
  createdAt: string;
  analysisRunId: string;
  directionId: string;
  directionLabel: string;
  referenceTrackId: string | null;
  candidateTrackId: string;
  score: number;
  rankAtSave: number;
  explanation: string;
  factsSnapshot: DirectionScoreFacts;
  scoreBreakdownSnapshot: Record<string, number>;
  rulesVersionAtSave: string;
  userNote: string | null;
  referenceDisplay: {
    title: string;
    artist: string;
    missingFromCatalogue: boolean;
  };
  candidateDisplay: {
    title: string;
    artist: string;
    missingFromCatalogue: boolean;
  };
};
