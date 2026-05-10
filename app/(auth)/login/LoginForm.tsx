"use client";

import { useActionState } from "react";

import { loginAction, type LoginActionState } from "./actions";

type LoginFormProps = {
  defaultNextPath: string;
};

export function LoginForm({ defaultNextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<
    LoginActionState | undefined,
    FormData
  >(loginAction, undefined);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={defaultNextPath} />
      {state?.error ? (
        <p
          className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Email</span>
        <input
          type="email"
          name="email"
          placeholder="you@studio.local"
          autoComplete="username"
          required
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-400">Password</span>
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}
