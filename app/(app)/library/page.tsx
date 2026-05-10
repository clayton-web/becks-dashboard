import Link from "next/link";

import { getSpotifyPlaylistCardsForSession } from "@/lib/spotify/user-playlists";
import { spotifyLibraryListMessage } from "@/lib/spotify/user-facing-errors";
import { LibrarySpotifyImport } from "@/components/features/LibrarySpotifyImport";
import { cn } from "@/lib/utils/class-names";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const result = await getSpotifyPlaylistCardsForSession();
  const configHelp =
    result.ok === false &&
    (result.code === "missing_service_role" ||
      result.code === "missing_spotify_env");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
          Phase 1 — Spotify library
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
          Library
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Select playlists and import them into internal crates (same Spotify
          playlist id updates in place on re-import). Browse imported crates in
          the{" "}
          <Link
            href="/crates"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            Crates
          </Link>{" "}
          tab — no live Spotify calls there.
        </p>
      </header>

      {result.ok === false && result.code === "not_connected" ? (
        <section
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <p className="text-sm text-zinc-300">
            {spotifyLibraryListMessage("not_connected")}
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Open Settings
          </Link>
        </section>
      ) : null}

      {result.ok === false && result.code === "unauthorized" ? (
        <section
          className={cn(
            "rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <p className="text-sm text-zinc-300">
            {spotifyLibraryListMessage("unauthorized")}
          </p>
          <Link
            href="/login?next=/library"
            className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Sign in
          </Link>
        </section>
      ) : null}

      {result.ok === false &&
      result.code !== "not_connected" &&
      result.code !== "unauthorized" ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
        >
          <p>{spotifyLibraryListMessage(result.code, result.message)}</p>
          {configHelp ? (
            <p className="mt-3 text-xs text-red-100/80">
              <Link
                href="/settings/diagnostics"
                className="font-medium text-violet-200 underline hover:text-white"
              >
                Open deployment checklist
              </Link>{" "}
              for env var status (no secrets shown).
            </p>
          ) : null}
        </div>
      ) : null}

      {result.ok === true && result.playlists.length === 0 ? (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400 ring-1 ring-inset ring-white/5">
          <p>
            Spotify returned no playlists. Your account may have no playlists yet,
            or the API returned an empty page. Reconnect in Settings if this is
            unexpected.
          </p>
        </div>
      ) : null}

      {result.ok === true && result.playlists.length > 0 ? (
        <LibrarySpotifyImport playlists={result.playlists} />
      ) : null}
    </div>
  );
}
