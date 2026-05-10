/** Safe Spotify playlist fields for Library / API responses — no tokens. */
export type SpotifyPlaylistCardDto = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  trackCount: number;
  ownerDisplayName: string | null;
  imageUrl: string | null;
  spotifyOpenUrl: string | null;
};
