import {
  parseLrclibSearchResults,
  parseLrclibTrackRecord,
  trimLyricsText,
} from "@/lib/lrclib/parse";
import type {
  LrclibFetchOutcome,
  LrclibLookupInput,
  LrclibTrackRecord,
} from "@/lib/lrclib/types";

export const LRCLIB_API_BASE = "https://lrclib.net/api";

export const DEFAULT_LRCLIB_TIMEOUT_MS = 14_000;

export const LRCLIB_USER_AGENT =
  "becks-dash/0.1.0 (https://github.com/)";

function lrclibEndpoint(path: "get-cached" | "search"): URL {
  return new URL(`${LRCLIB_API_BASE}/${path}`);
}

function buildUrl(path: "get-cached" | "search", params: Record<string, string | number>): string {
  const u = lrclibEndpoint(path);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function pickSearchMatch(
  records: LrclibTrackRecord[],
  durationSeconds: number | null,
): LrclibTrackRecord | null {
  if (records.length === 0) return null;

  const withLyrics = records.filter(
    (r) => !r.instrumental && trimLyricsText(r.plainLyrics) != null,
  );
  const pool = withLyrics.length > 0 ? withLyrics : records;

  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return pool[0] ?? null;
  }

  let best: LrclibTrackRecord | null = null;
  let bestDelta = Infinity;
  for (const r of pool) {
    const delta = Math.abs(r.duration - durationSeconds);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = r;
    }
  }
  if (best && bestDelta <= 3) return best;
  return pool[0] ?? null;
}

async function lrclibFetch(
  url: string,
  opts: { fetchFn: typeof fetch; timeoutMs: number },
): Promise<{ ok: boolean; status: number; json: unknown; textSnippet: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await opts.fetchFn(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": LRCLIB_USER_AGENT,
      },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      json,
      textSnippet: text.slice(0, 220),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      status: 0,
      json: null,
      textSnippet: msg.slice(0, 220),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves plain lyrics via `/api/get-cached` when duration is known, else `/api/search`,
 * with optional duration ranking when search returns multiple rows.
 */
export async function fetchLrclibPlainLyrics(
  input: LrclibLookupInput,
  opts?: { fetchFn?: typeof fetch; timeoutMs?: number },
): Promise<LrclibFetchOutcome> {
  const artistName = input.artistName.trim();
  const trackName = input.trackName.trim();
  const albumName = (input.albumName ?? "").trim();

  if (!artistName || !trackName) {
    return { ok: false, reason: "bad_response", detail: "missing_artist_or_title" };
  }

  const fetchFn = opts?.fetchFn ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_LRCLIB_TIMEOUT_MS;
  const durationSeconds =
    input.durationMs != null && Number.isFinite(input.durationMs)
      ? Math.max(1, Math.round(input.durationMs / 1000))
      : null;

  if (durationSeconds != null) {
    const url = buildUrl("get-cached", {
      artist_name: artistName,
      track_name: trackName,
      album_name: albumName,
      duration: durationSeconds,
    });

    const res = await lrclibFetch(url, { fetchFn, timeoutMs });
    if (!res.ok && res.status === 0) {
      return {
        ok: false,
        reason: "network",
        detail: res.textSnippet,
      };
    }
    if (res.ok && res.status === 200) {
      const rec = parseLrclibTrackRecord(res.json);
      if (rec) {
        return {
          ok: true,
          record: rec,
          plainLyricsTrimmed: trimLyricsText(rec.plainLyrics),
        };
      }
      return { ok: false, reason: "bad_response", status: res.status };
    }
    /* fall through to search on 404 etc. */
  }

  const searchUrl = buildUrl("search", {
    artist_name: artistName,
    track_name: trackName,
  });

  const sres = await lrclibFetch(searchUrl, { fetchFn, timeoutMs });
  if (!sres.ok && sres.status === 0) {
    return {
      ok: false,
      reason: "network",
      detail: sres.textSnippet,
    };
  }

  if (!sres.ok) {
    if (sres.status === 404) {
      return { ok: false, reason: "not_found", status: 404 };
    }
    return {
      ok: false,
      reason: "bad_response",
      status: sres.status,
      detail: sres.textSnippet,
    };
  }

  const list = parseLrclibSearchResults(sres.json);
  const picked = pickSearchMatch(list, durationSeconds);
  if (!picked) {
    return { ok: false, reason: "not_found", status: sres.status };
  }

  return {
    ok: true,
    record: picked,
    plainLyricsTrimmed: trimLyricsText(picked.plainLyrics),
  };
}
