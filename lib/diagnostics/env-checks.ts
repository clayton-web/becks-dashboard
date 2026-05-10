import "server-only";

import {
  getGeminiModel,
  getSpotifyServerEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/config/env";

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export type ServerEnvChecklist = {
  nextPublicSupabaseUrl: boolean;
  nextPublicSupabaseAnonKey: boolean;
  nextPublicSiteUrl: boolean;
  publicSiteUrl: string | null;
  supabaseServiceRoleKey: boolean;
  spotifyClientId: boolean;
  spotifyClientSecret: boolean;
  spotifyRedirectUri: boolean;
  spotifyBundleOk: boolean;
  /** Server-only Gemini key — presence only for semantic enrichment APIs. */
  geminiApiKey: boolean;
  /** Whether GEMINI_MODEL was overridden (effective id is exposed separately — not a secret). */
  geminiModelOverrideSet: boolean;
  /** Resolved model id (default or GEMINI_MODEL). Not the API key. */
  geminiEffectiveModelId: string;
};

/** Presence-only checks — never expose secret values. */
export function getServerEnvChecklist(): ServerEnvChecklist {
  const spotifyId = isSet(process.env.SPOTIFY_CLIENT_ID);
  const spotifySecret = isSet(process.env.SPOTIFY_CLIENT_SECRET);
  const spotifyRedirect = isSet(process.env.SPOTIFY_REDIRECT_URI);

  let spotifyBundleOk = false;
  try {
    getSpotifyServerEnv();
    spotifyBundleOk = true;
  } catch {
    spotifyBundleOk = false;
  }

  let serviceRoleOk = false;
  try {
    getSupabaseServiceRoleKey();
    serviceRoleOk = true;
  } catch {
    serviceRoleOk = false;
  }

  return {
    nextPublicSupabaseUrl: isSet(process.env.NEXT_PUBLIC_SUPABASE_URL),
    nextPublicSupabaseAnonKey: isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nextPublicSiteUrl: isSet(process.env.NEXT_PUBLIC_SITE_URL),
    publicSiteUrl: isSet(process.env.NEXT_PUBLIC_SITE_URL)
      ? process.env.NEXT_PUBLIC_SITE_URL!.trim()
      : null,
    supabaseServiceRoleKey: serviceRoleOk,
    spotifyClientId: spotifyId,
    spotifyClientSecret: spotifySecret,
    spotifyRedirectUri: spotifyRedirect,
    spotifyBundleOk,
    geminiApiKey: isSet(process.env.GEMINI_API_KEY),
    geminiModelOverrideSet: isSet(process.env.GEMINI_MODEL),
    geminiEffectiveModelId: getGeminiModel(),
  };
}

export function expectedSpotifyCallbackUrl(siteUrl: string | null): string | null {
  if (!siteUrl?.trim()) return null;
  try {
    const u = new URL(siteUrl.trim());
    u.pathname = "/api/spotify/callback";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
