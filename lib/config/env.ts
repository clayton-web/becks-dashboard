/**
 * Centralized environment reads with clear failure messages for missing prod config.
 * Client-safe: only `NEXT_PUBLIC_*` values are returned from public getters.
 *
 * Optional (server-only, future phases):
 * - `SUPABASE_SERVICE_ROLE_KEY` — never import into client code or `use client` modules.
 */

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `[env] Missing required environment variable "${name}". Add it to .env.local (see .env.example).`,
    );
  }
  return trimmed;
}

export type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Supabase URL + anon (publishable) key for browser, middleware, and server user-scoped clients.
 */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/**
 * Service role key for trusted server jobs only (imports, reconciliation). Optional until used.
 */
export function getOptionalServiceRoleKey(): string | undefined {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return v || undefined;
}

/** Server-side Spotify OAuth credentials; never expose to client bundles or `use client`. */
export type SpotifyServerEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getSpotifyServerEnv(): SpotifyServerEnv {
  return {
    clientId: required("SPOTIFY_CLIENT_ID", process.env.SPOTIFY_CLIENT_ID),
    clientSecret: required(
      "SPOTIFY_CLIENT_SECRET",
      process.env.SPOTIFY_CLIENT_SECRET,
    ),
    redirectUri: required(
      "SPOTIFY_REDIRECT_URI",
      process.env.SPOTIFY_REDIRECT_URI,
    ),
  };
}