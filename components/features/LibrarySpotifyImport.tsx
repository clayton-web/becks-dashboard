"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import type { SpotifyPlaylistCardDto } from "@/types/spotify-playlist-card";
import type { SpotifyPlaylistImportSummary } from "@/types/spotify-import";
import { spotifyImportFailureMessage } from "@/lib/spotify/user-facing-errors";
import { cn } from "@/lib/utils/class-names";

type Props = {
  playlists: SpotifyPlaylistCardDto[];
};

type UiState =
  | { phase: "idle" }
  | { phase: "loading" }
  | {
      phase: "success";
      summary: SpotifyPlaylistImportSummary;
      warnAllFailed?: boolean;
      warnNoTracks?: boolean;
    }
  | { phase: "error"; message: string };

export function LibrarySpotifyImport({ playlists }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [ui, setUi] = useState<UiState>({ phase: "idle" });

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(playlists.map((p) => p.id)));
  }, [playlists]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
    setUi({ phase: "idle" });
  }, []);

  const runImport = useCallback(async () => {
    if (selected.size === 0) return;
    setUi({ phase: "loading" });
    try {
      const res = await fetch("/api/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistIds: [...selected] }),
      });
      const data = (await res.json()) as
        | SpotifyPlaylistImportSummary
        | { error?: string; message?: string };

      if (!res.ok) {
        const typed = data as { error?: string; message?: string };
        setUi({
          phase: "error",
          message: spotifyImportFailureMessage(res.status, {
            error: typed.error,
            message: typed.message,
          }),
        });
        return;
      }

      const summary = data as SpotifyPlaylistImportSummary;
      const allFailed =
        summary.playlistsImported === 0 && summary.errors.length > 0;
      const noTracksWritten =
        summary.playlistsImported > 0 && summary.crateTracksWritten === 0;

      setUi({
        phase: "success",
        summary,
        warnAllFailed: allFailed,
        warnNoTracks: noTracksWritten && !allFailed,
      });
    } catch (e) {
      setUi({
        phase: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, [selected]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runImport}
          disabled={selected.size === 0 || ui.phase === "loading"}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            selected.size === 0 || ui.phase === "loading"
              ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
              : "bg-violet-600 text-white hover:bg-violet-500",
          )}
        >
          {ui.phase === "loading" ? "Importing…" : "Import selected"}
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:border-violet-500/50"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
        >
          Clear
        </button>
        <span className="text-xs text-zinc-500">
          {selected.size} selected
        </span>
      </div>

      {ui.phase === "error" ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
        >
          <p>{ui.message}</p>
          <p className="mt-2 text-xs text-red-100/85">
            If this mentions missing keys or Spotify configuration, open{" "}
            <Link
              href="/settings/diagnostics"
              className="font-medium text-violet-200 underline hover:text-white"
            >
              Settings → Deployment checklist
            </Link>
            .
          </p>
        </div>
      ) : null}

      {ui.phase === "success" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100"
        >
          <p className="font-medium text-emerald-50">Import complete</p>
          {ui.warnAllFailed ? (
            <p className="mt-2 text-xs text-amber-200/95">
              No playlists were imported. Check the errors below — often OAuth,
              permissions, or Spotify API issues.
            </p>
          ) : null}
          {ui.warnNoTracks ? (
            <p className="mt-2 text-xs text-amber-200/95">
              Import ran, but no tracks were saved. The playlist may be empty,
              or every row was skipped (local files, episodes, or unavailable
              tracks).
            </p>
          ) : null}
          <ul className="mt-2 grid gap-1 text-xs text-emerald-100/90 sm:grid-cols-2">
            <li>Playlists imported · {ui.summary.playlistsImported}</li>
            <li>Tracks seen · {ui.summary.tracksSeen}</li>
            <li>Tracks created · {ui.summary.tracksCreated}</li>
            <li>Tracks reused · {ui.summary.tracksReused}</li>
            <li>Crate rows written · {ui.summary.crateTracksWritten}</li>
            <li>Skipped items · {ui.summary.skippedItems}</li>
          </ul>
          {ui.summary.errors.length > 0 ? (
            <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-4 text-xs text-amber-100/95">
              {ui.summary.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {playlists.map((p) => {
          const isOn = selected.has(p.id);
          return (
            <li key={p.id}>
              <label
                className={cn(
                  "flex h-full cursor-pointer gap-4 rounded-xl border bg-zinc-900/40 p-4 ring-1 ring-inset transition-colors",
                  isOn
                    ? "border-violet-500/50 ring-violet-500/20"
                    : "border-zinc-800/90 ring-white/5 hover:border-zinc-700",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 rounded border-zinc-600 accent-violet-500"
                  checked={isOn}
                  onChange={() => toggle(p.id)}
                />
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs text-zinc-500"
                      aria-hidden
                    >
                      No art
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug text-zinc-100">
                      {p.name}
                    </span>
                    {p.spotifyOpenUrl ? (
                      <a
                        href={p.spotifyOpenUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-violet-400 hover:text-violet-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.trackCount} tracks
                    {p.ownerDisplayName ? ` · ${p.ownerDisplayName}` : ""}
                    <span className="text-zinc-600">
                      {" "}
                      · {p.isPublic ? "Public" : "Private"}
                    </span>
                  </p>
                  {p.description?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {p.description}
                    </p>
                  ) : null}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
