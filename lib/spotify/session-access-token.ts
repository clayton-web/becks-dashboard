import "server-only";

import { getSpotifyServerEnv, getSupabaseServiceRoleKey } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

import {
  refreshSpotifyAccessToken,
  spotifyExpiryIsoFromNow,
} from "@/lib/spotify/oauth";

/** Refresh the access token when it expires within this window (ms). */
export const SPOTIFY_ACCESS_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

export type SpotifySessionTokenFailureCode =
  | "unauthorized"
  | "not_connected"
  | "token_refresh_failed"
  | "missing_service_role"
  | "missing_spotify_env";

export type SpotifySessionTokenResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      code: SpotifySessionTokenFailureCode;
      message?: string;
    };

/**
 * Verifies the Supabase session, loads `spotify_connections` with the service role
 * (user JWT cannot SELECT OAuth tokens), refreshes if near expiry, persists new tokens
 * server-side. Never returns or logs refresh tokens to the client.
 */
export async function getValidSpotifyAccessTokenForSessionUser(): Promise<SpotifySessionTokenResult> {
  try {
    getSpotifyServerEnv();
  } catch {
    return { ok: false, code: "missing_spotify_env" };
  }

  try {
    getSupabaseServiceRoleKey();
  } catch {
    return {
      ok: false,
      code: "missing_service_role",
      message:
        "SUPABASE_SERVICE_ROLE_KEY is required to read or refresh Spotify tokens.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    return { ok: false, code: "unauthorized" };
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: row, error: rowError } = await admin
    .from("spotify_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowError) {
    return {
      ok: false,
      code: "token_refresh_failed",
      message: rowError.message,
    };
  }

  if (!row?.access_token?.trim() || !row.refresh_token?.trim()) {
    return { ok: false, code: "not_connected" };
  }

  const expiresAtMs = new Date(row.expires_at).getTime();
  const needsRefresh =
    Number.isNaN(expiresAtMs) ||
    expiresAtMs <= Date.now() + SPOTIFY_ACCESS_TOKEN_REFRESH_SKEW_MS;

  let accessToken = row.access_token;

  if (needsRefresh) {
    let tokens;
    try {
      const env = getSpotifyServerEnv();
      tokens = await refreshSpotifyAccessToken(env, row.refresh_token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "refresh_failed";
      return { ok: false, code: "token_refresh_failed", message: msg };
    }

    const nextRefreshToken = tokens.refresh_token ?? row.refresh_token;
    const { error: upError } = await admin
      .from("spotify_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: nextRefreshToken,
        expires_at: spotifyExpiryIsoFromNow(tokens.expires_in),
        ...(tokens.token_type != null ? { token_type: tokens.token_type } : {}),
        ...(tokens.scope != null ? { scope: tokens.scope } : {}),
      })
      .eq("user_id", user.id);

    if (upError) {
      return {
        ok: false,
        code: "token_refresh_failed",
        message: upError.message,
      };
    }

    accessToken = tokens.access_token;
  }

  return { ok: true, accessToken };
}
