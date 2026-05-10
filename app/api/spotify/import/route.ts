import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getValidSpotifyAccessTokenForSessionUser } from "@/lib/spotify/session-access-token";
import { importSpotifyPlaylistsToCrates } from "@/lib/spotify/import-playlists";
import { spotifyLibraryListMessage } from "@/lib/spotify/user-facing-errors";

const MAX_PLAYLISTS_PER_REQUEST = 40;

function mapTokenFailureToResponse(code: string, message?: string) {
  const friendly = spotifyLibraryListMessage(code, message);
  switch (code) {
    case "unauthorized":
      return NextResponse.json(
        { error: code, message: friendly },
        { status: 401 },
      );
    case "not_connected":
      return NextResponse.json(
        { error: code, message: friendly },
        { status: 400 },
      );
    case "missing_spotify_env":
    case "missing_service_role":
      return NextResponse.json(
        {
          error: code,
          message: friendly,
        },
        { status: 503 },
      );
    default:
      return NextResponse.json(
        { error: code, message: friendly },
        { status: 502 },
      );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in again, then retry the import." },
      { status: 401 },
    );
  }

  const token = await getValidSpotifyAccessTokenForSessionUser();
  if (!token.ok) {
    return mapTokenFailureToResponse(token.code, token.message);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "invalid_json",
        message: "Send a JSON body with playlistIds: string[].",
      },
      { status: 400 },
    );
  }

  const rawIds =
    body &&
    typeof body === "object" &&
    "playlistIds" in body &&
    Array.isArray((body as { playlistIds: unknown }).playlistIds)
      ? (body as { playlistIds: unknown[] }).playlistIds
      : null;

  if (!rawIds || rawIds.length === 0) {
    return NextResponse.json(
      { error: "playlist_ids_required", message: "Provide playlistIds: string[]" },
      { status: 400 },
    );
  }

  const playlistIds = [
    ...new Set(
      rawIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    ),
  ];

  if (playlistIds.length === 0) {
    return NextResponse.json(
      {
        error: "playlist_ids_invalid",
        message: "Select at least one valid playlist id.",
      },
      { status: 400 },
    );
  }

  if (playlistIds.length > MAX_PLAYLISTS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: "too_many_playlists",
        message: `At most ${MAX_PLAYLISTS_PER_REQUEST} playlists per request.`,
      },
      { status: 400 },
    );
  }

  const summary = await importSpotifyPlaylistsToCrates({
    userId: user.id,
    accessToken: token.accessToken,
    playlistIds,
  });

  return NextResponse.json(summary);
}
