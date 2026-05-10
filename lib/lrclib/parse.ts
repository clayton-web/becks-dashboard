import type { LrclibTrackRecord } from "@/lib/lrclib/types";

/** Parses successful LRCLIB JSON body (200). Exported for unit tests. */
export function parseLrclibTrackRecord(json: unknown): LrclibTrackRecord | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  const trackName = o.trackName;
  const artistName = o.artistName;
  const albumName = o.albumName;
  const duration = o.duration;
  if (typeof trackName !== "string") return null;
  if (typeof artistName !== "string") return null;
  if (typeof albumName !== "string") return null;
  if (typeof duration !== "number" || !Number.isFinite(duration)) return null;

  const instrumental = o.instrumental === true;
  const plain =
    o.plainLyrics == null
      ? null
      : typeof o.plainLyrics === "string"
        ? o.plainLyrics
        : null;

  return {
    id,
    trackName,
    artistName,
    albumName,
    duration,
    instrumental,
    plainLyrics: plain,
  };
}

/** Parses `/api/search` JSON array. Exported for unit tests. */
export function parseLrclibSearchResults(json: unknown): LrclibTrackRecord[] {
  if (!Array.isArray(json)) return [];
  const out: LrclibTrackRecord[] = [];
  for (const item of json) {
    const rec = parseLrclibTrackRecord(item);
    if (rec) out.push(rec);
  }
  return out;
}

export function trimLyricsText(text: string | null | undefined): string | null {
  if (text == null) return null;
  if (typeof text !== "string") return null;
  const t = text.trim();
  return t === "" ? null : t;
}
