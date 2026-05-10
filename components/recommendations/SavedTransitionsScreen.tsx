"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getSavedTransitionsList } from "@/lib/recommendations/saved-api";
import {
  formatSavedTransitionsCsv,
  formatSavedTransitionsPlainText,
  savedListItemToExportRow,
} from "@/lib/recommendations/saved-export";
import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";
import { SavedTransitionsList } from "@/components/recommendations/SavedTransitionsList";
import { cn } from "@/lib/utils/class-names";

export function SavedTransitionsScreen() {
  const [items, setItems] = useState<SavedTransitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFlash, setExportFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getSavedTransitionsList();
    setLoading(false);
    if (res.ok) setItems(res.items);
    else setItems([]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportRows = items.map(savedListItemToExportRow);

  async function copyAllText() {
    const text = formatSavedTransitionsPlainText(exportRows);
    try {
      await navigator.clipboard.writeText(text);
      setExportFlash("copied-text");
      window.setTimeout(() => setExportFlash(null), 2000);
    } catch {
      setExportFlash("clipboard-blocked");
      window.setTimeout(() => setExportFlash(null), 3200);
    }
  }

  function downloadCsv() {
    const csv = formatSavedTransitionsCsv(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saved-transitions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportFlash("csv");
    window.setTimeout(() => setExportFlash(null), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Saved paths
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            Transition bookmarks
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Frozen snapshots from board runs — explanations and facts stay attached even when scoring
            rules evolve. Export as text or CSV for prep sheets or gig notes.
          </p>
        </div>
        <Link
          href="/recommendations"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          ← Board hub
        </Link>
      </header>

      {!loading && items.length > 0 ? (
        <section
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/30 px-4 py-3",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
            Export
          </span>
          <button
            type="button"
            onClick={() => void copyAllText()}
            className="rounded-lg border border-zinc-700/90 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Copy all as text
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-lg border border-zinc-700/90 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Download CSV
          </button>
          {exportFlash === "copied-text" ? (
            <span className="text-[11px] text-emerald-400/90">Copied to clipboard.</span>
          ) : null}
          {exportFlash === "clipboard-blocked" ? (
            <span className="text-[11px] text-amber-400/90">
              Clipboard unavailable — check browser permissions.
            </span>
          ) : null}
          {exportFlash === "csv" ? (
            <span className="text-[11px] text-emerald-400/90">CSV downloaded.</span>
          ) : null}
        </section>
      ) : null}

      <SavedTransitionsList items={items} loading={loading} onRefresh={refresh} />
    </div>
  );
}
