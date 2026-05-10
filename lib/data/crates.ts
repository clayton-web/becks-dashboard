import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CrateSummary = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  source_external_id: string | null;
  crate_type: string;
  created_at: string;
  updated_at: string;
  trackCount: number;
};

export type CrateDetailTrack = {
  trackId: string;
  crateTrackId: string;
  position: number | null;
  title: string;
  artist: string;
  album: string | null;
  durationMs: number | null;
  popularity: number | null;
  spotifyId: string | null;
  spotifyUri: string | null;
};

type CrateRow = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  source_external_id: string | null;
  crate_type: string;
  created_at: string;
  updated_at: string;
};

type CrateTrackEmbedRow = {
  id: string;
  position: number | null;
  tracks: {
    id: string;
    canonical_title: string;
    canonical_artist: string;
    canonical_album: string | null;
    duration_ms: number | null;
    popularity: number | null;
    spotify_id: string | null;
    spotify_uri: string | null;
  } | null;
};

export async function listCratesForCurrentUser(): Promise<
  | { ok: true; crates: CrateSummary[] }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data: crates, error } = await supabase
    .from("crates")
    .select(
      "id, name, description, source, source_external_id, crate_type, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (crates ?? []) as CrateRow[];
  if (rows.length === 0) {
    return { ok: true, crates: [] };
  }

  const ids = rows.map((r) => r.id);
  const { data: linkRows, error: linkError } = await supabase
    .from("crate_tracks")
    .select("crate_id")
    .in("crate_id", ids);

  if (linkError) {
    return { ok: false, error: linkError.message };
  }

  const countByCrate = new Map<string, number>();
  for (const row of linkRows ?? []) {
    const cid = row.crate_id;
    countByCrate.set(cid, (countByCrate.get(cid) ?? 0) + 1);
  }

  return {
    ok: true,
    crates: rows.map((r) => ({
      ...r,
      trackCount: countByCrate.get(r.id) ?? 0,
    })),
  };
}

export async function getCrateDetailForCurrentUser(
  crateId: string,
): Promise<
  | { ok: true; crate: CrateSummary; tracks: CrateDetailTrack[] }
  | { ok: false; error: string }
  | { ok: false; notFound: true }
> {
  const supabase = await createSupabaseServerClient();

  const { data: crate, error: crateErr } = await supabase
    .from("crates")
    .select(
      "id, name, description, source, source_external_id, crate_type, created_at, updated_at",
    )
    .eq("id", crateId)
    .maybeSingle();

  if (crateErr) {
    return { ok: false, error: crateErr.message };
  }

  if (!crate) {
    return { ok: false, notFound: true };
  }

  const c = crate as CrateRow;

  const { data: ctRows, error: ctErr } = await supabase
    .from("crate_tracks")
    .select(
      `
      id,
      position,
      tracks (
        id,
        canonical_title,
        canonical_artist,
        canonical_album,
        duration_ms,
        popularity,
        spotify_id,
        spotify_uri
      )
    `,
    )
    .eq("crate_id", crateId)
    .order("position", { ascending: true, nullsFirst: false });

  if (ctErr) {
    return { ok: false, error: ctErr.message };
  }

  const embedded = (ctRows ?? []) as CrateTrackEmbedRow[];

  const tracks: CrateDetailTrack[] = [];
  for (const row of embedded) {
    const t = row.tracks;
    if (!t) continue;
    tracks.push({
      trackId: t.id,
      crateTrackId: row.id,
      position: row.position,
      title: t.canonical_title,
      artist: t.canonical_artist,
      album: t.canonical_album,
      durationMs: t.duration_ms,
      popularity: t.popularity,
      spotifyId: t.spotify_id,
      spotifyUri: t.spotify_uri,
    });
  }

  tracks.sort((a, b) => {
    const pa = a.position;
    const pb = b.position;
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return a.title.localeCompare(b.title);
  });

  return {
    ok: true,
    crate: {
      id: c.id,
      name: c.name,
      description: c.description,
      source: c.source,
      source_external_id: c.source_external_id,
      crate_type: c.crate_type,
      created_at: c.created_at,
      updated_at: c.updated_at,
      trackCount: tracks.length,
    },
    tracks,
  };
}
