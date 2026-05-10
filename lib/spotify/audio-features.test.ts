import { describe, expect, it, vi } from "vitest";

import { fetchSpotifyAudioFeaturesBatch } from "@/lib/spotify/audio-features";

describe("fetchSpotifyAudioFeaturesBatch", () => {
  it("batches ids and maps responses per Spotify id", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("/audio-features?ids=");
      return {
        ok: true,
        json: async () => ({
          audio_features: [
            { id: "s1", tempo: 120, key: 0, mode: 1, energy: 0.5 },
            null,
          ],
        }),
      };
    });

    const map = await fetchSpotifyAudioFeaturesBatch({
      accessToken: "token",
      spotifyTrackIds: ["s1", "s2"],
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(map.get("s1")).toMatchObject({ tempo: 120 });
    expect(map.get("s2")).toBeNull();
  });

  it("throws when Spotify returns non-OK without swallowing", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => "nope",
    }));

    await expect(
      fetchSpotifyAudioFeaturesBatch({
        accessToken: "bad",
        spotifyTrackIds: ["x"],
        fetchFn: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/audio-features/);
  });
});
