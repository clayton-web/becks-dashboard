import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  SPOTIFY_OAUTH_STATE_COOKIE,
  assertSpotifyServerEnvConfigured,
  exchangeSpotifyAuthorizationCode,
  fetchSpotifyMeProfile,
  spotifyExpiryIsoFromNow,
} from "@/lib/spotify/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

function redirectFailure(
  request: NextRequest,
  reason: string,
): NextResponse {
  const url = new URL("/settings", request.url);
  url.searchParams.set("spotify", "error");
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const incoming = request.nextUrl.searchParams;
  const oauthErr = incoming.get("error");
  const oauthErrDesc = incoming.get("error_description");

  if (oauthErr) {
    const reason =
      oauthErrDesc?.slice(0, 240)?.replace(/\s+/g, "+") ??
      `${oauthErr}_oauth_denied`;
    return redirectFailure(request, reason);
  }

  const code = incoming.get("code");
  const state = incoming.get("state");
  if (!code || !state) {
    return redirectFailure(request, "missing_code_or_state");
  }

  const expected = cookieStore.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(SPOTIFY_OAUTH_STATE_COOKIE);

  if (!expected || expected !== state) {
    return redirectFailure(request, "invalid_state");
  }

  let envConfig;
  try {
    envConfig = assertSpotifyServerEnvConfigured();
  } catch {
    return redirectFailure(request, "env_missing");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return redirectFailure(request, "session_required");
  }

  let admin;
  try {
    admin = createSupabaseServiceRoleClient();
  } catch {
    return redirectFailure(request, "service_role_key_missing");
  }

  try {
    const tokens = await exchangeSpotifyAuthorizationCode(envConfig, code);
    if (!tokens.refresh_token) {
      throw new Error("refresh_token_missing");
    }

    const profile = await fetchSpotifyMeProfile(tokens.access_token);

    const expiresAt = spotifyExpiryIsoFromNow(tokens.expires_in);

    const { error: upsertError } = await admin.from("spotify_connections").upsert(
      {
        user_id: user.id,
        spotify_user_id: profile.id,
        display_name: profile.display_name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      return redirectFailure(
        request,
        `db:${upsertError.message.replace(/\s+/g, "+").slice(0, 230)}`,
      );
    }

    const success = new URL("/settings", request.url);
    success.searchParams.set("spotify", "connected");
    return NextResponse.redirect(success);
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : "oauth_processing_failed_exception";
    return redirectFailure(request, msg.replace(/\s+/g, "+").slice(0, 230));
  }
}
