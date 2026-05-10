import type { Json } from "@/types/supabase";

import {
  ENRICHMENT_FIELD,
  PRECEDENCE_DETERMINISTIC_AUDIO,
  PRECEDENCE_GENRE_TAGS,
  PRECEDENCE_LYRIC_KEYWORDS,
  PRECEDENCE_LYRICS_PLAIN,
  PRECEDENCE_MOOD_TAGS,
  PRECEDENCE_SEMANTIC_TAGS,
  PRECEDENCE_THEMES,
  type CamelotPayload,
  type EnrichmentFieldName,
  type EnrichmentSource,
  type KeyPayload,
  type KeywordsPayload,
  type LyricsPlainPayload,
  type ScalarPayload,
  type TagsPayload,
  type TextListPayload,
  isEnrichmentFieldName,
  isEnrichmentSource,
} from "@/lib/enrichment/fields";

/** Shape matched by DB selects / tests — keeps merge unit-testable without Supabase. */
export type EnrichmentValueRow = {
  track_id: string;
  field_name: string;
  field_value: Json;
  source: string;
  confidence: number | null;
};

export type FieldProvenance = {
  source: EnrichmentSource;
  confidence: number | null;
};

export type ResolvedScalar = {
  value: number | null;
  provenance: FieldProvenance | null;
};

export type ResolvedText = {
  value: string | null;
  provenance: FieldProvenance | null;
};

export type ResolvedTags = {
  value: readonly string[];
  provenance: FieldProvenance | null;
};

/**
 * Single merged view for scoring / UI. Deterministic slots ignore Gemini/LRCLIB rows
 * via precedence lists on those fields (see `fields.ts`).
 */
export type TrackIntelSnapshot = {
  trackId: string;
  bpm: ResolvedScalar;
  key: ResolvedText;
  camelot: ResolvedText;
  energy: ResolvedScalar;
  danceability: ResolvedScalar;
  valence: ResolvedScalar;
  loudness: ResolvedScalar;
  moodTags: ResolvedTags;
  genreTags: ResolvedTags;
  themes: ResolvedTags;
  lyricKeywords: ResolvedTags;
  lyricsPlain: ResolvedText;
  semanticTags: ResolvedTags;
};

type NarrowRow = EnrichmentValueRow & {
  field_name: EnrichmentFieldName;
  source: EnrichmentSource;
};

function asRecord(json: Json): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as Record<string, unknown>;
}

function parseScalarPayload(json: Json): number | null {
  const o = asRecord(json);
  if (!o) return null;
  const v = o.value;
  if (v == null) return null;
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return v;
}

function parseKeyPayload(json: Json): string | null {
  const o = asRecord(json);
  if (!o) return null;
  const label = o.label;
  if (label == null) return null;
  if (typeof label !== "string") return null;
  const t = label.trim();
  return t === "" ? null : t;
}

function parseCamelotPayload(json: Json): string | null {
  const o = asRecord(json);
  if (!o) return null;
  const code = o.code;
  if (code == null) return null;
  if (typeof code !== "string") return null;
  const t = code.trim();
  return t === "" ? null : t;
}

function parseTagsPayload(json: Json): string[] {
  const o = asRecord(json);
  if (!o) return [];
  const raw = o.tags;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t !== "") out.push(t);
  }
  return out;
}

function parseThemesPayload(json: Json): string[] {
  const o = asRecord(json);
  if (!o) return [];
  const raw = o.themes;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t !== "") out.push(t);
  }
  return out;
}

function parseKeywordsPayload(json: Json): string[] {
  const o = asRecord(json);
  if (!o) return [];
  const raw = o.keywords;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t !== "") out.push(t);
  }
  return out;
}

function parseLyricsPlainPayload(json: Json): string | null {
  const o = asRecord(json);
  if (!o) return null;
  const text = o.text;
  if (text == null) return null;
  if (typeof text !== "string") return null;
  const t = text.trim();
  return t === "" ? null : t;
}

function narrowRowsForTrack(
  trackId: string,
  rows: EnrichmentValueRow[],
): NarrowRow[] {
  const out: NarrowRow[] = [];
  for (const r of rows) {
    if (r.track_id !== trackId) continue;
    if (!isEnrichmentFieldName(r.field_name)) continue;
    if (!isEnrichmentSource(r.source)) continue;
    out.push({
      ...r,
      field_name: r.field_name,
      source: r.source,
    });
  }
  return out;
}

function pickScalar(
  rows: NarrowRow[],
  fieldName: EnrichmentFieldName,
  precedence: readonly EnrichmentSource[],
  parse: (json: Json) => number | null,
): ResolvedScalar {
  for (const source of precedence) {
    const row = rows.find(
      (x) => x.field_name === fieldName && x.source === source,
    );
    if (!row) continue;
    const value = parse(row.field_value);
    if (value != null) {
      return {
        value,
        provenance: { source, confidence: row.confidence },
      };
    }
  }
  return { value: null, provenance: null };
}

