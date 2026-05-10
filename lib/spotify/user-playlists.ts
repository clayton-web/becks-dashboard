import "server-only";

import { getValidSpotifyAccessTokenForSessionUser } from "@/lib/spotify/session-access-token";
import type { SpotifyPlaylistCardDto } from "@/types/spotify-playlist-card";

const SPOTIFY_ME_PLAYLISTS = "https://api.spotify.com/v1/me/playlists";

type SpotifyPlaylistOwner = {
  id: string;
  display_name: string | null;
};

type SpotifyPlaylistSimplified = {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  images: { url: string | null; height: number | null; width: number | null }[];
  tracks: { total: number };
  owner: SpotifyPlaylistOwner;
  external_urls?: { spotify?: string };
};

type SpotifyPaging = {
  items: SpotifyPlaylistSimplified[];
  next: string | null;
  limit: number;
  offset: number;
  total: number;
};

function toCard(p: SpotifyPlaylistSimplified): SpotifyPlaylistCardDto {
  const cover =
    p.images?.find((i) => i.url)?.url ??
    p.images?.[0]?.url ??
    null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    isPublic: p.public === true,
    trackCount: p.tracks?.total ?? 0,
    ownerDisplayName: p.owner?.display_name ?? null,
    imageUrl: cover,
    spotifyOpenUrl: p.external_urls?.spotify ?? null,
  };
}

/**
 * Paginates `GET /v1/me/playlists` (Spotify max limit 50 per request).
 */
export async function fetchSpotifyUserPlaylists(
  accessToken: string,
): Promise<SpotifyPlaylistCardDto[]> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  } as const;

  const all: SpotifyPlaylistCardDto[] = [];
  let nextUrl: string | null =
    `${SPOTIFY_ME_PLAYLISTS}?limit=50&offset=0`;
  let pages = 0;

  while (nextUrl != null && pages < 40) {
    pages += 1;
    const res = await fetch(nextUrl, { headers, cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `[spotify] list playlists failed (${res.status}): ${text.slice(0, 260)}`,
      );
    }
    const page = (await res.json()) as SpotifyPaging;
    for (const item of page.items ?? []) {
      if (item?.id) all.push(toCard(item));
    }
    nextUrl = page.next;
  }

  return all;
}

export type SpotifyPlaylistCardsForSessionResult =
  | { ok: true; playlists: SpotifyPlaylistCardDto[] }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "not_connected"
        | "token_refresh_failed"
        | "missing_service_role"
        | "missing_spotify_env"
        | "spotify_api";
      message?: string;
    };

export async function getSpotifyPlaylistCardsForSession(): Promise<SpotifyPlaylistCardsForSessionResult> {
  const token = await getValidSpotifyAccessTokenForSessionUser();
  if (!token.ok) {
    return token;
  }
  try {
    const playlists = await fetchSpotifyUserPlaylists(token.accessToken);
    return { ok: true, playlists };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "spotify_request_failed";
    return { ok: false, code: "spotify_api", message: msg };
  }
}
