import Link from "next/link";
import { notFound } from "next/navigation";

import { CrateTracksTable } from "@/components/features/CrateTracksTable";
import { getCrateDetailForCurrentUser } from "@/lib/data/crates";
import { cn } from "@/lib/utils/class-names";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ crateId: string }>;
};

const dateFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function sourceLabel(source: string): string {
  const s = source.trim().toLowerCase();
  if (s === "spotify") return "Spotify";
  return source;
}

export default async function CrateDetailPage({ params }: PageProps) {
  const { crateId } = await params;
  const result = await getCrateDetailForCurrentUser(crateId);

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound();
    }
    if ("error" in result) {
      return (
        <div className="flex flex-col gap-8">
          <Link
            href="/crates"
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            ← Crates
          </Link>
          <p
            role="alert"
            className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
          >
            Could not load crate: {result.error}
          </p>
        </div>
      );
    }
    notFound();
  }

  const { crate, tracks } = result;
  const updated = dateFmt.format(new Date(crate.updated_at));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/crates"
          className="text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          ← Crates
        </Link>
        <header className="mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {crate.name}
            </h1>
            <span
              className={cn(
                "shrink-0 rounded-md border border-zinc-700/80 bg-zinc-800/50",
                "px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400",
              )}
            >
              {sourceLabel(crate.source)}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {crate.trackCount} {crate.trackCount === 1 ? "track" : "tracks"} ·
            updated {updated}
            {crate.created_at !== crate.updated_at ? (
              <span>
                {" "}
                · created {dateFmt.format(new Date(crate.created_at))}
              </span>
            ) : null}
          </p>
          {crate.description?.trim() ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
              {crate.description}
            </p>
          ) : null}
        </header>
      </div>

      <section aria-labelledby="tracks-heading">
        <h2
          id="tracks-heading"
          className="mb-3 text-sm font-medium text-zinc-300"
        >
          Tracks
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          From your internal catalogue only — positions follow the imported
          playlist order.
        </p>
        <CrateTracksTable tracks={tracks} crateId={crate.id} />
      </section>
    </div>
  );
}
