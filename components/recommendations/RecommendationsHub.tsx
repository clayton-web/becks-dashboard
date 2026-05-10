"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { postAnalyzeReference } from "@/lib/recommendations/board-api";
import { cn } from "@/lib/utils/class-names";

type Props = {
  initialTrackId: string | null;
  initialCrateId: string | null;
};

export function RecommendationsHub({ initialTrackId, initialCrateId }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "analyzing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAnalyze = useCallback(async () => {
    if (!initialTrackId?.trim()) return;

    setPhase("analyzing");
    setErrorMessage(null);

    const crateIds =
      initialCrateId && initialCrateId.length > 0 ? [initialCrateId] : undefined;

    const result = await postAnalyzeReference({
      referenceTrackId: initialTrackId.trim(),
      crateIds,
    });

    if (!result.ok) {
      setPhase("error");
      const msg =
        result.body.message ??
        result.body.error ??
        `Request failed (${result.status}).`;
      setErrorMessage(msg);
      return;
    }

    router.replace(`/recommendations/${result.runId}`);
  }, [initialTrackId, initialCrateId, router]);

  const hasTrack = Boolean(initialTrackId?.trim());

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
          Reference board
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          Transition intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Pick a reference track from your crates. We score deterministic directions side-by-side so
          you can decide where to take the room next — not an autoplay list.
        </p>
        <p className="mt-3">
          <Link
            href="/recommendations/saved"
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            Saved paths
          </Link>
        </p>
      </header>

      {hasTrack ? (
        <section
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-6 py-8",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <p className="text-sm font-medium text-zinc-200">Reference track ready</p>
          <p className="mt-2 font-mono text-xs text-zinc-500">{initialTrackId}</p>
          {initialCrateId ? (
            <Link
              href={`/crates/${encodeURIComponent(initialCrateId)}`}
              className="mt-3 inline-block text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              ← Back to crate
            </Link>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runAnalyze()}
              disabled={phase === "analyzing"}
              className={cn(
                "rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white",
                "transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {phase === "analyzing" ? "Analyzing…" : "Run transition board"}
            </button>
          </div>

          {phase === "analyzing" ? (
            <p className="mt-4 text-xs text-zinc-500" aria-live="polite">
              Querying your crate pool, scoring directions, persisting run…
            </p>
          ) : null}
        </section>
      ) : null}

      {phase === "error" && errorMessage ? (
        <section
          role="alert"
          className="rounded-xl border border-red-500/35 bg-red-950/30 px-6 py-5 text-sm text-red-100"
        >
          <p className="font-medium">Could not analyze this track</p>
          <p className="mt-2 text-xs leading-relaxed text-red-100/85">{errorMessage}</p>
          <Link
            href="/crates"
            className="mt-4 inline-block text-xs font-medium text-violet-300 hover:text-violet-200"
          >
            Back to crates
          </Link>
        </section>
      ) : null}

      {!hasTrack ? (
        <section
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/25 px-6 py-10",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <p className="text-sm font-medium text-zinc-300">No reference selected</p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
            Open a crate and choose <span className="text-zinc-400">Open board</span> on any track,
            or open a saved run URL (
            <span className="font-mono text-zinc-400">/recommendations/&lt;runId&gt;</span>).
          </p>
          <Link
            href="/crates"
            className={cn(
              "mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white",
              "transition-colors hover:bg-violet-500",
            )}
          >
            Browse crates
          </Link>
        </section>
      ) : null}
    </div>
  );
}
