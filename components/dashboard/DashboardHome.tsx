import Link from "next/link";

import type {
  DashboardOverview,
  RecentAnalysisRunSummary,
  RecentSavedTransitionSummary,
} from "@/lib/data/dashboard-overview";
import { cn } from "@/lib/utils/class-names";

type Props = {
  overview: DashboardOverview;
  geminiConfigured: boolean;
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function EmptyPanel({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800/70 border-dashed bg-zinc-950/40 px-5 py-8 text-center",
        "ring-1 ring-inset ring-white/[0.04]",
      )}
    >
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{body}</p>
      <Link
        href={ctaHref}
        className={cn(
          "mt-4 inline-flex rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white",
          "transition-colors hover:bg-violet-500",
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function RunRow({ row }: { row: RecentAnalysisRunSummary }) {
  const refLabel =
    row.referenceTitle && row.referenceArtist
      ? `${row.referenceTitle} — ${row.referenceArtist}`
      : row.referenceTitle ?? row.referenceTrackId ?? "Reference track";

  return (
    <li className="border-b border-zinc-800/60 py-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/recommendations/${encodeURIComponent(row.id)}`}
          className="text-sm font-medium text-zinc-100 transition-colors hover:text-violet-300"
        >
          Transition board run
        </Link>
        <time className="text-xs tabular-nums text-zinc-500" dateTime={row.createdAt}>
          {formatShortDate(row.createdAt)}
        </time>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{refLabel}</p>
    </li>
  );
}

function SavedRow({ row }: { row: RecentSavedTransitionSummary }) {
  return (
    <li className="border-b border-zinc-800/60 py-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-100">
          {row.candidateTitle}
          {row.candidateArtist ? (
            <span className="font-normal text-zinc-500"> — {row.candidateArtist}</span>
          ) : null}
        </p>
        <time className="text-xs tabular-nums text-zinc-500" dateTime={row.createdAt}>
          {formatShortDate(row.createdAt)}
        </time>
      </div>
      <p className="mt-1 text-xs text-violet-400/90">{row.directionLabel}</p>
    </li>
  );
}

export function DashboardHome({ overview, geminiConfigured }: Props) {
  const data = overview.ok ? overview : null;

  const statCrash =
    overview.ok === false ? (
      <div
        role="alert"
        className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
      >
        <p className="font-medium">Some metrics could not load</p>
        <p className="mt-1 text-xs text-amber-100/80">{overview.message}</p>
      </div>
    ) : null;

  const crateEmpty = data && data.crateCount === 0;
  const noRuns = data && data.recentRuns.length === 0;
  const noSaved = data && data.recentSaved.length === 0;

  return (
    <div className="flex flex-col gap-10 pb-12">
      <header className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/80 via-zinc-950 to-violet-950/30 p-8 ring-1 ring-inset ring-white/[0.06]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-32 w-72 rounded-full bg-fuchsia-500/5 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/90">
          Command center
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
          Transition intelligence cockpit
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Your DJ transition lab: import crates, analyze reference tracks across directions, bank
          the paths worth repeating — deterministic scoring stays on the servers; this page is pure
          orientation.
        </p>
      </header>

      {statCrash}

      {data ? (
        <section aria-label="Library snapshot">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Crates", value: data.crateCount, hint: "Imported collections" },
              {
                label: "Tracks",
                value: data.uniqueTracksInCrates,
                hint: "Unique tracks in crates",
              },
              {
                label: "Spotify",
                value: data.spotifyConnected ? "Linked" : "Not linked",
                hint: data.spotifyConnected ? "Ready to import" : "Connect under Library",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-5 py-4",
                  "ring-1 ring-inset ring-white/5",
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{s.hint}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Product entry points">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              Deck routing
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">Where to next</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Import playlists",
              body: "Pull Spotify playlists into internal crates. Same playlist id refreshes on re-import.",
              href: "/library",
              cta: "Open library",
            },
            {
              title: "Crates",
              body: "Browse collections, cue reference tracks for the recommendation board.",
              href: "/crates",
              cta: "View crates",
            },
            {
              title: "Recommendation board",
              body: "Score transition directions against your candidate pool side-by-side.",
              href: "/recommendations",
              cta: "Open board",
            },
            {
              title: "Saved paths",
              body: "Revisit starred transitions saved from board sessions.",
              href: "/recommendations/saved",
              cta: "View saved",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={cn(
                "flex flex-col rounded-xl border border-zinc-800/90 bg-zinc-900/35 p-5",
                "ring-1 ring-inset ring-white/5 transition-colors hover:border-zinc-700/90",
              )}
            >
              <p className="text-sm font-semibold text-zinc-100">{card.title}</p>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500">{card.body}</p>
              <Link
                href={card.href}
                className={cn(
                  "mt-4 inline-flex w-fit rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white",
                  "transition-colors hover:bg-violet-500",
                )}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>

        {crateEmpty ? (
          <div className="mt-4">
            <EmptyPanel
              title="No crates yet"
              body="Link Spotify and import a playlist — your crates power the recommendation pool."
              ctaHref="/library"
              ctaLabel="Go to Spotify import"
            />
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Recent analysis runs">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              Recent analyses
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">Transition board runs</h2>
          </div>
          {!data ? (
            <EmptyPanel
              title="Runs unavailable"
              body="Reload the page to refresh snapshot data."
              ctaHref="/dashboard"
              ctaLabel="Refresh"
            />
          ) : null}
          {data && noRuns ? (
            <EmptyPanel
              title="No analyses yet"
              body="Pick a reference track inside a crate, then launch the board — each run snapshots scored directions."
              ctaHref="/crates"
              ctaLabel="Browse crates"
            />
          ) : null}
          {data && !noRuns ? (
            <div
              className={cn(
                "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-5 py-4",
                "ring-1 ring-inset ring-white/5",
              )}
            >
              <ul>
                {data.recentRuns.map((row) => (
                  <RunRow key={row.id} row={row} />
                ))}
              </ul>
              <p className="mt-4 border-t border-zinc-800/80 pt-4">
                <Link
                  href="/recommendations"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Open recommendation board →
                </Link>
              </p>
            </div>
          ) : null}
        </section>

        <section aria-label="Recent saved transitions">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              Saved paths
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">Latest captures</h2>
          </div>
          {!data ? (
            <EmptyPanel
              title="Saved paths unavailable"
              body="Reload the page to refresh snapshot data."
              ctaHref="/dashboard"
              ctaLabel="Refresh"
            />
          ) : null}
          {data && noSaved ? (
            <EmptyPanel
              title="No saved transitions yet"
              body='When you find a keeper on the board, use "save path" — it lands here with direction context.'
              ctaHref="/recommendations"
              ctaLabel="Run the board"
            />
          ) : null}
          {data && !noSaved ? (
            <div
              className={cn(
                "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-5 py-4",
                "ring-1 ring-inset ring-white/5",
              )}
            >
              <ul>
                {data.recentSaved.map((row) => (
                  <SavedRow key={row.id} row={row} />
                ))}
              </ul>
              <p className="mt-4 border-t border-zinc-800/80 pt-4">
                <Link
                  href="/recommendations/saved"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  View all saved paths →
                </Link>
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <section aria-label="Enrichment configuration">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
            Enrichment
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-50">Gemini & catalogue depth</h2>
        </div>
        <div
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/35 px-6 py-5",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                geminiConfigured
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400",
              )}
            >
              {geminiConfigured ? "GEMINI_API_KEY present" : "Gemini not configured"}
            </span>
            {!geminiConfigured ? (
              <span className="text-xs text-zinc-500">
                Semantic tagging routes stay dormant until deployment has a server key (no Gemini
                calls from this dashboard).
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                Semantic enrichment is available to server workflows — triggered from enrichment
                flows, not here.
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium">
            <Link href="/settings/diagnostics" className="text-violet-400 hover:text-violet-300">
              Deployment diagnostics
            </Link>
            <span className="text-zinc-700">·</span>
            <Link href="/library" className="text-violet-400 hover:text-violet-300">
              Library & import
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
