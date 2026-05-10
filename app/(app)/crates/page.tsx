import Link from "next/link";

import { listCratesForCurrentUser } from "@/lib/data/crates";
import { cn } from "@/lib/utils/class-names";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function sourceLabel(source: string): string {
  const s = source.trim().toLowerCase();
  if (s === "spotify") return "Spotify";
  return source;
}

export default async function CratesPage() {
  const result = await listCratesForCurrentUser();

  if (result.ok === false) {
    return (
      <div className="flex flex-col gap-8">
        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Internal library
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
            Crates
          </h1>
        </header>
        <p
          role="alert"
          className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
        >
          Could not load crates: {result.error}
        </p>
      </div>
    );
  }

  const { crates } = result;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
          Internal library
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          Crates
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Playlist imports and manual shortlists in your BECKS workspace — data
          comes from Postgres only (no live Spotify calls here).
        </p>
      </header>

      {crates.length === 0 ? (
        <section
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-8 text-center",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <p className="text-sm text-zinc-300">
            No crates yet. Import a Spotify playlist from{" "}
            <Link
              href="/library"
              className="font-medium text-violet-400 hover:text-violet-300"
            >
              Library
            </Link>{" "}
            to create your first crate.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {crates.map((c) => {
            const updated = dateFmt.format(new Date(c.updated_at));
            return (
              <li key={c.id}>
                <Link
                  href={`/crates/${c.id}`}
                  className={cn(
                    "block h-full rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-5",
                    "ring-1 ring-inset ring-white/5 transition-colors",
                    "hover:border-zinc-700 hover:ring-violet-500/15",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug text-zinc-100">
                      {c.name}
                    </h2>
                    <span className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-800/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {sourceLabel(c.source)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {c.trackCount} {c.trackCount === 1 ? "track" : "tracks"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    Updated {updated}
                    {c.created_at !== c.updated_at ? (
                      <span className="text-zinc-600">
                        {" "}
                        · created{" "}
                        {dateFmt.format(new Date(c.created_at))}
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
