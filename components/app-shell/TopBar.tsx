import Link from "next/link";

import { SignOutButton } from "@/components/app-shell/SignOutButton";
import { SITE_NAME } from "@/lib/config/site";

type TopBarProps = {
  userEmail: string;
};

function avatarInitials(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const cleaned = localPart.replace(/[^a-zA-Z0-9]/g, "");
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2).toUpperCase();
  }
  return localPart.slice(0, 2).toUpperCase() || "DJ";
}

export function TopBar({ userEmail }: TopBarProps) {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-800/80 bg-zinc-950/60 px-6 backdrop-blur-sm"
      role="banner"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <Link
          href="/dashboard"
          className="shrink-0 text-sm font-semibold tracking-tight text-zinc-100 transition-colors hover:text-violet-300"
        >
          {SITE_NAME}
        </Link>
        <span className="hidden text-xs text-zinc-600 sm:inline">/</span>
        <span className="hidden truncate text-xs text-zinc-500 sm:inline md:max-w-[14rem]">
          Playlist intelligence core
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="max-w-[42vw] truncate text-xs text-zinc-400 sm:max-w-[14rem]" title={userEmail}>
          {userEmail}
        </span>
        <span
          className="flex h-8 min-w-[2rem] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-1 text-[10px] font-semibold uppercase text-zinc-300"
          title={userEmail}
          aria-hidden
        >
          {avatarInitials(userEmail)}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
