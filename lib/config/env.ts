/**
 * Centralized environment reads with clear failure messages for missing prod config.
 * Client-safe: only `NEXT_PUBLIC_*` values are returned from public getters.
 *
 * Required (server-only) for Spotify token read/refresh and future catalogue imports:
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
 * Service role key — required for server routes that read OAuth tokens or write catalogue rows.
 */
export function getSupabaseServiceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
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

/** Gemini Developer API key — server routes only; never expose to the browser. */
export function getGeminiApiKey(): string {
  return required("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
}

/** Fast model id for semantic tagging; override via GEMINI_MODEL when names shift. */
export function getGeminiModel(): string {
  const raw = process.env.GEMINI_MODEL?.trim();
  if (raw) return raw;
  return "gemini-3.1-flash-lite";
}