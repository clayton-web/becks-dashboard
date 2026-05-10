"use client";

import { useEffect, useState } from "react";

import { postSaveBoardTransition } from "@/lib/recommendations/saved-api";
import { cn } from "@/lib/utils/class-names";

type Props = {
  analysisRunId: string;
  directionId: string;
  candidateTrackId: string;
  initiallySaved: boolean;
  onSaved: () => void;
};

export function SaveTransitionButton({
  analysisRunId,
  directionId,
  candidateTrackId,
  initiallySaved,
  onSaved,
}: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  useEffect(() => {
    if (!hint || hint.startsWith("Could not")) return;
    const id = window.setTimeout(() => setHint(null), 3800);
    return () => window.clearTimeout(id);
  }, [hint]);

  async function handleSave() {
    if (saved || busy) return;
    setBusy(true);
    setHint(null);

    const res = await postSaveBoardTransition({
      analysisRunId,
      directionId,
      candidateTrackId,
    });

    setBusy(false);

    if (!res.ok) {
      setHint(res.message ?? "Could not save.");
      return;
    }

    setSaved(true);
    onSaved();
    if (res.duplicate) {
      setHint("Already in your saved paths.");
    }
  }

  return (
    <div className="mt-2 border-t border-zinc-800/70 pt-2">
      <button
        type="button"
        disabled={saved || busy}
        onClick={() => void handleSave()}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
          saved
            ? "cursor-default border border-emerald-800/60 bg-emerald-950/35 text-emerald-300/95"
            : "border border-zinc-700/90 bg-zinc-900/80 text-zinc-200 hover:border-violet-600/50 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {saved ? "Saved" : busy ? "Saving…" : "Save transition"}
      </button>
      {hint ? (
        <p className="mt-1 text-[10px] leading-snug text-zinc-500" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
