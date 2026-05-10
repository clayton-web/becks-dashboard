import { NextResponse } from "next/server";

import { getSpotifyPlaylistCardsForSession } from "@/lib/spotify/user-playlists";
import { spotifyLibraryListMessage } from "@/lib/spotify/user-facing-errors";

function statusForFailureCode(
  code: string,
  detail?: string,
): { status: number; body: { error: string; message: string } } {
  const message = spotifyLibraryListMessage(code, detail);
  switch (code) {
    case "unauthorized":
      return { status: 401, body: { error: code, message } };
    case "not_connected":
      return {
        status: 404,
        body: { error: code, message },
      };
    case "missing_spotify_env":
    case "missing_service_role":
      return {
        status: 503,
        body: {
          error: code,
          message,
        },
      };
    case "token_refresh_failed":
    case "spotify_api":
      return {
        status: 502,
        body: { error: code, message },
      };
    default:
      return {
        status: 500,
        body: { error: "unknown", message: spotifyLibraryListMessage("unknown", detail) },
      };
  }
}

export async function GET() {
  const result = await getSpotifyPlaylistCardsForSession();
  if (!result.ok) {
    const { status, body } = statusForFailureCode(result.code, result.message);
    return NextResponse.json(
      {
        error: body.error,
        message: body.message,
      },
      { status },
    );
  }
  return NextResponse.json({ playlists: result.playlists });
}
