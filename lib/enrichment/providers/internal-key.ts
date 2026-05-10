import type { Json } from "@/types/supabase";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import {
  isValidSpotifyMode,
  spotifyKeyModeToCamelot,
  spotifyKeyModeToLabel,
} from "@/lib/music/key-camelot";
import type { SpotifyAudioFeaturesObject } from "@/lib/spotify/audio-features";

/** Builds INTERNAL enrichment upserts for Camelot (+ mirrored KEY fallback). */
export function spotifyAudioFeaturesToInternalKeyUpserts(
  trackId: string,
  features: SpotifyAudioFeaturesObject | null,
): TrackEnrichmentUpsertInput[] {
  if (!features) return [];

  const rawKey = features.key;
  const rawMode = features.mode;
  if (typeof rawKey !== "number" || rawKey < 0 || rawKey > 11) return [];
  if (typeof rawMode !== "number" || !isValidSpotifyMode(rawMode)) return [];

  const mode = rawMode;

  const label = spotifyKeyModeToLabel(rawKey, mode);
  const code = spotifyKeyModeToCamelot(rawKey, mode);
  if (!label || !code) return [];

  const meta = {
    spotify_key: rawKey,
    spotify_mode: mode,
  } satisfies Record<string, number>;

  const sourcePayload = meta as unknown as Json;

  return [
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.KEY,
      source: ENRICHMENT_SOURCE.INTERNAL,
      fieldValue: { label },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.CAMELOT,
      source: ENRICHMENT_SOURCE.INTERNAL,
      fieldValue: { code },
      sourcePayload,
    },
  ];
}
