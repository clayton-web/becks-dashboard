"use client";

import type {
  LoadedTransitionBoardAnalysis,
  TransitionBoardSaveChrome,
} from "@/lib/recommendations/transition-board-types";
import { DirectionColumn } from "@/components/recommendations/DirectionColumn";

type Props = {
  analysis: LoadedTransitionBoardAnalysis;
  boardSave?: TransitionBoardSaveChrome;
};

export function DirectionBoard({ analysis, boardSave }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Transition directions
        </p>
        <p className="text-[11px] text-zinc-600">
          Scroll horizontally · stable column order
        </p>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-color:rgba(113,113,122,0.35)_transparent]"
        role="region"
        aria-label="Direction columns"
      >
        {analysis.directions.map((d) => (
          <DirectionColumn key={d.directionId} direction={d} boardSave={boardSave} />
        ))}
      </div>
    </div>
  );
}
