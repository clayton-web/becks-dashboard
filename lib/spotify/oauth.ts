/**
 * Spotify OAuth helpers (Phase 4A skeleton).
 *
 * Imports `node:crypto` — reserve this module for **server-only** Route Handlers / actions.
 */

import { randomBytes } from "node:crypto";

import { type SpotifyServerEnv, getSpotifyServerEnv } from "@/lib/config/env";

/** HttpOnly OAuth state cookie (set/read only in Spotify API routes). */
export const SPOTIFY_OAUTH_STATE_COOKIE = "spotify_oauth_state";

/** Granted read scopes only — NO playlist-write scopes yet. */
export const SPOTIFY_SCOPES_PHASE_4A = [
  "playlist-read-private",
  "playlist-read-collaborative",
] as const;

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";

export type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string | undefined;
  token_type?: string | undefined;
  scope?: string | undefined;
  expires_in: number;
};

export type SpotifyMeResponse = {
  id: string;
  display_name: string | null;
};

/** Lazily resolve env so non-Spotify routes do not blow up Supabase middleware. */
export function assertSpotifyServerEnvConfigured(): SpotifyServerEnv {
  return getSpotifyServerEnv();
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

/** Build `/authorize` URL for first leg of Spotify OAuth PKCE-less confidential client flow (Phase 4A local dev). */
export function buildSpotifyAuthorizeUrl(opts: {
  env: SpotifyServerEnv;
  state: string;
}): string {
  const { env, state } = opts;
  const params = new URLSearchParams({
    client_id: env.clientId,
    response_type: "code",
    redirect_uri: env.redirectUri,
    scope: [...SPOTIFY_SCOPES_PHASE_4A].join(" "),
    state,
    show_dialog: "false",
  });
  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeSpotifyAuthorizationCode(
  env: SpotifyServerEnv,
  code: string,
): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.redirectUri,
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[spotify] token exchange failed (${res.status}): ${text.slice(0, 260)}`,
    );
  }

  return (await res.json()) as SpotifyTokenResponse;
}

export async function fetchSpotifyMeProfile(accessToken: string): Promise<SpotifyMeResponse> {
  const res = await fetch(SPOTIFY_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[spotify] /v1/me failed (${res.status}): ${text.slice(0, 260)}`,
    );
  }

  return (await res.json()) as SpotifyMeResponse;
}

/** Spotify may omit `refresh_token` on refresh — keep the previous refresh token when absent. */
export async function refreshSpotifyAccessToken(
  env: SpotifyServerEnv,
  refreshToken: string,
): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[spotify] token refresh failed (${res.status}): ${text.slice(0, 260)}`,
    );
  }

  return (await res.json()) as SpotifyTokenResponse;
}

export function spotifyExpiryIsoFromNow(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
