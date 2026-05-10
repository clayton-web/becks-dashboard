"use client";

import Link from "next/link";

import type {
  LoadedTransitionBoardAnalysis,
  TransitionBoardSaveChrome,
} from "@/lib/recommendations/transition-board-types";
import { DirectionBoard } from "@/components/recommendations/DirectionBoard";
import { ReferenceTrackPanel } from "@/components/recommendations/ReferenceTrackPanel";
import { cn } from "@/lib/utils/class-names";

const createdFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type Props = {
  analysis: LoadedTransitionBoardAnalysis;
  boardSave?: TransitionBoardSaveChrome;
};

export function TransitionBoardView({ analysis, boardSave }: Props) {
  const snap = analysis.inputSnapshot;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <aside
          className={cn(
            "w-full shrink-0 xl:sticky xl:top-0 xl:z-10 xl:w-[22rem] xl:self-start",
            "xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1",
          )}
        >
          {analysis.reference ? (
            <ReferenceTrackPanel reference={analysis.reference} />
          ) : (
            <div
              className={cn(
                "rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6",
                "ring-1 ring-inset ring-white/[0.04]",
              )}
              role="status"
            >
              <p className="text-sm font-medium text-zinc-300">Reference unavailable</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                This run has no linked reference track id, or the row could not be resolved.
                Direction columns still reflect stored recommendations.
              </p>
            </div>
          )}
        </aside>

        <div className="min-h-0 min-w-0 flex-1">
          <DirectionBoard analysis={analysis} boardSave={boardSave} />
        </div>
      </div>

      <footer className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-[11px] text-zinc-500 ring-1 ring-inset ring-white/[0.03]">
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 border-b border-zinc-800/60 pb-2">
          <Link
            href="/recommendations/saved"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            Saved paths
          </Link>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-600">
            Export individual transitions from each card, or open Saved paths for bulk copy / CSV.
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span>
            <span className="text-zinc-600">Run</span>{" "}
            <span className="font-mono text-zinc-400">{analysis.runId}</span>
          </span>
          <span>
            <span className="text-zinc-600">Rules</span>{" "}
            <span className="text-zinc-400">{analysis.rulesVersion}</span>
          </span>
          <span>
            <span className="text-zinc-600">Created</span>{" "}
            <span className="text-zinc-400">{createdFmt.format(new Date(analysis.createdAt))}</span>
          </span>
          {snap ? (
            <>
              <span>
                <span className="text-zinc-600">Pool</span>{" "}
                <span className="text-zinc-400">
                  {snap.candidates_loaded} loaded · {snap.total_eligible_before_cap} eligible before cap
                  {snap.pool_truncated ? " · truncated" : ""}
                </span>
              </span>
              <span>
                <span className="text-zinc-600">Caps</span>{" "}
                <span className="text-zinc-400">
                  max {snap.max_candidates} candidates · {snap.max_per_direction} per direction
                </span>
              </span>
              <span>
                <span className="text-zinc-600">Crates</span>{" "}
                <span className="text-zinc-400">
                  {snap.crate_scope_ids === null
                    ? "All crates"
                    : snap.crate_scope_ids.length === 0
                      ? "Empty scope"
                      : `${snap.crate_scope_ids.length} scoped`}
                </span>
              </span>
            </>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
