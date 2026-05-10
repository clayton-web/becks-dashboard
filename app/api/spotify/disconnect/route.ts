import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { SPOTIFY_OAUTH_STATE_COOKIE } from "@/lib/spotify/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(SPOTIFY_OAUTH_STATE_COOKIE);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { error: delError } = await supabase
    .from("spotify_connections")
    .delete()
    .eq("user_id", user.id);

  const url = new URL("/settings", request.url);

  if (delError) {
    url.searchParams.set("spotify", "error");
    url.searchParams.set(
      "reason",
      delError.message.replace(/\s+/g, "+").slice(0, 230),
    );
    return NextResponse.redirect(url);
  }

  url.searchParams.set("spotify", "disconnected");
  return NextResponse.redirect(url);
}
