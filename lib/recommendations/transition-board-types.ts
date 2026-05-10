import type { TransitionAnalysisInputSnapshotV1 } from "@/lib/recommendations/analysis-serialization";
import type { RecommendationDirectionId } from "@/lib/recommendations/directions";
import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";

export type LoadedTransitionBoardTrackInfo = {
  trackId: string;
  title: string;
  artist: string;
  album: string | null;
  spotifyId: string | null;
  missingFromCatalogue: boolean;
};

/** Flat intel for the reference panel (merged enrichment at load time). */
export type LoadedTransitionBoardReferenceIntel = {
  bpm: number | null;
  key: string | null;
  camelot: string | null;
  energy: number | null;
  moodTags: string[];
  semanticTags: string[];
  themes: string[];
};

export type LoadedTransitionBoardReference = LoadedTransitionBoardTrackInfo & {
  intel: LoadedTransitionBoardReferenceIntel;
};

export type LoadedTransitionBoardRow = {
  rank: number;
  score: number;
  explanation: string;
  facts: DirectionScoreFacts;
  scoreBreakdown: Record<string, number>;
  track: LoadedTransitionBoardTrackInfo;
};

export type LoadedTransitionBoardDirection = {
  directionId: RecommendationDirectionId;
  title: string;
  purpose: string;
  results: LoadedTransitionBoardRow[];
};

export type LoadedTransitionBoardAnalysis = {
  runId: string;
  referenceTrackId: string | null;
  /** Present when `referenceTrackId` is set — includes merged enrichment for the panel. */
  reference?: LoadedTransitionBoardReference;
  rulesVersion: string;
  analysisType: string;
  createdAt: string;
  inputSnapshot: TransitionAnalysisInputSnapshotV1 | null;
  directions: LoadedTransitionBoardDirection[];
};

/** Client wiring for “saved transition” controls on the board. */
export type TransitionBoardSaveChrome = {
  analysisRunId: string;
  savedKeys: ReadonlySet<string>;
  onMarkSaved: (compositeKey: string) => void;
};

export type LoadTransitionBoardAnalysisResult =
  | { ok: true; analysis: LoadedTransitionBoardAnalysis }
  | { ok: false; reason: "not_found" | "wrong_type"; message?: string };
