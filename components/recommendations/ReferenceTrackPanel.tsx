"use client";

import type { LoadedTransitionBoardReference } from "@/lib/recommendations/transition-board-types";
import { spotifyTrackOpenUrl } from "@/lib/utils/spotify-open-url";
import { cn } from "@/lib/utils/class-names";

function formatScalar(n: number | null, decimals: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

function TagCluster({
  label,
  values,
}: {
  label: string;
  values: readonly string[];
}) {
  if (values.length === 0) {
    return (
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</p>
        <p className="mt-1 text-xs text-zinc-500">—</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-1">
        {values.slice(0, 12).map((t) => (
          <li
            key={`${label}-${t}`}
            className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5 text-[11px] text-zinc-300"
          >
            {t}
          </li>
        ))}
      </ul>
      {values.length > 12 ? (
        <p className="mt-1 text-[10px] text-zinc-600">+{values.length - 12} more</p>
      ) : null}
    </div>
  );
}

type Props = {
  reference: LoadedTransitionBoardReference;
};

export function ReferenceTrackPanel({ reference }: Props) {
  const spotifyHref = spotifyTrackOpenUrl(reference.spotifyId, undefined);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95",
        "p-4 shadow-lg shadow-black/30 ring-1 ring-inset ring-white/[0.05]",
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-24 w-24 shrink-0 items-center justify-center rounded-lg",
            "border border-zinc-700/80 bg-zinc-950 text-[10px] font-semibold uppercase tracking-wider text-zinc-600",
          )}
          aria-hidden
        >
          Ref
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-violet-400/90">
            Reference track
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-tight tracking-tight text-zinc-50">
            {reference.title}
          </h2>
          <p className="mt-1 truncate text-sm text-zinc-400">{reference.artist}</p>
          {reference.album?.trim() ? (
            <p className="mt-0.5 truncate text-xs text-zinc-600">{reference.album}</p>
          ) : null}
        </div>
      </div>

      {spotifyHref ? (
        <a
          href={spotifyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          Open in Spotify
        </a>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-zinc-800/80 pt-4 text-xs">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-600">BPM</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {formatScalar(reference.intel.bpm, 1)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-zinc-600">Energy</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {formatScalar(reference.intel.energy, 2)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-600">Key</dt>
          <dd className="mt-0.5 font-medium text-zinc-200">
            {reference.intel.key?.trim() ? reference.intel.key : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-600">Camelot</dt>
          <dd className="mt-0.5 font-medium text-zinc-200">
            {reference.intel.camelot?.trim() ? reference.intel.camelot : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-4 border-t border-zinc-800/80 pt-4">
        <TagCluster label="Mood" values={reference.intel.moodTags} />
        <TagCluster label="Themes" values={reference.intel.themes} />
        <TagCluster label="Semantic" values={reference.intel.semanticTags} />
      </div>

      {reference.missingFromCatalogue ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/25 px-3 py-2 text-[11px] text-amber-200/90"
        >
          Track metadata may be incomplete — row missing from catalogue.
        </p>
      ) : null}
    </div>
  );
}
