export type LrclibTrackRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
};

export type LrclibFetchOutcome =
  | {
      ok: true;
      record: LrclibTrackRecord;
      plainLyricsTrimmed: string | null;
    }
  | {
      ok: false;
      reason: "not_found" | "network" | "bad_response";
      status?: number;
      detail?: string;
    };

export type LrclibLookupInput = {
  artistName: string;
  trackName: string;
  albumName: string | null;
  durationMs: number | null;
};
