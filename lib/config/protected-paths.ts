/**
 * Paths that require an authenticated Supabase session.
 * Must stay aligned with `app/(app)/*` routes.
 */
export const APP_PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/library",
  "/crates",
  "/analysis",
  "/settings",
] as const;

export function isAppProtectedPath(pathname: string): boolean {
  return APP_PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
