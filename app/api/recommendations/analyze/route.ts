import { type NextRequest, NextResponse } from "next/server";

import { persistTransitionBoardAnalysis } from "@/lib/recommendations/analysis-run";
import {
  DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
} from "@/lib/recommendations/candidates-core";
import { DEFAULT_MAX_RESULTS_PER_DIRECTION } from "@/lib/recommendations/scoring-core";
import { RECOMMENDATION_SCORING_RULES_VERSION } from "@/lib/recommendations/scoring-version";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizePositiveInt(value: unknown, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const n = Math.floor(value);
  if (n < 1) return fallback;
  return Math.min(n, max);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "invalid_json",
        message:
          "Send JSON with referenceTrackId and optional crateIds, maxCandidates, maxPerDirection.",
      },
      { status: 400 },
    );
  }

  const refRaw =
    body &&
    typeof body === "object" &&
    "referenceTrackId" in body &&
    typeof (body as { referenceTrackId: unknown }).referenceTrackId === "string"
      ? (body as { referenceTrackId: string }).referenceTrackId.trim()
      : "";

  if (!refRaw) {
    return NextResponse.json(
      {
        error: "reference_track_required",
        message: "Provide referenceTrackId (uuid string).",
      },
      { status: 400 },
    );
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  let crateIdsForPersist: string[] | null | undefined;
  if ("crateIds" in raw) {
    if (!Array.isArray(raw.crateIds)) {
      return NextResponse.json(
        {
          error: "invalid_crate_ids",
          message: "crateIds must be an array of uuid strings when provided.",
        },
        { status: 400 },
      );
    }
    crateIdsForPersist = raw.crateIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim());
  }

  const maxCandidates = sanitizePositiveInt(
    "maxCandidates" in raw ? raw.maxCandidates : undefined,
    DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
    DEFAULT_RECOMMENDATION_CANDIDATE_POOL_MAX,
  );

  const maxPerDirection = sanitizePositiveInt(
    "maxPerDirection" in raw ? raw.maxPerDirection : undefined,
    80,
    DEFAULT_MAX_RESULTS_PER_DIRECTION,
  );

  const result = await persistTransitionBoardAnalysis(supabase, {
    userId: user.id,
    referenceTrackId: refRaw,
    crateIds: crateIdsForPersist,
    maxCandidates,
    maxPerDirection,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "analyze_failed", message: result.error },
      { status: 422 },
    );
  }

  return NextResponse.json({
    runId: result.runId,
    rulesVersion: RECOMMENDATION_SCORING_RULES_VERSION,
    referenceTrackId: result.scored.referenceTrackId,
    inputSnapshot: result.inputSnapshot,
    directionCount: result.scored.directions.length,
    totalResultRows: result.scored.directions.reduce(
      (n, d) => n + d.results.length,
      0,
    ),
  });
}
