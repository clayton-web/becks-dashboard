import type { Json } from "@/types/supabase";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import type { LrclibFetchOutcome } from "@/lib/lrclib/types";

/** Minimal audit blob — avoids storing full LRCLIB payloads. */
export type LrclibLyricsSourcePayload = {
  lrclib_id?: number;
  status: "hit" | "not_found" | "instrumental" | "empty_lyrics";
};

/**
 * Maps LRCLIB outcomes to `LYRICS_PLAIN` upserts.
 * Returns null for transport/parse failures so callers can retry later (no tombstone).
 */
export function lrclibOutcomeToLyricsUpsertOrNull(
  trackId: string,
  outcome: LrclibFetchOutcome,
): TrackEnrichmentUpsertInput | null {
  if (!outcome.ok) {
    if (outcome.reason === "not_found") {
      const meta: LrclibLyricsSourcePayload = { status: "not_found" };
      return {
        trackId,
        fieldName: ENRICHMENT_FIELD.LYRICS_PLAIN,
        source: ENRICHMENT_SOURCE.LRCLIB,
        fieldValue: { text: null },
        sourcePayload: meta as unknown as Json,
      };
    }
    return null;
  }

  const trimmed = outcome.plainLyricsTrimmed;
  const instrumental = outcome.record.instrumental;

  if (instrumental || trimmed == null) {
    const meta: LrclibLyricsSourcePayload = {
      lrclib_id: outcome.record.id,
      status: instrumental ? "instrumental" : "empty_lyrics",
    };
    return {
      trackId,
      fieldName: ENRICHMENT_FIELD.LYRICS_PLAIN,
      source: ENRICHMENT_SOURCE.LRCLIB,
      fieldValue: { text: null },
      sourcePayload: meta as unknown as Json,
    };
  }

  const meta: LrclibLyricsSourcePayload = {
    lrclib_id: outcome.record.id,
    status: "hit",
  };

  return {
    trackId,
    fieldName: ENRICHMENT_FIELD.LYRICS_PLAIN,
    source: ENRICHMENT_SOURCE.LRCLIB,
    fieldValue: { text: trimmed },
    sourcePayload: meta as unknown as Json,
  };
}
