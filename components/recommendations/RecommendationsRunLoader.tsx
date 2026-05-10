"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getTransitionBoardRun } from "@/lib/recommendations/board-api";
import { getSavedTransitionKeysForRun } from "@/lib/recommendations/saved-api";
import type { LoadedTransitionBoardAnalysis } from "@/lib/recommendations/transition-board-types";
import { TransitionBoardView } from "@/components/recommendations/TransitionBoardView";
import { cn } from "@/lib/utils/class-names";

type Props = {
  runId: string;
};

export function RecommendationsRunLoader({ runId }: Props) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [analysis, setAnalysis] = useState<LoadedTransitionBoardAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const onMarkSaved = useCallback((key: string) => {
    setSavedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const id = runId.trim();
    if (!id) {
      setPhase("error");
      setErrorMessage("Missing run id.");
      return;
    }

    const ac = new AbortController();
    setPhase("loading");
    setErrorMessage(null);

    void (async () => {
      const res = await getTransitionBoardRun(id, ac.signal);
      if (ac.signal.aborted) return;

      if (!res.ok) {
        setPhase("error");
        const msg =
          res.body &&
          typeof res.body === "object" &&
          "message" in res.body &&
          typeof (res.body as { message: unknown }).message === "string"
            ? (res.body as { message: string }).message
            : `Could not load run (${res.status}).`;
        setErrorMessage(msg);
        return;
      }

      setAnalysis(res.analysis);
      setPhase("ready");
    })();

    return () => ac.abort();
  }, [runId]);

  useEffect(() => {
    if (!analysis?.runId) {
      setSavedKeys(new Set());
      return;
    }

    const ac = new AbortController();
    void (async () => {
      const res = await getSavedTransitionKeysForRun(analysis.runId, ac.signal);
      if (ac.signal.aborted) return;
      setSavedKeys(res.ok ? new Set(res.keys) : new Set());
    })();

    return () => ac.abort();
  }, [analysis?.runId]);

  if (phase === "loading") {
    return (
      <section
        className={cn(
          "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-6 py-16 text-center",
          "ring-1 ring-inset ring-white/5",
        )}
        aria-busy
        aria-live="polite"
      >
        <p className="text-sm font-medium text-zinc-200">Loading board…</p>
        <p className="mt-2 text-xs text-zinc-500">Fetching persisted analysis run.</p>
      </section>
    );
  }

  if (phase === "error" && errorMessage) {
    return (
      <section
        role="alert"
        className="rounded-xl border border-red-500/35 bg-red-950/30 px-6 py-5 text-sm text-red-100"
      >
        <p className="font-medium">Board unavailable</p>
        <p className="mt-2 text-xs leading-relaxed text-red-100/85">{errorMessage}</p>
        <Link
          href="/recommendations"
          className="mt-4 inline-block text-xs font-medium text-violet-300 hover:text-violet-200"
        >
          Back to board home
        </Link>
      </section>
    );
  }

  if (phase === "ready" && analysis) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
              Reference board
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
              Transition directions
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/recommendations/saved"
              className="text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              Saved paths
            </Link>
            <Link
              href="/recommendations"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
            >
              New analysis
            </Link>
          </div>
        </div>
        <TransitionBoardView
          analysis={analysis}
          boardSave={{
            analysisRunId: analysis.runId,
            savedKeys,
            onMarkSaved,
          }}
        />
      </div>
    );
  }

  return null;
}
