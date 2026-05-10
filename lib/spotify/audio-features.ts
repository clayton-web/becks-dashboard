const SPOTIFY_API = "https://api.spotify.com/v1";

/** Spotify caps audio-features ids at 100 per request. */
export const SPOTIFY_AUDIO_FEATURES_BATCH_LIMIT = 100;

export type SpotifyAudioFeaturesObject = {
  id?: string | null;
  tempo?: number | null;
  /** Pitch class 0–11, or −1 if unknown */
  key?: number | null;
  /** 0 minor, 1 major — may be null on malformed payloads */
  mode?: number | null;
  energy?: number | null;
  danceability?: number | null;
  valence?: number | null;
  loudness?: number | null;
};

type SpotifyAudioFeaturesBatchResponse = {
  audio_features?: (SpotifyAudioFeaturesObject | null)[];
};

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  } as const;
}

export async function fetchSpotifyAudioFeaturesBatch(input: {
  accessToken: string;
  spotifyTrackIds: string[];
  fetchFn?: typeof fetch;
}): Promise<Map<string, SpotifyAudioFeaturesObject | null>> {
  const ids = [...new Set(input.spotifyTrackIds.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, SpotifyAudioFeaturesObject | null>();
  const fetchImpl = input.fetchFn ?? fetch;

  for (let i = 0; i < ids.length; i += SPOTIFY_AUDIO_FEATURES_BATCH_LIMIT) {
    const slice = ids.slice(i, i + SPOTIFY_AUDIO_FEATURES_BATCH_LIMIT);
    const q = slice.map(encodeURIComponent).join(",");
    const url = `${SPOTIFY_API}/audio-features?ids=${q}`;
    const res = await fetchImpl(url, {
      headers: authHeaders(input.accessToken),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `[spotify] audio-features (${res.status}): ${text.slice(0, 260)}`,
      );
    }

    const body = (await res.json()) as SpotifyAudioFeaturesBatchResponse;
    const list = body.audio_features ?? [];

    for (let j = 0; j < slice.length; j++) {
      const requestedId = slice[j];
      if (!requestedId) continue;
      const row = list[j] ?? null;
      const resolvedId =
        row && typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : requestedId;
      out.set(resolvedId, row);
    }
  }

  return out;
}
