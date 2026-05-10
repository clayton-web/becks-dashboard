import { type NextRequest, NextResponse } from "next/server";

import {
  fetchSavedCompositeKeysForRun,
  listSavedTransitionsForUser,
  saveBoardTransition,
} from "@/lib/recommendations/saved-transitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const runId = request.nextUrl.searchParams.get("runId")?.trim() ?? "";
  const compact = request.nextUrl.searchParams.get("compact");

  if (runId && compact === "keys") {
    const keys = await fetchSavedCompositeKeysForRun(supabase, user.id, runId);
    return NextResponse.json({ keys: [...keys] });
  }

  const listed = await listSavedTransitionsForUser(supabase, user.id, {
    analysisRunId: runId || null,
  });

  if (!listed.ok) {
    return NextResponse.json(
      { error: "list_failed", message: listed.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: listed.items });
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
      { error: "invalid_json", message: "Expected JSON body." },
      { status: 400 },
    );
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const analysisRunId =
    typeof rec.analysisRunId === "string" ? rec.analysisRunId.trim() : "";
  const directionId =
    typeof rec.directionId === "string" ? rec.directionId.trim() : "";
  const candidateTrackId =
    typeof rec.candidateTrackId === "string" ? rec.candidateTrackId.trim() : "";
  const userNote =
    "userNote" in rec && typeof rec.userNote === "string" ? rec.userNote : null;

  if (!analysisRunId || !directionId || !candidateTrackId) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: "Provide analysisRunId, directionId, and candidateTrackId.",
      },
      { status: 400 },
    );
  }

  const saved = await saveBoardTransition(supabase, user.id, {
    analysisRunId,
    directionId,
    candidateTrackId,
    userNote,
  });

  if (!saved.ok) {
    const status =
      saved.reason === "run_not_found" || saved.reason === "result_not_found"
        ? 404
        : saved.reason === "invalid_direction"
          ? 400
          : 422;
    return NextResponse.json(
      { error: saved.reason, message: saved.message ?? saved.reason },
      { status },
    );
  }

  return NextResponse.json({
    id: saved.id,
    duplicate: saved.duplicate,
  });
}
