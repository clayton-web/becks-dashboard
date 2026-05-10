import type { Json } from "@/types/supabase";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import {
  isValidSpotifyMode,
  spotifyKeyModeToLabel,
} from "@/lib/music/key-camelot";
import type { SpotifyAudioFeaturesObject } from "@/lib/spotify/audio-features";

function scalarMeasurement(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function resolveSpotifyKeyLabel(features: SpotifyAudioFeaturesObject): {
  label: string | null;
} {
  const rawKey = features.key;
  const rawMode = features.mode;

  if (rawKey === -1) {
    return { label: null };
  }

  if (
    typeof rawKey === "number" &&
    rawKey >= 0 &&
    rawKey <= 11 &&
    typeof rawMode === "number" &&
    isValidSpotifyMode(rawMode)
  ) {
    return { label: spotifyKeyModeToLabel(rawKey, rawMode) };
  }

  return { label: null };
}

/**
 * Maps Spotify `/audio-features` payloads to `track_enrichment_values` upserts.
 * Returns an empty list when `features` is null.
 */
export function spotifyAudioFeaturesToEnrichmentUpserts(
  trackId: string,
  features: SpotifyAudioFeaturesObject | null,
): TrackEnrichmentUpsertInput[] {
  if (!features) return [];

  const sourcePayload = features as unknown as Json;
  const { label: keyLabel } = resolveSpotifyKeyLabel(features);

  return [
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.BPM,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: {
        value: scalarMeasurement(features.tempo),
      },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.ENERGY,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: {
        value: scalarMeasurement(features.energy),
      },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.DANCEABILITY,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: {
        value: scalarMeasurement(features.danceability),
      },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.VALENCE,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: {
        value: scalarMeasurement(features.valence),
      },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.LOUDNESS,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: {
        value: scalarMeasurement(features.loudness),
      },
      sourcePayload,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.KEY,
      source: ENRICHMENT_SOURCE.SPOTIFY,
      fieldValue: { label: keyLabel },
      sourcePayload,
    },
  ];
}
