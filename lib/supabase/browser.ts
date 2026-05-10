"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

import { getPublicSupabaseEnv } from "@/lib/config/env";

/**
 * Browser Supabase client for Client Components (realtime, client-only flows).
 * Creates a new instance per call; avoid sharing across tabs manually.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
