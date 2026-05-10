/**
 * Pure helpers for crate membership checks — safe to import from tests.
 */

export function partitionTrackIdsByMembership(
  requestedUniqueInOrder: readonly string[],
  ownedMembership: ReadonlySet<string>,
): { ownedTrackIds: string[]; rejectedTrackIds: string[] } {
  const ownedTrackIds: string[] = [];
  const rejectedTrackIds: string[] = [];

  for (const id of requestedUniqueInOrder) {
    if (ownedMembership.has(id)) ownedTrackIds.push(id);
    else rejectedTrackIds.push(id);
  }

  return { ownedTrackIds, rejectedTrackIds };
}
