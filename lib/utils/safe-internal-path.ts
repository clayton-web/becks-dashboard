/** Same-origin relative path suitable for server `redirect()`. Blocks protocol-relative redirects. */
export function safeInternalNextPath(
  raw: string | undefined,
  fallback = "/dashboard",
): string {
  if (!raw || raw.trim() === "") {
    return fallback;
  }
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//")) {
    return fallback;
  }
  return v;
}
