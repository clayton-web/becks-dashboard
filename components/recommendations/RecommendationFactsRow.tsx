"use client";

import type { DirectionScoreFacts } from "@/lib/recommendations/scoring-core";
import {
  formatBpmDelta,
  formatCamelotSteps,
  formatEnergyDelta,
  formatSemanticShiftLine,
} from "@/lib/recommendations/board-display";
import { cn } from "@/lib/utils/class-names";

type Props = {
  facts: DirectionScoreFacts;
  className?: string;
};

export function RecommendationFactsRow({ facts, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug text-zinc-400",
        className,
      )}
    >
      <div>
        <span className="text-zinc-600">BPM Δ</span>{" "}
        <span className="font-medium tabular-nums text-zinc-300">
          {formatBpmDelta(facts.bpmDelta)}
        </span>
      </div>
      <div>
        <span className="text-zinc-600">Key</span>{" "}
        <span className="font-medium text-zinc-300">
          {formatCamelotSteps(facts.camelotDistance)}
        </span>
      </div>
      <div>
        <span className="text-zinc-600">Energy Δ</span>{" "}
        <span className="font-medium tabular-nums text-zinc-300">
          {formatEnergyDelta(facts.energyDelta)}
        </span>
      </div>
      <div className="col-span-2 min-w-0">
        <span className="text-zinc-600">Shift</span>{" "}
        <span className="font-medium text-zinc-300">
          {formatSemanticShiftLine(facts)}
        </span>
      </div>
    </div>
  );
}
