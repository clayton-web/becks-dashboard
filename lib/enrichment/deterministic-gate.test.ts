import { describe, expect, it } from "vitest";

import {
  buildManifestKeys,
  filterUpsertsAgainstManifest,
  manifestKey,
  trackNeedsSpotifyAudioFeaturesFetchFromRows,
} from "@/lib/enrichment/deterministic-gate";
import { ENRICHMENT_FIELD, ENRICHMENT_SOURCE } from "@/lib/enrichment/fields";
import { spotifyAudioFeaturesToEnrichmentUpserts } from "@/lib/enrichment/providers/spotify-audio";
import type { EnrichmentValueRow } from "@/lib/enrichment/read-model";

const TRACK = "00000000-0000-4000-8000-0000000000cc";

function row(
  field: string,
  source: string,
  value: Record<string, unknown>,
): EnrichmentValueRow {
  return {
    track_id: TRACK,
    field_name: field,
    source,
    field_value: value,
    confidence: null,
  };
}

describe("trackNeedsSpotifyAudioFeaturesFetchFromRows", () => {
  it("requires fetch when Spotify rows missing", () => {
    expect(trackNeedsSpotifyAudioFeaturesFetchFromRows([], false)).toBe(true);
  });

  it("skips fetch when manifest satisfied with unknown key tombstone", () => {
    const rows: EnrichmentValueRow[] = [
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 120 }),
      row(ENRICHMENT_FIELD.KEY, ENRICHMENT_SOURCE.SPOTIFY, { label: null }),
      row(ENRICHMENT_FIELD.ENERGY, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.DANCEABILITY, ENRICHMENT_SOURCE.SPOTIFY, {
        value: 0.5,
      }),
      row(ENRICHMENT_FIELD.VALENCE, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.LOUDNESS, ENRICHMENT_SOURCE.SPOTIFY, {
        value: -6,
      }),
    ];
    expect(trackNeedsSpotifyAudioFeaturesFetchFromRows(rows, false)).toBe(
      false,
    );
  });

  it("requires fetch when key labeled but Camelot missing", () => {
    const rows: EnrichmentValueRow[] = [
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 120 }),
      row(ENRICHMENT_FIELD.KEY, ENRICHMENT_SOURCE.SPOTIFY, {
        label: "C major",
      }),
      row(ENRICHMENT_FIELD.ENERGY, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.DANCEABILITY, ENRICHMENT_SOURCE.SPOTIFY, {
        value: 0.5,
      }),
      row(ENRICHMENT_FIELD.VALENCE, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.LOUDNESS, ENRICHMENT_SOURCE.SPOTIFY, {
        value: -6,
      }),
    ];
    expect(trackNeedsSpotifyAudioFeaturesFetchFromRows(rows, false)).toBe(true);
  });

  it("forces fetch when force flag set", () => {
    const rows: EnrichmentValueRow[] = [
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 120 }),
      row(ENRICHMENT_FIELD.KEY, ENRICHMENT_SOURCE.SPOTIFY, { label: null }),
      row(ENRICHMENT_FIELD.ENERGY, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.DANCEABILITY, ENRICHMENT_SOURCE.SPOTIFY, {
        value: 0.5,
      }),
      row(ENRICHMENT_FIELD.VALENCE, ENRICHMENT_SOURCE.SPOTIFY, { value: 0.5 }),
      row(ENRICHMENT_FIELD.LOUDNESS, ENRICHMENT_SOURCE.SPOTIFY, {
        value: -6,
      }),
    ];
    expect(trackNeedsSpotifyAudioFeaturesFetchFromRows(rows, true)).toBe(true);
  });
});

describe("filterUpsertsAgainstManifest", () => {
  it("drops upserts already present unless forced", () => {
    const upserts = spotifyAudioFeaturesToEnrichmentUpserts(TRACK, {
      tempo: 120,
      key: 0,
      mode: 1,
      energy: 0.5,
      danceability: 0.5,
      valence: 0.5,
      loudness: -4,
    });

    const manifest = buildManifestKeys([
      row(ENRICHMENT_FIELD.BPM, ENRICHMENT_SOURCE.SPOTIFY, { value: 118 }),
    ]);

    const filtered = filterUpsertsAgainstManifest(upserts, manifest, false);
    expect(
      filtered.some((u) => u.fieldName === ENRICHMENT_FIELD.BPM),
    ).toBe(false);
    expect(
      filtered.some((u) => u.fieldName === ENRICHMENT_FIELD.KEY),
    ).toBe(true);
  });
});

describe("manifestKey", () => {
  it("uses stable delimiter", () => {
    expect(manifestKey(ENRICHMENT_SOURCE.SPOTIFY, ENRICHMENT_FIELD.BPM)).toBe(
      `spotify\u001fbpm`,
    );
  });
});
