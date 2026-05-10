"use client";

import type {
  LoadedTransitionBoardRow,
  TransitionBoardSaveChrome,
} from "@/lib/recommendations/transition-board-types";
import { sanitizeBoardText } from "@/lib/recommendations/board-display";
import { savedTransitionCompositeKey } from "@/lib/recommendations/saved-transition-keys";
import { RecommendationFactsRow } from "@/components/recommendations/RecommendationFactsRow";
import { SaveTransitionButton } from "@/components/recommendations/SaveTransitionButton";
import { cn } from "@/lib/utils/class-names";

type Props = {
  row: LoadedTransitionBoardRow;
  boardSave?: TransitionBoardSaveChrome & { directionId: string };
};

export function RecommendationTrackCard({ row, boardSave }: Props) {
  const explanation = sanitizeBoardText(row.explanation);
  const { track } = row;

  const compositeKey =
    boardSave != null
      ? savedTransitionCompositeKey(boardSave.directionId, track.trackId)
      : null;
  const initiallySaved =
    boardSave != null && compositeKey != null
      ? boardSave.savedKeys.has(compositeKey)
      : false;

  return (
    <article
      className={cn(
        "rounded-lg border border-zinc-800/90 bg-zinc-900/50 p-3 shadow-inner shadow-black/20",
        "ring-1 ring-inset ring-white/[0.04]",
        track.missingFromCatalogue && "border-amber-900/40 bg-amber-950/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-zinc-800/90 px-1.5 text-[11px] font-semibold tabular-nums text-violet-300"
              aria-label={`Rank ${row.rank}`}
            >
              #{row.rank}
            </span>
            <h4 className="truncate text-sm font-semibold text-zinc-100">
              {track.title}
            </h4>
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{track.artist}</p>
          {track.missingFromCatalogue ? (
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
              Removed from catalogue — id retained for audit
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums text-emerald-400/95">
            {row.score}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">score</p>
        </div>
      </div>

      <RecommendationFactsRow facts={row.facts} className="mt-3 border-t border-zinc-800/80 pt-2" />

      {explanation ? (
        <p className="mt-2 border-t border-zinc-800/70 pt-2 text-xs leading-relaxed text-zinc-400">
          {explanation}
        </p>
      ) : (
        <p className="mt-2 border-t border-zinc-800/70 pt-2 text-xs italic text-zinc-600">
          No explanation stored for this row.
        </p>
      )}

      {boardSave && compositeKey ? (
        <SaveTransitionButton
          analysisRunId={boardSave.analysisRunId}
          directionId={boardSave.directionId}
          candidateTrackId={track.trackId}
          initiallySaved={initiallySaved}
          onSaved={() => boardSave.onMarkSaved(compositeKey)}
        />
      ) : null}
    </article>
  );
}
