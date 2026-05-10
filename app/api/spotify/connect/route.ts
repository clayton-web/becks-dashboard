import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  SPOTIFY_OAUTH_STATE_COOKIE,
  assertSpotifyServerEnvConfigured,
  buildSpotifyAuthorizeUrl,
  generateOAuthState,
} from "@/lib/spotify/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const env = assertSpotifyServerEnvConfigured();

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", "/settings");
      return NextResponse.redirect(loginUrl);
    }

    const state = generateOAuthState();
    const cookieStore = await cookies();
    cookieStore.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    const location = buildSpotifyAuthorizeUrl({ env, state });
    return NextResponse.redirect(location);
  } catch {
    const url = new URL("/settings", request.url);
    url.searchParams.set("spotify", "error");
    url.searchParams.set("reason", "env_missing");
    return NextResponse.redirect(url);
  }
}
