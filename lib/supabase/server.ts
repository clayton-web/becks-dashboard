import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

import { getPublicSupabaseEnv } from "@/lib/config/env";

/**
 * Server Supabase client — use in Server Components, Route Handlers, and Server Actions.
 * Relies on middleware to keep auth cookies fresh.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that cannot mutate cookies; middleware already refreshed.
        }
      },
    },
  });
}
