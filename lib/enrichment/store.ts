import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ENRICHMENT_SOURCE } from "@/lib/enrichment/fields";
import {
  mergeEnrichmentRowsToSnapshot,
  type EnrichmentValueRow,
  type TrackIntelSnapshot,
} from "@/lib/enrichment/read-model";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/supabase";

type AdminClient = SupabaseClient<Database>;

const UPSERT_CHUNK = 80;

export type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";

function assertAdminClient(client: AdminClient): void {
  if (!client) throw new Error("[enrichment] Supabase admin client is required.");
}

/** Fetch raw rows for one track (service-role client expected). */
export async function fetchTrackEnrichmentRows(
  admin: AdminClient,
  trackId: string,
): Promise<EnrichmentValueRow[]> {
  assertAdminClient(admin);
  const { data, error } = await admin
    .from("track_enrichment_values")
    .select("track_id,field_name,field_value,source,confidence")
    .eq("track_id", trackId);

  if (error) {
    throw new Error(`[enrichment] fetch rows failed: ${error.message}`);
  }

  return (data ?? []) as EnrichmentValueRow[];
}

/** Batch-load enrichment rows used for deterministic ingest gates / manifests. */
export async function fetchTrackEnrichmentRowsForTracks(
  admin: AdminClient,
  trackIds: string[],
): Promise<EnrichmentValueRow[]> {
  assertAdminClient(admin);
  const uniq = [...new Set(trackIds.filter((id) => id.trim()))];
  if (uniq.length === 0) return [];

  const { data, error } = await admin
    .from("track_enrichment_values")
    .select("track_id,field_name,field_value,source,confidence")
    .in("track_id", uniq)
    .in("source", [ENRICHMENT_SOURCE.SPOTIFY, ENRICHMENT_SOURCE.INTERNAL]);

  if (error) {
    throw new Error(`[enrichment] batch fetch rows failed: ${error.message}`);
  }

  return (data ?? []) as EnrichmentValueRow[];
}

/**
 * Batch-load enrichment rows for snapshot merge (every source).
 * Chunked to avoid oversized `IN` lists.
 */
export async function fetchTrackEnrichmentRowsForTracksAllSources(
  admin: AdminClient,
  trackIds: string[],
): Promise<EnrichmentValueRow[]> {
  assertAdminClient(admin);
  const uniq = [...new Set(trackIds.map((id) => id.trim()).filter((id) => id.length > 0))];
  if (uniq.length === 0) return [];

  const out: EnrichmentValueRow[] = [];
  for (let i = 0; i < uniq.length; i += UPSERT_CHUNK) {
    const slice = uniq.slice(i, i + UPSERT_CHUNK);
    const { data, error } = await admin
      .from("track_enrichment_values")
      .select("track_id,field_name,field_value,source,confidence")
      .in("track_id", slice);

    if (error) {
      throw new Error(`[enrichment] batch fetch all-sources rows failed: ${error.message}`);
    }
    out.push(...((data ?? []) as EnrichmentValueRow[]));
  }
  return out;
}

/** Upsert a single enrichment row — relies on UNIQUE (track_id, field_name, source). */
export async function upsertTrackEnrichmentValue(
  admin: AdminClient,
  input: TrackEnrichmentUpsertInput,
): Promise<void> {
  assertAdminClient(admin);
  const row: Database["public"]["Tables"]["track_enrichment_values"]["Insert"] =
    {
      track_id: input.trackId,
      field_name: input.fieldName,
      field_value: input.fieldValue,
      source: input.source,
      confidence: input.confidence ?? null,
      source_payload: input.sourcePayload ?? null,
    };

  const { error } = await admin.from("track_enrichment_values").upsert(row, {
    onConflict: "track_id,field_name,source",
  });

  if (error) {
    throw new Error(`[enrichment] upsert failed: ${error.message}`);
  }
}

/** Batch upsert (chunked) for ingest pipelines. */
export async function upsertTrackEnrichmentValues(
  admin: AdminClient,
  inputs: TrackEnrichmentUpsertInput[],
): Promise<void> {
  assertAdminClient(admin);
  if (inputs.length === 0) return;

  const rows: Database["public"]["Tables"]["track_enrichment_values"]["Insert"][] =
    inputs.map((input) => ({
      track_id: input.trackId,
      field_name: input.fieldName,
      field_value: input.fieldValue,
      source: input.source,
      confidence: input.confidence ?? null,
      source_payload: input.sourcePayload ?? null,
    }));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const slice = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await admin.from("track_enrichment_values").upsert(slice, {
      onConflict: "track_id,field_name,source",
    });
    if (error) {
      throw new Error(`[enrichment] batch upsert failed: ${error.message}`);
    }
  }
}

/** Load snapshot using a fresh service-role client — server-only entry point. */
export async function loadTrackIntelSnapshot(
  trackId: string,
): Promise<TrackIntelSnapshot> {
  const admin = createSupabaseServiceRoleClient();
  const rows = await fetchTrackEnrichmentRows(admin, trackId);
  return mergeEnrichmentRowsToSnapshot(trackId, rows);
}

/** Merge helper when rows are already loaded with the same admin/session scope. */
export function buildTrackIntelSnapshotFromRows(
  trackId: string,
  rows: EnrichmentValueRow[],
): TrackIntelSnapshot {
  return mergeEnrichmentRowsToSnapshot(trackId, rows);
}

/**
 * Updates catalogue timestamps after enrichment passes caller-defined completeness.
 * Does not enforce completeness — providers decide when to call.
 */
export async function touchTrackLastEnrichedAt(
  admin: AdminClient,
  trackId: string,
  at: Date = new Date(),
): Promise<void> {
  assertAdminClient(admin);
  const { error } = await admin
    .from("tracks")
    .update({ last_enriched_at: at.toISOString() })
    .eq("id", trackId);

  if (error) {
    throw new Error(`[enrichment] touch last_enriched_at failed: ${error.message}`);
  }
}
