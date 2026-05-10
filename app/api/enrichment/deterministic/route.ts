import { type NextRequest, NextResponse } from "next/server";

import { filterTrackIdsOwnedByUser } from "@/lib/data/track-ownership";
import {
  DETERMINISTIC_ENRICHMENT_MAX_TRACK_IDS,
  ensureDeterministicTrackEnrichment,
} from "@/lib/enrichment/ensure-deterministic";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getValidSpotifyAccessTokenForSessionUser } from "@/lib/spotify/session-access-token";
import { spotifyLibraryListMessage } from "@/lib/spotify/user-facing-errors";

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
        { error: code, message: friendly },
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
      { error: "unauthorized", message: "Sign in again, then retry." },
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
        message: "Send JSON with trackIds: string[] and optional force: boolean.",
      },
      { status: 400 },
    );
  }

  const rawIds =
    body &&
    typeof body === "object" &&
    "trackIds" in body &&
    Array.isArray((body as { trackIds: unknown }).trackIds)
      ? (body as { trackIds: unknown[] }).trackIds
      : null;

  const force =
    body &&
    typeof body === "object" &&
    "force" in body &&
    typeof (body as { force: unknown }).force === "boolean"
      ? (body as { force: boolean }).force
      : false;

  if (!rawIds || rawIds.length === 0) {
    return NextResponse.json(
      { error: "track_ids_required", message: "Provide trackIds: string[]" },
      { status: 400 },
    );
  }

  const trackIds = [
    ...new Set(
      rawIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    ),
  ];

  if (trackIds.length === 0) {
    return NextResponse.json(
      { error: "track_ids_invalid", message: "Provide at least one valid UUID." },
      { status: 400 },
    );
  }

  if (trackIds.length > DETERMINISTIC_ENRICHMENT_MAX_TRACK_IDS) {
    return NextResponse.json(
      {
        error: "too_many_tracks",
        message: `At most ${DETERMINISTIC_ENRICHMENT_MAX_TRACK_IDS} tracks per request.`,
      },
      { status: 400 },
    );
  }

  const requestedTotal = trackIds.length;

  const ownership = await filterTrackIdsOwnedByUser(supabase, user.id, trackIds);
  if (!ownership.ok) {
    return NextResponse.json(
      {
        error: "ownership_lookup_failed",
        message: ownership.error,
      },
      { status: 502 },
    );
  }

  const summary = await ensureDeterministicTrackEnrichment({
    userId: user.id,
    accessToken: token.accessToken,
    trackIds: ownership.ownedTrackIds,
    force,
  });

  return NextResponse.json({
    requestedTotal,
    rejectedUnauthorized: ownership.rejectedTrackIds.length,
    rejectedUnauthorizedTrackIds: ownership.rejectedTrackIds,
    ...summary,
  });
}
