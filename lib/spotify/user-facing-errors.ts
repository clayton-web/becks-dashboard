/**
 * User-visible copy for Spotify flows — no secrets, safe for client bundles.
 */

export function spotifyLibraryListMessage(code: string, detail?: string): string {
  switch (code) {
    case "not_connected":
      return "Connect Spotify in Settings to load playlists from your account.";
    case "missing_service_role":
      return "This deployment is missing SUPABASE_SERVICE_ROLE_KEY (Vercel → Settings → Environment Variables). Server routes need it to read Spotify tokens securely.";
    case "missing_spotify_env":
      return "Spotify OAuth is not configured (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI). Add them in Vercel or .env.local.";
    case "token_refresh_failed":
      return detail
        ? `Spotify session could not be refreshed. Try reconnecting Spotify in Settings. (${detail})`
        : "Spotify session could not be refreshed. Reconnect Spotify in Settings.";
    case "spotify_api": {
      const lower = detail?.toLowerCase() ?? "";
      if (lower.includes("429") || lower.includes("rate limit")) {
        return "Spotify rate-limited the request. Wait a minute and refresh this page.";
      }
      return detail
        ? `Spotify returned an error. Try again shortly. (${detail})`
        : "Spotify returned an error. Try again shortly.";
    }
    case "unauthorized":
      return "You need to sign in again to use the library.";
    default:
      return detail ? `${code}: ${detail}` : `Something went wrong (${code}).`;
  }
}

export function spotifyImportFailureMessage(
  status: number,
  body: { error?: string; message?: string },
): string {
  const err = body.error ?? "";
  const msg = body.message;

  switch (err) {
    case "unauthorized":
      return "Sign in again, then retry the import.";
    case "not_connected":
      return msg ?? "Connect Spotify in Settings before importing playlists.";
    case "missing_service_role":
      return "Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing. Contact the admin or check Vercel env vars.";
    case "missing_spotify_env":
      return "Spotify OAuth env vars are missing on the server. Check Vercel configuration.";
    case "token_refresh_failed":
      return msg ?? "Could not refresh your Spotify session. Reconnect in Settings.";
    case "playlist_ids_required":
    case "playlist_ids_invalid":
      return "Select at least one playlist to import.";
    case "invalid_json":
      return "Invalid request. Refresh the page and try again.";
    case "too_many_playlists":
      return msg ?? "Too many playlists selected. Import in smaller batches.";
    default:
      break;
  }

  if (status === 401) return "Sign in again, then retry the import.";
  if (status === 503) {
    return msg ?? "Server is not fully configured for Spotify. Check diagnostics in Settings.";
  }
  if (status === 502) {
    return msg ?? "Spotify or token refresh failed. Try reconnecting in Settings.";
  }
  if (status === 429) return "Too many requests. Wait a bit and try again.";
  if (msg) return msg;
  return `Import failed (HTTP ${status}).`;
}
