/** Open in Spotify web player from stored id/uri (no API calls). */
export function spotifyTrackOpenUrl(
  spotifyId: string | null | undefined,
  spotifyUri: string | null | undefined,
): string | null {
  const id = spotifyId?.trim();
  if (id) return `https://open.spotify.com/track/${id}`;
  const uri = spotifyUri?.trim();
  if (uri?.startsWith("spotify:track:")) {
    const rest = uri.slice("spotify:track:".length);
    if (rest) return `https://open.spotify.com/track/${rest}`;
  }
  return null;
}
