import { type NextRequest, NextResponse } from "next/server";

import { filterTrackIdsOwnedByUser } from "@/lib/data/track-ownership";
import {
  ensureLrclibLyricsEnrichment,
  LRCLIB_ENRICHMENT_MAX_TRACK_IDS,
} from "@/lib/enrichment/ensure-lrclib";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (trackIds.length > LRCLIB_ENRICHMENT_MAX_TRACK_IDS) {
    return NextResponse.json(
      {
        error: "too_many_tracks",
        message: `At most ${LRCLIB_ENRICHMENT_MAX_TRACK_IDS} tracks per request.`,
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

  const summary = await ensureLrclibLyricsEnrichment({
    userId: user.id,
    trackIds: ownership.ownedTrackIds,
    force,
  });

  return NextResponse.json({
    requestedTotal,
    rejectedUnauthorized: ownership.rejectedTrackIds.length,
    rejectedUnauthorizedTrackIds: ownership.rejectedTrackIds,
    requested: summary.requested,
    enriched: summary.enriched,
    skipped: summary.skipped,
    notFound: summary.notFound,
    failed: summary.failed,
    errors: summary.errors,
  });
}
