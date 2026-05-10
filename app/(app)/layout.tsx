import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Auth-aware layout reads cookies; avoid static prerender without env (e.g. local `next build`). */
export const dynamic = "force-dynamic";

export default async function AppAreaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? null;
  if (!email) {
    redirect("/login");
  }

  return <AppShell userEmail={email}>{children}</AppShell>;
}
