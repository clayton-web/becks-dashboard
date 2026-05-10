import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/config/env";
import type { Database } from "@/types/supabase";

/**
 * Bypasses RLS. Use only in Route Handlers / Server Actions after verifying
 * `auth.uid()` via the cookie-bound user client, then scope queries by that id.
 * Never import this module from client bundles.
 */
export function createSupabaseServiceRoleClient() {
  const { url } = getPublicSupabaseEnv();
  const serviceKey = getSupabaseServiceRoleKey();
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
