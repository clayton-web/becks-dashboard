export type SpotifyPlaylistImportSummary = {
  playlistsImported: number;
  tracksSeen: number;
  tracksCreated: number;
  tracksReused: number;
  crateTracksWritten: number;
  skippedItems: number;
  errors: string[];
};
