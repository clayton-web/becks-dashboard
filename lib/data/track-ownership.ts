import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import {
  partitionTrackIdsByMembership,
} from "@/lib/data/track-ownership-utils";

export { partitionTrackIdsByMembership };

type UserScopedClient = SupabaseClient<Database>;

const CRATE_ID_QUERY_CHUNK = 150;

/**
 * Tracks appearing in any crate owned by `userId` (`crates.user_id`).
 * Uses the cookie-bound Supabase client so RLS applies — never pass service role.
 */
export async function filterTrackIdsOwnedByUser(
  supabase: UserScopedClient,
  userId: string,
  trackIds: readonly string[],
): Promise<
  | { ok: true; ownedTrackIds: string[]; rejectedTrackIds: string[] }
  | { ok: false; error: string }
> {
  const requestedUnique = [
    ...new Set(trackIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];

  if (requestedUnique.length === 0) {
    return { ok: true, ownedTrackIds: [], rejectedTrackIds: [] };
  }

  const { data: userCrates, error: crateErr } = await supabase
    .from("crates")
    .select("id")
    .eq("user_id", userId);

  if (crateErr) {
    return { ok: false, error: crateErr.message };
  }

  const crateIds = (userCrates ?? [])
    .map((c) => c.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (crateIds.length === 0) {
    return {
      ok: true,
      ownedTrackIds: [],
      rejectedTrackIds: [...requestedUnique],
    };
  }

  const ownedMembership = new Set<string>();

  for (let i = 0; i < crateIds.length; i += CRATE_ID_QUERY_CHUNK) {
    const slice = crateIds.slice(i, i + CRATE_ID_QUERY_CHUNK);
    const { data: links, error: linkErr } = await supabase
      .from("crate_tracks")
      .select("track_id")
      .in("crate_id", slice)
      .in("track_id", requestedUnique);

    if (linkErr) {
      return { ok: false, error: linkErr.message };
    }

    for (const row of links ?? []) {
      if (typeof row.track_id === "string" && row.track_id.length > 0) {
        ownedMembership.add(row.track_id);
      }
    }
  }

  return {
    ok: true,
    ...partitionTrackIdsByMembership(requestedUnique, ownedMembership),
  };
}
