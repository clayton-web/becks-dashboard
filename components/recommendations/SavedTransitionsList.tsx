"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { sanitizeBoardText } from "@/lib/recommendations/board-display";
import {
  deleteSavedTransitionClient,
  patchSavedTransitionNoteClient,
} from "@/lib/recommendations/saved-api";
import {
  formatSavedTransitionPlainText,
  savedListItemToExportRow,
} from "@/lib/recommendations/saved-export";
import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";
import { RecommendationFactsRow } from "@/components/recommendations/RecommendationFactsRow";
import { cn } from "@/lib/utils/class-names";

type Props = {
  items: SavedTransitionListItem[];
  loading: boolean;
  onRefresh: () => void;
};

export function SavedTransitionsList({ items, loading, onRefresh }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copyFlashId, setCopyFlashId] = useState<string | null>(null);

  const copyRow = useCallback(async (item: SavedTransitionListItem) => {
    const text = formatSavedTransitionPlainText(savedListItemToExportRow(item));
    try {
      await navigator.clipboard.writeText(text);
      setCopyFlashId(item.id);
      window.setTimeout(() => setCopyFlashId((cur) => (cur === item.id ? null : cur)), 1800);
    } catch {
      /* clipboard denied — ignore */
    }
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setBusyId(id);
      const res = await deleteSavedTransitionClient(id);
      setBusyId(null);
      if (res.ok) onRefresh();
    },
    [onRefresh],
  );

  const saveNote = useCallback(async (id: string, raw: string) => {
    const note = raw.trim() === "" ? null : raw.trim();
    await patchSavedTransitionNoteClient(id, note);
  }, []);

  if (loading) {
    return (
      <section
        className={cn(
          "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-6 py-16 text-center",
          "ring-1 ring-inset ring-white/5",
        )}
        aria-busy
      >
        <p className="text-sm text-zinc-400">Loading saved transitions…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className={cn(
          "rounded-xl border border-zinc-800/90 bg-zinc-900/25 px-6 py-14 text-center",
          "ring-1 ring-inset ring-white/5",
        )}
      >
        <p className="text-sm font-medium text-zinc-300">Nothing saved yet</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          From a board run, use <span className="text-zinc-400">Save transition</span> on a card to pin
          that movement for later — not a playlist, just your DJ notes.
        </p>
        <Link
          href="/recommendations"
          className="mt-6 inline-block text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          Open board hub
        </Link>
      </section>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4",
            "ring-1 ring-inset ring-white/[0.04]",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-400/90">
                {item.directionLabel}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Reference{" "}
                <span className="text-zinc-300">
                  {item.referenceDisplay.title}
                  {item.referenceDisplay.artist ? ` — ${item.referenceDisplay.artist}` : ""}
                </span>
                {item.referenceDisplay.missingFromCatalogue ? (
                  <span className="ml-1 text-amber-500/90">(catalogue)</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">
                → {item.candidateDisplay.title}
                {item.candidateDisplay.artist ? (
                  <span className="font-normal text-zinc-400"> — {item.candidateDisplay.artist}</span>
                ) : null}
                {item.candidateDisplay.missingFromCatalogue ? (
                  <span className="ml-2 text-[10px] font-medium uppercase text-amber-500/90">
                    Missing row
                  </span>
                ) : null}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-emerald-400/95">{item.score}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                rank #{item.rankAtSave}
              </p>
            </div>
          </div>

          <RecommendationFactsRow facts={item.factsSnapshot} className="mt-3" />

          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            {sanitizeBoardText(item.explanation) || "—"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
            <button
              type="button"
              onClick={() => void copyRow(item)}
              className="rounded-md border border-zinc-700/90 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              {copyFlashId === item.id ? "Copied" : "Copy summary"}
            </button>
            <Link
              href={`/recommendations/${encodeURIComponent(item.analysisRunId)}`}
              className="rounded-md border border-zinc-700/90 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-zinc-900"
            >
              Open run
            </Link>
            <button
              type="button"
              disabled={busyId === item.id}
              onClick={() => void remove(item.id)}
              className="rounded-md border border-red-900/50 bg-red-950/25 px-2.5 py-1 text-[11px] font-semibold text-red-200/90 hover:bg-red-950/40 disabled:opacity-50"
            >
              Remove
            </button>
          </div>

          <label className="mt-3 block">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              Note
            </span>
            <textarea
              defaultValue={item.userNote ?? ""}
              rows={2}
              placeholder="Optional cue for your future self…"
              className={cn(
                "mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200",
                "placeholder:text-zinc-600 focus:border-violet-600/50 focus:outline-none focus:ring-1 focus:ring-violet-600/30",
              )}
              onBlur={(e) => {
                const next = e.target.value.trim();
                const prev = (item.userNote ?? "").trim();
                if (next === prev) return;
                void saveNote(item.id, e.target.value);
              }}
            />
          </label>

          <p className="mt-2 text-[10px] text-zinc-600">
            Saved {new Date(item.createdAt).toLocaleString()} · rules {item.rulesVersionAtSave}
          </p>
        </li>
      ))}
    </ul>
  );
}
