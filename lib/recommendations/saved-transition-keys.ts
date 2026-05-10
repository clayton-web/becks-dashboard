/** Client/server stable key for "already saved on this board run". */
export function savedTransitionCompositeKey(
  directionId: string,
  candidateTrackId: string,
): string {
  return `${directionId.trim()}:${candidateTrackId.trim()}`;
}

/** Postgres unique_violation — Supabase/PostgREST surfaces `23505`. */
export function isPostgresUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
