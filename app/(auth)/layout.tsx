import type { ReactNode } from "react";

/** Login checks session; defer prerender until request time (needs Supabase URL + anon key). */
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
