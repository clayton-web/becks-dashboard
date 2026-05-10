"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalNextPath } from "@/lib/utils/safe-internal-path";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectRaw = formData.get("redirectTo");
  const nextPath = safeInternalNextPath(
    typeof redirectRaw === "string" ? redirectRaw : undefined,
  );

  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
