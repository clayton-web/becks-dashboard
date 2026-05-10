import { AnalyzeReferenceTrackButton } from "@/components/recommendations/AnalyzeReferenceTrackButton";
import { formatDurationMs } from "@/lib/utils/format-duration";
import { spotifyTrackOpenUrl } from "@/lib/utils/spotify-open-url";
import type { CrateDetailTrack } from "@/lib/data/crates";
import { cn } from "@/lib/utils/class-names";

type Props = {
  tracks: CrateDetailTrack[];
  crateId: string;
};

export function CrateTracksTable({ tracks, crateId }: Props) {
  if (tracks.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-800/90 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500 ring-1 ring-inset ring-white/5">
        This crate has no tracks in the library yet. Import a playlist from the
        Library tab to populate it.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-zinc-800/90 bg-zinc-900/30",
        "ring-1 ring-inset ring-white/5",
      )}
    >
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800/80 text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3 font-medium">Pos.</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Artist</th>
            <th className="px-4 py-3 font-medium">Album</th>
            <th className="px-4 py-3 font-medium tabular-nums">Time</th>
            <th className="px-4 py-3 font-medium tabular-nums">Pop.</th>
            <th className="px-4 py-3 font-medium">Board</th>
            <th className="px-4 py-3 font-medium">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {tracks.map((t) => {
            const href = spotifyTrackOpenUrl(t.spotifyId, t.spotifyUri);
            const pos = t.position;
            return (
              <tr
                key={t.crateTrackId}
                className="text-zinc-200 transition-colors hover:bg-zinc-800/40"
              >
                <td className="px-4 py-2.5 tabular-nums text-zinc-500">
                  {pos != null ? pos : "—"}
                </td>
                <td className="max-w-[14rem] truncate px-4 py-2.5 font-medium text-zinc-100">
                  {t.title}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-2.5 text-zinc-300">
                  {t.artist}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-2.5 text-zinc-400">
                  {t.album ?? "—"}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-zinc-400">
                  {formatDurationMs(t.durationMs)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-zinc-400">
                  {t.popularity != null ? t.popularity : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <AnalyzeReferenceTrackButton trackId={t.trackId} crateId={crateId} />
                </td>
                <td className="px-4 py-2.5">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-violet-400 hover:text-violet-300"
                    >
                      Spotify
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
