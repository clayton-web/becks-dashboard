import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
  type EnrichmentFieldName,
  type EnrichmentSource,
  isEnrichmentFieldName,
} from "@/lib/enrichment/fields";
import type { EnrichmentValueRow, TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import type { Json } from "@/types/supabase";

/** Spotify rows required before deterministic audio is considered cached. */
export const SPOTIFY_MANIFEST_FIELDS: readonly EnrichmentFieldName[] = [
  ENRICHMENT_FIELD.BPM,
  ENRICHMENT_FIELD.KEY,
  ENRICHMENT_FIELD.ENERGY,
  ENRICHMENT_FIELD.DANCEABILITY,
  ENRICHMENT_FIELD.VALENCE,
  ENRICHMENT_FIELD.LOUDNESS,
];

export function manifestKey(
  source: EnrichmentSource,
  field: EnrichmentFieldName,
): string {
  return `${source}\u001f${field}`;
}

function asRecord(json: Json): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as Record<string, unknown>;
}

/** Parse Spotify KEY payload — missing property vs explicit null vs label string. */
export function parseSpotifyKeyLabelPresence(json: Json): {
  state: "missing" | "unknown" | "present";
  label: string | null;
} {
  const o = asRecord(json);
  if (!o || !("label" in o)) return { state: "missing", label: null };
  const label = o.label;
  if (label === null) return { state: "unknown", label: null };
  if (typeof label !== "string") return { state: "missing", label: null };
  const t = label.trim();
  if (t === "") return { state: "unknown", label: null };
  return { state: "present", label: t };
}

export function buildManifestKeys(rows: EnrichmentValueRow[]): Set<string> {
  const keys = new Set<string>();
  for (const r of rows) {
    if (!isEnrichmentFieldName(r.field_name)) continue;
    if (
      r.source !== ENRICHMENT_SOURCE.SPOTIFY &&
      r.source !== ENRICHMENT_SOURCE.INTERNAL
    ) {
      continue;
    }
    keys.add(manifestKey(r.source, r.field_name));
  }
  return keys;
}

export function hasInternalCamelot(manifest: Set<string>): boolean {
  return manifest.has(
    manifestKey(ENRICHMENT_SOURCE.INTERNAL, ENRICHMENT_FIELD.CAMELOT),
  );
}

export type SpotifyKeyRowState = "missing_row" | "unknown_pitch" | "labeled";

export function spotifyKeyRowStateFromRows(
  rows: EnrichmentValueRow[],
): SpotifyKeyRowState {
  const row = rows.find(
    (r) =>
      r.field_name === ENRICHMENT_FIELD.KEY &&
      r.source === ENRICHMENT_SOURCE.SPOTIFY,
  );
  if (!row) return "missing_row";
  const parsed = parseSpotifyKeyLabelPresence(row.field_value);
  if (parsed.state === "missing") return "missing_row";
  if (parsed.state === "unknown") return "unknown_pitch";
  return "labeled";
}

/**
 * Whether Spotify Web API audio-features should be requested again.
 * Unknown pitch (-1) stores `{ label: null }` — Camelot not required.
 * Known pitch requires internal Camelot rows once Spotify KEY exists.
 */
export function trackNeedsSpotifyAudioFeaturesFetchFromRows(
  rows: EnrichmentValueRow[],
  force: boolean,
): boolean {
  if (force) return true;
  const manifest = buildManifestKeys(rows);

  for (const field of SPOTIFY_MANIFEST_FIELDS) {
    if (!manifest.has(manifestKey(ENRICHMENT_SOURCE.SPOTIFY, field))) {
      return true;
    }
  }

  const keyState = spotifyKeyRowStateFromRows(rows);
  if (keyState === "missing_row") return true;

  if (keyState === "labeled" && !hasInternalCamelot(manifest)) {
    return true;
  }

  return false;
}

export function filterUpsertsAgainstManifest(
  upserts: readonly TrackEnrichmentUpsertInput[],
  manifest: Set<string>,
  force: boolean,
): TrackEnrichmentUpsertInput[] {
  if (force) return [...upserts];
  return upserts.filter(
    (u) => !manifest.has(manifestKey(u.source, u.fieldName)),
  );
}

/** After merge — deterministic lane satisfied for BPM/scalars/key/Camelot policy. */
export function isDeterministicIntelSnapshotComplete(
  snap: TrackIntelSnapshot,
): boolean {
  const scalars = [
    snap.bpm,
    snap.energy,
    snap.danceability,
    snap.valence,
    snap.loudness,
  ];
  const scalarsFromSpotify = scalars.every(
    (s) => s.provenance?.source === ENRICHMENT_SOURCE.SPOTIFY,
  );

  const keyFromSpotify =
    snap.key.provenance?.source === ENRICHMENT_SOURCE.SPOTIFY;

  const unknownKey =
    snap.key.provenance?.source === ENRICHMENT_SOURCE.SPOTIFY &&
    snap.key.value === null;

  const camelotReady =
    snap.camelot.provenance?.source === ENRICHMENT_SOURCE.INTERNAL &&
    snap.camelot.value !== null &&
    snap.camelot.value.trim() !== "";

  return Boolean(
    scalarsFromSpotify && keyFromSpotify && (camelotReady || unknownKey),
  );
}
