import { describe, expect, it, vi } from "vitest";

import { fetchLrclibPlainLyrics } from "@/lib/lrclib/net";

describe("fetchLrclibPlainLyrics", () => {
  it("uses get-cached when duration present and returns lyrics", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("/api/get-cached");
      expect(url).toContain("duration=");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 9,
            trackName: "T",
            artistName: "A",
            albumName: "Al",
            duration: 120,
            instrumental: false,
            plainLyrics: "Line",
          }),
      };
    });

    const out = await fetchLrclibPlainLyrics(
      {
        artistName: "A",
        trackName: "T",
        albumName: "Al",
        durationMs: 120_000,
      },
      { fetchFn: fetchMock as unknown as typeof fetch, timeoutMs: 5000 },
    );

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.plainLyricsTrimmed).toBe("Line");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to search when get-cached misses", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("get-cached")) {
        return {
          ok: false,
          status: 404,
          text: async () =>
            JSON.stringify({ code: 404, name: "TrackNotFound", message: "x" }),
        };
      }
      expect(url).toContain("/api/search");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: 2,
              trackName: "T",
              artistName: "A",
              albumName: "Al",
              duration: 115,
              instrumental: false,
              plainLyrics: "Found via search",
            },
          ]),
      };
    });

    const out = await fetchLrclibPlainLyrics(
      {
        artistName: "A",
        trackName: "T",
        albumName: "Al",
        durationMs: 115_000,
      },
      { fetchFn: fetchMock as unknown as typeof fetch, timeoutMs: 5000 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.plainLyricsTrimmed).toBe("Found via search");
    }
  });

  it("returns network failure without throwing", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("boom");
    });

    const out = await fetchLrclibPlainLyrics(
      {
        artistName: "A",
        trackName: "T",
        albumName: null,
        durationMs: null,
      },
      { fetchFn: fetchMock as unknown as typeof fetch, timeoutMs: 5000 },
    );

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("network");
    }
  });
});