function pickText(
  rows: NarrowRow[],
  fieldName: EnrichmentFieldName,
  precedence: readonly EnrichmentSource[],
  parse: (json: Json) => string | null,
): ResolvedText {
  for (const source of precedence) {
    const row = rows.find(
      (x) => x.field_name === fieldName && x.source === source,
    );
    if (!row) continue;
    const value = parse(row.field_value);
    if (value != null) {
      return {
        value,
        provenance: { source, confidence: row.confidence },
      };
    }
  }
  return { value: null, provenance: null };
}

function pickTags(
  rows: NarrowRow[],
  fieldName: EnrichmentFieldName,
  precedence: readonly EnrichmentSource[],
  parse: (json: Json) => string[],
): ResolvedTags {
  for (const source of precedence) {
    const row = rows.find(
      (x) => x.field_name === fieldName && x.source === source,
    );
    if (!row) continue;
    const value = parse(row.field_value);
    if (value.length > 0) {
      return {
        value,
        provenance: { source, confidence: row.confidence },
      };
    }
  }
  return { value: [], provenance: null };
}

/** Merge raw enrichment rows into a single snapshot for one track. */
export function mergeEnrichmentRowsToSnapshot(
  trackId: string,
  rows: EnrichmentValueRow[],
): TrackIntelSnapshot {
  const narrow = narrowRowsForTrack(trackId, rows);

  return {
    trackId,
    bpm: pickScalar(
      narrow,
      ENRICHMENT_FIELD.BPM,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseScalarPayload,
    ),
    key: pickText(
      narrow,
      ENRICHMENT_FIELD.KEY,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseKeyPayload,
    ),
    camelot: pickText(
      narrow,
      ENRICHMENT_FIELD.CAMELOT,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseCamelotPayload,
    ),
    energy: pickScalar(
      narrow,
      ENRICHMENT_FIELD.ENERGY,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseScalarPayload,
    ),
    danceability: pickScalar(
      narrow,
      ENRICHMENT_FIELD.DANCEABILITY,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseScalarPayload,
    ),
    valence: pickScalar(
      narrow,
      ENRICHMENT_FIELD.VALENCE,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseScalarPayload,
    ),
    loudness: pickScalar(
      narrow,
      ENRICHMENT_FIELD.LOUDNESS,
      PRECEDENCE_DETERMINISTIC_AUDIO,
      parseScalarPayload,
    ),
    moodTags: pickTags(
      narrow,
      ENRICHMENT_FIELD.MOOD_TAGS,
      PRECEDENCE_MOOD_TAGS,
      parseTagsPayload,
    ),
    genreTags: pickTags(
      narrow,
      ENRICHMENT_FIELD.GENRE_TAGS,
      PRECEDENCE_GENRE_TAGS,
      parseTagsPayload,
    ),
    themes: pickTags(
      narrow,
      ENRICHMENT_FIELD.THEMES,
      PRECEDENCE_THEMES,
      parseThemesPayload,
    ),
    lyricKeywords: pickTags(
      narrow,
      ENRICHMENT_FIELD.LYRIC_KEYWORDS,
      PRECEDENCE_LYRIC_KEYWORDS,
      parseKeywordsPayload,
    ),
    lyricsPlain: pickText(
      narrow,
      ENRICHMENT_FIELD.LYRICS_PLAIN,
      PRECEDENCE_LYRICS_PLAIN,
      parseLyricsPlainPayload,
    ),
    semanticTags: pickTags(
      narrow,
      ENRICHMENT_FIELD.SEMANTIC_TAGS,
      PRECEDENCE_SEMANTIC_TAGS,
      parseTagsPayload,
    ),
  };
}

/** Type guards for authored payloads (optional use at provider boundaries). */
export function isScalarPayload(value: unknown): value is ScalarPayload {
  const o = value as ScalarPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    (o.value === null || typeof o.value === "number")
  );
}

export function isKeyPayload(value: unknown): value is KeyPayload {
  const o = value as KeyPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    (o.label === null || typeof o.label === "string")
  );
}

export function isCamelotPayload(value: unknown): value is CamelotPayload {
  const o = value as CamelotPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    (o.code === null || typeof o.code === "string")
  );
}

export function isTagsPayload(value: unknown): value is TagsPayload {
  const o = value as TagsPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    Array.isArray(o.tags) &&
    o.tags.every((t) => typeof t === "string")
  );
}

export function isThemesPayload(value: unknown): value is TextListPayload {
  const o = value as TextListPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    Array.isArray(o.themes) &&
    o.themes.every((t) => typeof t === "string")
  );
}

export function isKeywordsPayload(value: unknown): value is KeywordsPayload {
  const o = value as KeywordsPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    Array.isArray(o.keywords) &&
    o.keywords.every((k) => typeof k === "string")
  );
}

export function isLyricsPlainPayload(value: unknown): value is LyricsPlainPayload {
  const o = value as LyricsPlainPayload | null;
  return (
    !!o &&
    typeof o === "object" &&
    (o.text === null || typeof o.text === "string")
  );
}
