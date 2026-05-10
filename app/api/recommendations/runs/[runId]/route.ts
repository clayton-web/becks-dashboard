import { type NextRequest, NextResponse } from "next/server";

import { loadTransitionBoardAnalysis } from "@/lib/recommendations/analysis-run";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, context: RouteCtx) {
  const { runId } = await context.params;
  const id = runId?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "run_id_required", message: "Missing analysis run id." },
      { status: 400 },
    );
  }

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

  const loaded = await loadTransitionBoardAnalysis(supabase, id);

  if (!loaded.ok) {
    const status = loaded.reason === "wrong_type" ? 400 : 404;
    return NextResponse.json(
      {
        error: loaded.reason,
        message: loaded.message ?? "Run not found.",
      },
      { status },
    );
  }

  return NextResponse.json(loaded.analysis);
}
