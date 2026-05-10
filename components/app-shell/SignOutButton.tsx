"use client";

import { signOutAction } from "@/app/(auth)/login/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50"
      >
        Sign out
      </button>
    </form>
  );
}
