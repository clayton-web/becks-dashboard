import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/config/site";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-violet-900/50"
            >
              Open workspace
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-zinc-800/70 py-6 text-center text-xs text-zinc-600">
        {SITE_DESCRIPTION}
      </footer>
    </div>
  );
}
