import type { TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import {
  buildNormalizedSemanticSignals,
  type NormalizedSemanticSignals,
} from "@/lib/semantic/normalize";

export type { NormalizedSemanticSignals };

/**
 * Normalizes merged semantic slots from a track intel snapshot (Gemini-precedence
 * fields when present). Deterministic audio fields are untouched elsewhere.
 */
export function normalizedSemanticSignalsFromSnapshot(
  snapshot: TrackIntelSnapshot,
): NormalizedSemanticSignals {
  return buildNormalizedSemanticSignals({
    moodTags: snapshot.moodTags?.value,
    themes: snapshot.themes?.value,
    lyricKeywords: snapshot.lyricKeywords?.value,
    semanticTags: snapshot.semanticTags?.value,
  });
}
