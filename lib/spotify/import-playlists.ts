import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/supabase";
import type { SpotifyPlaylistImportSummary } from "@/types/spotify-import";

type AdminClient = SupabaseClient<Database>;
type TracksUpdate = Database["public"]["Tables"]["tracks"]["Update"];

const SPOTIFY_API = "https://api.spotify.com/v1";
const TRACKS_BATCH = 50;
const PLAYLIST_TRACKS_PAGE = 100;
const MAX_PLAYLIST_PAGES = 500;

type NormalizedSpotifyTrack = {
  spotifyId: string;
  spotifyUri: string;
  title: string;
  artist: string;
  album: string | null;
  durationMs: number | null;
  popularity: number | null;
  isrc: string | null;
};

// --- Spotify fetch helpers -------------------------------------------------

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  } as const;
}

async function fetchSpotifyJson<T>(
  accessToken: string,
  url: string,
): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(accessToken), cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[spotify] ${url} (${res.status}): ${text.slice(0, 220)}`);
  }
  return (await res.json()) as T;
}

type SpotifyPlaylistMeta = {
  id: string;
  name: string;
  description: string | null;
};

async function fetchPlaylistMeta(
  accessToken: string,
  playlistId: string,
): Promise<SpotifyPlaylistMeta> {
  const enc = encodeURIComponent(playlistId);
  return fetchSpotifyJson<SpotifyPlaylistMeta>(
    accessToken,
    `${SPOTIFY_API}/playlists/${enc}`,
  );
}

type SpotifyPlaylistTracksPage = {
  items: SpotifyPlaylistItem[];
  next: string | null;
};

type SpotifyPlaylistItem = {
  track: SpotifyNestedTrack | null;
};

type SpotifyNestedTrack = {
  id?: string;
  uri?: string;
  type?: string;
  is_local?: boolean;
  name?: string;
};

type SpotifyFullTrack = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  popularity?: number;
  artists: { name: string }[];
  album?: { name: string } | null;
  external_ids?: { isrc?: string };
};

type SpotifyTracksBatch = {
  tracks: (SpotifyFullTrack | null)[];
};

/** Playlist position is the 0-based index in Spotify’s flattened track list. */
type PlaylistTrackSlot = {
  playlistPosition: number;
  spotifyId: string;
};

function isImportablePlaylistTrackRef(
  track: SpotifyNestedTrack | null | undefined,
): track is SpotifyNestedTrack & { id: string } {
  if (!track || typeof track !== "object") return false;
  if (track.is_local === true) return false;
  if (track.type === "episode") return false;
  if (typeof track.uri === "string" && track.uri.startsWith("spotify:episode:")) {
    return false;
  }
  if (typeof track.id !== "string" || !track.id.trim()) return false;
  return true;
}

async function fetchPlaylistTrackSlots(
  accessToken: string,
  playlistId: string,
): Promise<{ slots: PlaylistTrackSlot[]; skipped: number }> {
  const enc = encodeURIComponent(playlistId);
  let nextPageUrl: string | null =
    `${SPOTIFY_API}/playlists/${enc}/tracks?limit=${PLAYLIST_TRACKS_PAGE}`;
  const slots: PlaylistTrackSlot[] = [];
  let skipped = 0;
  let playlistPosition = 0;
  let pages = 0;

  while (nextPageUrl != null && pages < MAX_PLAYLIST_PAGES) {
    pages += 1;
    const requestUrl: string = nextPageUrl;
    const page = await fetchSpotifyJson<SpotifyPlaylistTracksPage>(
      accessToken,
      requestUrl,
    );
    for (const row of page.items ?? []) {
      const pos = playlistPosition;
      playlistPosition += 1;
      if (!isImportablePlaylistTrackRef(row.track)) {
        skipped += 1;
        continue;
      }
      slots.push({ playlistPosition: pos, spotifyId: row.track.id });
    }
    nextPageUrl = page.next;
  }

  return { slots, skipped };
}

async function fetchTracksFullBatch(
  accessToken: string,
  ids: string[],
): Promise<Map<string, SpotifyFullTrack>> {
  const out = new Map<string, SpotifyFullTrack>();
  for (let i = 0; i < ids.length; i += TRACKS_BATCH) {
    const slice = ids.slice(i, i + TRACKS_BATCH);
    const q = slice.map(encodeURIComponent).join(",");
    const batch = await fetchSpotifyJson<SpotifyTracksBatch>(
      accessToken,
      `${SPOTIFY_API}/tracks?ids=${q}`,
    );
    const list = batch.tracks ?? [];
    for (let j = 0; j < slice.length; j++) {
      const id = slice[j];
      if (!id) continue;
      const t = list[j];
      if (t?.id) out.set(id, t);
    }
  }
  return out;
}

function normalizeFullTrack(t: SpotifyFullTrack): NormalizedSpotifyTrack {
  const artist =
    t.artists?.map((a) => a.name).filter(Boolean).join(", ") || "Unknown Artist";
  const isrc =
    typeof t.external_ids?.isrc === "string" && t.external_ids.isrc.trim()
      ? t.external_ids.isrc.trim()
      : null;
  return {
    spotifyId: t.id,
    spotifyUri: t.uri,
    title: t.name || "Unknown title",
    artist,
    album: t.album?.name ?? null,
    durationMs: typeof t.duration_ms === "number" ? t.duration_ms : null,
    popularity: typeof t.popularity === "number" ? t.popularity : null,
    isrc,
  };
}

// --- Track persistence -------------------------------------------------------

async function ensureTrackExternalId(
  admin: AdminClient,
  trackId: string,
  spotifyId: string,
  uri: string,
): Promise<void> {
  const { error } = await admin.from("track_external_ids").insert({
    track_id: trackId,
    source: "spotify",
    external_id: spotifyId,
    external_uri: uri,
  });
  if (error && error.code !== "23505") {
    throw new Error(`track_external_ids insert: ${error.message}`);
  }
}

type ResolveOutcome = "created" | "reused_spotify_id" | "reused_isrc";

async function resolveOrCreateTrack(
  admin: AdminClient,
  norm: NormalizedSpotifyTrack,
): Promise<{ trackId: string; outcome: ResolveOutcome }> {
  const { data: bySpotify } = await admin
    .from("tracks")
    .select("id, spotify_id, isrc")
    .eq("spotify_id", norm.spotifyId)
    .maybeSingle();

  if (bySpotify?.id) {
    await admin
      .from("tracks")
      .update({
        canonical_title: norm.title,
        canonical_artist: norm.artist,
        canonical_album: norm.album,
        duration_ms: norm.durationMs,
        popularity: norm.popularity,
        spotify_uri: norm.spotifyUri,
        ...(norm.isrc ? { isrc: norm.isrc } : {}),
      })
      .eq("id", bySpotify.id);

    return { trackId: bySpotify.id, outcome: "reused_spotify_id" };
  }

  if (norm.isrc) {
    const { data: byIsrc } = await admin
      .from("tracks")
      .select("id, spotify_id, isrc")
      .eq("isrc", norm.isrc)
      .maybeSingle();

    if (byIsrc?.id) {
      const patch: TracksUpdate = {
        canonical_title: norm.title,
        canonical_artist: norm.artist,
        canonical_album: norm.album,
        duration_ms: norm.durationMs,
        popularity: norm.popularity,
      };
      if (!byIsrc.spotify_id?.trim()) {
        patch.spotify_id = norm.spotifyId;
        patch.spotify_uri = norm.spotifyUri;
      } else if (byIsrc.spotify_id !== norm.spotifyId) {
        await ensureTrackExternalId(
          admin,
          byIsrc.id,
          norm.spotifyId,
          norm.spotifyUri,
        );
      }
      if (norm.isrc) {
        patch.isrc = norm.isrc;
      }
      await admin.from("tracks").update(patch).eq("id", byIsrc.id);

      return { trackId: byIsrc.id, outcome: "reused_isrc" };
    }
  }

  const { data: inserted, error } = await admin
    .from("tracks")
    .insert({
      spotify_id: norm.spotifyId,
      spotify_uri: norm.spotifyUri,
      isrc: norm.isrc,
      canonical_title: norm.title,
      canonical_artist: norm.artist,
      canonical_album: norm.album,
      duration_ms: norm.durationMs,
      popularity: norm.popularity,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await admin
        .from("tracks")
        .select("id")
        .eq("spotify_id", norm.spotifyId)
        .maybeSingle();
      if (retry?.id) {
        return { trackId: retry.id, outcome: "reused_spotify_id" };
      }
      if (norm.isrc) {
        const { data: retryIsrc } = await admin
          .from("tracks")
          .select("id")
          .eq("isrc", norm.isrc)
          .maybeSingle();
        if (retryIsrc?.id) {
          return { trackId: retryIsrc.id, outcome: "reused_isrc" };
        }
      }
    }
    throw new Error(`tracks insert: ${error.message}`);
  }

  if (!inserted?.id) {
    throw new Error("tracks insert: missing id");
  }

  return { trackId: inserted.id, outcome: "created" };
}

async function upsertSpotifyCrate(
  admin: AdminClient,
  userId: string,
  playlistId: string,
  name: string,
  description: string | null,
): Promise<string> {
  const { data: existing } = await admin
    .from("crates")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "spotify")
    .eq("source_external_id", playlistId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .from("crates")
      .update({ name, description })
      .eq("id", existing.id);
    if (error) throw new Error(`crates update: ${error.message}`);
    return existing.id;
  }

  const { data: row, error } = await admin
    .from("crates")
    .insert({
      user_id: userId,
      name,
      description,
      source: "spotify",
      source_external_id: playlistId,
    })
    .select("id")
    .single();

  if (error || !row?.id) {
    throw new Error(`crates insert: ${error?.message ?? "no id"}`);
  }
  return row.id;
}

async function replaceCrateTracks(
  admin: AdminClient,
  crateId: string,
  rows: { track_id: string; position: number }[],
): Promise<number> {
  const { error: delErr } = await admin
    .from("crate_tracks")
    .delete()
    .eq("crate_id", crateId);
  if (delErr) throw new Error(`crate_tracks delete: ${delErr.message}`);

  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    crate_id: crateId,
    track_id: r.track_id,
    position: r.position,
  }));

  const chunk = 400;
  let written = 0;
  for (let i = 0; i < payload.length; i += chunk) {
    const slice = payload.slice(i, i + chunk);
    const { error } = await admin.from("crate_tracks").insert(slice);
    if (error) throw new Error(`crate_tracks insert: ${error.message}`);
    written += slice.length;
  }
  return written;
}

// --- Orchestration -----------------------------------------------------------

export type ImportSpotifyPlaylistsInput = {
  userId: string;
  accessToken: string;
  playlistIds: string[];
};

/**
 * Imports Spotify playlists into `crates` / `tracks` / `crate_tracks` using the
 * service role client (call after verifying the Supabase session user).
 */
export async function importSpotifyPlaylistsToCrates(
  input: ImportSpotifyPlaylistsInput,
): Promise<SpotifyPlaylistImportSummary> {
  const admin = createSupabaseServiceRoleClient();
  const summary: SpotifyPlaylistImportSummary = {
    playlistsImported: 0,
    tracksSeen: 0,
    tracksCreated: 0,
    tracksReused: 0,
    crateTracksWritten: 0,
    skippedItems: 0,
    errors: [],
  };

  const seen = new Set(input.playlistIds.map((id) => id.trim()).filter(Boolean));

  for (const playlistId of seen) {
    try {
      const meta = await fetchPlaylistMeta(input.accessToken, playlistId);
      const { slots, skipped: slotSkipped } = await fetchPlaylistTrackSlots(
        input.accessToken,
        playlistId,
      );
      summary.skippedItems += slotSkipped;

      summary.tracksSeen += slots.length;

      const uniqueIds = [...new Set(slots.map((s) => s.spotifyId))];
      const fullMap = await fetchTracksFullBatch(input.accessToken, uniqueIds);

      const crateTrackRows: { track_id: string; position: number }[] = [];

      for (const slot of slots) {
        const full = fullMap.get(slot.spotifyId);
        if (!full) {
          summary.skippedItems += 1;
          summary.errors.push(
            `[${playlistId}] missing track payload for ${slot.spotifyId} at position ${slot.playlistPosition}`,
          );
          continue;
        }

        const norm = normalizeFullTrack(full);
        const { trackId, outcome } = await resolveOrCreateTrack(admin, norm);
        if (outcome === "created") {
          summary.tracksCreated += 1;
        } else {
          summary.tracksReused += 1;
        }
        crateTrackRows.push({
          track_id: trackId,
          position: slot.playlistPosition,
        });
      }

      const crateId = await upsertSpotifyCrate(
        admin,
        input.userId,
        playlistId,
        meta.name,
        meta.description,
      );

      const written = await replaceCrateTracks(admin, crateId, crateTrackRows);
      summary.crateTracksWritten += written;
      summary.playlistsImported += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`[${playlistId}] ${msg}`);
    }
  }

  return summary;
}
