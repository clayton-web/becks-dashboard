import Link from "next/link";
import { redirect } from "next/navigation";

import { SITE_NAME } from "@/lib/config/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalNextPath } from "@/lib/utils/safe-internal-path";

import { LoginForm } from "./LoginForm";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const defaultNextPath = safeInternalNextPath(
    typeof sp.next === "string" ? sp.next : undefined,
  );

  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-8 ring-1 ring-inset ring-white/5 backdrop-blur-sm">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
        Log in
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign in with your Supabase email and password account for{" "}
        <span className="text-zinc-300">{SITE_NAME}</span>.
      </p>
      <LoginForm defaultNextPath={defaultNextPath} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/" className="text-violet-400 hover:text-violet-300">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
