import Link from "next/link";
import { SITE_DESCRIPTION } from "@/lib/config/site";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-violet-400/95">
        Personal DJ workspace
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        Playlist intelligence{" "}
        <span className="text-zinc-500">without handing off your vault.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
        {SITE_DESCRIPTION}{" "}
        Import playlists, normalize tracks in your database, then reason over
        flow, transitions, and creative signals—all with your Postgres as source
        of truth.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
        >
          Start with log in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-900/60"
        >
          Explore shell (guest)
        </Link>
      </div>
      <dl className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          {
            dt: "Internal brain",
            dd: "Spotify imports; your Postgres owns state after ingest.",
          },
          {
            dt: "Deterministic first",
            dd: "Scoring and rules precede AI assistance.",
          },
          {
            dt: "No audio uploads",
            dd: "Metadata and relationships—never streaming mixes here.",
          },
        ].map((item) => (
          <div
            key={item.dt}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 ring-1 ring-inset ring-white/5"
          >
            <dt className="text-sm font-medium text-zinc-200">{item.dt}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-zinc-500">
              {item.dd}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
