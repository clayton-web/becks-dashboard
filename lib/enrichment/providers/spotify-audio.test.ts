import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import { spotifyAudioFeaturesToEnrichmentUpserts } from "@/lib/enrichment/providers/spotify-audio";
import type { SpotifyAudioFeaturesObject } from "@/lib/spotify/audio-features";

const TRACK = "00000000-0000-4000-8000-0000000000bb";

describe("spotifyAudioFeaturesToEnrichmentUpserts", () => {
  it("maps Spotify payload shapes into enrichment upserts", () => {
    const feat: SpotifyAudioFeaturesObject = {
      id: "spotifyTrack",
      tempo: 128.02,
      key: 9,
      mode: 0,
      energy: 0.72,
      danceability: 0.55,
      valence: 0.31,
      loudness: -5.4,
    };

    const upserts = spotifyAudioFeaturesToEnrichmentUpserts(TRACK, feat);
    const byField = new Map(upserts.map((u) => [u.fieldName, u]));

    expect(byField.get(ENRICHMENT_FIELD.BPM)?.fieldValue).toEqual({
      value: 128.02,
    });
    expect(byField.get(ENRICHMENT_FIELD.BPM)?.source).toBe(
      ENRICHMENT_SOURCE.SPOTIFY,
    );

    expect(byField.get(ENRICHMENT_FIELD.KEY)?.fieldValue).toEqual({
      label: "A minor",
    });

    expect(byField.get(ENRICHMENT_FIELD.ENERGY)?.fieldValue).toEqual({
      value: 0.72,
    });
    expect(byField.get(ENRICHMENT_FIELD.LOUDNESS)?.fieldValue).toEqual({
      value: -5.4,
    });
  });

  it("stores explicit unknown key as label null", () => {
    const feat: SpotifyAudioFeaturesObject = {
      key: -1,
      mode: 1,
      tempo: 100,
      energy: 0.5,
      danceability: 0.5,
      valence: 0.5,
      loudness: -8,
    };

    const upserts = spotifyAudioFeaturesToEnrichmentUpserts(TRACK, feat);
    const keyUpsert = upserts.find((u) => u.fieldName === ENRICHMENT_FIELD.KEY);
    expect(keyUpsert?.fieldValue).toEqual({ label: null });
  });

  it("returns empty list when features absent", () => {
    expect(spotifyAudioFeaturesToEnrichmentUpserts(TRACK, null)).toEqual([]);
  });
});
