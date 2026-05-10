import Link from "next/link";

import { cn } from "@/lib/utils/class-names";

type Props = {
  trackId: string;
  crateId: string;
  className?: string;
};

/** Deep-link into the board hub with a reference track (user runs analysis explicitly). */
export function AnalyzeReferenceTrackButton({ trackId, crateId, className }: Props) {
  const href = `/recommendations?trackId=${encodeURIComponent(trackId)}&crateId=${encodeURIComponent(crateId)}`;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-md border border-violet-600/40 bg-violet-950/35",
        "px-2.5 py-1 text-xs font-semibold text-violet-200 transition-colors",
        "hover:border-violet-500/55 hover:bg-violet-900/40 hover:text-white",
        className,
      )}
    >
      Open board
    </Link>
  );
}
