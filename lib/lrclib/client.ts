import "server-only";

export type {
  LrclibFetchOutcome,
  LrclibLookupInput,
  LrclibTrackRecord,
} from "@/lib/lrclib/types";

export {
  parseLrclibSearchResults,
  parseLrclibTrackRecord,
  trimLyricsText,
} from "@/lib/lrclib/parse";

export {
  DEFAULT_LRCLIB_TIMEOUT_MS,
  fetchLrclibPlainLyrics,
  LRCLIB_API_BASE,
  LRCLIB_USER_AGENT,
  pickSearchMatch,
} from "@/lib/lrclib/net";
