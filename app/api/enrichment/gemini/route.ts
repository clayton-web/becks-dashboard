import { type NextRequest, NextResponse } from "next/server";

import {
  ensureGeminiSemanticEnrichment,
  GEMINI_SEMANTIC_ENRICHMENT_MAX_TRACK_IDS,
} from "@/lib/enrichment/ensure-gemini";
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

  if (trackIds.length > GEMINI_SEMANTIC_ENRICHMENT_MAX_TRACK_IDS) {
    return NextResponse.json(
      {
        error: "too_many_tracks",
        message: `At most ${GEMINI_SEMANTIC_ENRICHMENT_MAX_TRACK_IDS} tracks per request.`,
      },
      { status: 400 },
    );
  }

  const trimmedKey = process.env.GEMINI_API_KEY?.trim();
  if (!trimmedKey) {
    return NextResponse.json(
      {
        error: "missing_gemini_env",
        message: "Semantic enrichment is not configured (GEMINI_API_KEY).",
      },
      { status: 503 },
    );
  }

  try {
    const summary = await ensureGeminiSemanticEnrichment({
      userId: user.id,
      supabase,
      trackIds,
      force,
    });

    return NextResponse.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingKey =
      typeof msg === "string" && msg.includes("GEMINI_API_KEY") ? true : false;
    return NextResponse.json(
      {
        error: missingKey ? "missing_gemini_env" : "gemini_enrichment_failed",
        message: missingKey
          ? "Semantic enrichment is not configured (GEMINI_API_KEY)."
          : msg,
      },
      { status: missingKey ? 503 : 502 },
    );
  }
}
