import { type NextRequest, NextResponse } from "next/server";

import {
  deleteSavedTransition,
  updateSavedTransitionNote,
} from "@/lib/recommendations/saved-transitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteCtx) {
  const { id } = await context.params;
  const savedId = id?.trim();
  if (!savedId) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const userNote = "userNote" in rec ? rec.userNote : undefined;
  if (typeof userNote !== "string" && userNote !== null) {
    return NextResponse.json(
      { error: "validation_error", message: "userNote must be string or null." },
      { status: 400 },
    );
  }

  const result = await updateSavedTransitionNote(supabase, user.id, savedId, userNote ?? null);
  if (!result.ok) {
    const status = result.message === "Not found." ? 404 : 422;
    return NextResponse.json({ error: "update_failed", message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteCtx) {
  const { id } = await context.params;
  const savedId = id?.trim();
  if (!savedId) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
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

  const result = await deleteSavedTransition(supabase, user.id, savedId);
  if (!result.ok) {
    const status = result.message === "Not found." ? 404 : 422;
    return NextResponse.json({ error: "delete_failed", message: result.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
