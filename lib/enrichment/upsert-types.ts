import type { EnrichmentFieldName, EnrichmentSource } from "@/lib/enrichment/fields";
import type { Json } from "@/types/supabase";

export type TrackEnrichmentUpsertInput = {
  trackId: string;
  fieldName: EnrichmentFieldName;
  source: EnrichmentSource;
  fieldValue: Json;
  confidence?: number | null;
  sourcePayload?: Json | null;
};
