"use client";

import type {
  LoadedTransitionBoardDirection,
  TransitionBoardSaveChrome,
} from "@/lib/recommendations/transition-board-types";
import { RecommendationTrackCard } from "@/components/recommendations/RecommendationTrackCard";
import { cn } from "@/lib/utils/class-names";

type Props = {
  direction: LoadedTransitionBoardDirection;
  boardSave?: TransitionBoardSaveChrome;
};

export function DirectionColumn({ direction, boardSave }: Props) {
  const empty = direction.results.length === 0;

  return (
    <section
      className={cn(
        "flex w-[17.5rem] shrink-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/60",
        "ring-1 ring-inset ring-violet-500/[0.06]",
      )}
      aria-labelledby={`dir-${direction.directionId}-title`}
    >
      <header className="border-b border-zinc-800/80 px-3 py-3">
        <h3
          id={`dir-${direction.directionId}-title`}
          className="text-sm font-semibold tracking-tight text-zinc-100"
        >
          {direction.title}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-500">{direction.purpose}</p>
      </header>

      <div className="flex max-h-[min(70vh,42rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-10 text-center">
            <p className="text-xs font-medium text-zinc-500">No matches in pool</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
              Nothing ranked for this direction with current crates and caps.
            </p>
          </div>
        ) : (
          direction.results.map((row) => (
            <RecommendationTrackCard
              key={`${direction.directionId}-${row.track.trackId}`}
              row={row}
              boardSave={
                boardSave
                  ? { ...boardSave, directionId: direction.directionId }
                  : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
