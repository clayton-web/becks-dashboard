import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/supabase";

import { getPublicSupabaseEnv } from "@/lib/config/env";
import { isAppProtectedPath } from "@/lib/config/protected-paths";

export async function middleware(request: NextRequest) {
  const { url: supabaseUrl, anonKey } = getPublicSupabaseEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user && isAppProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
