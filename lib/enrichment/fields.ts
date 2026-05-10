/**
 * Stable enrichment keys for `track_enrichment_values.field_name` and payload shapes
 * stored in `field_value` (jsonb). Downstream providers must use these constants —
 * avoid raw strings at call sites.
 */

export const ENRICHMENT_SOURCE = {
  SPOTIFY: "spotify",
  INTERNAL: "internal",
  LRCLIB: "lrclib",
  GEMINI: "gemini",
} as const;

export type EnrichmentSource =
  (typeof ENRICHMENT_SOURCE)[keyof typeof ENRICHMENT_SOURCE];

export const ENRICHMENT_FIELD = {
  BPM: "bpm",
  KEY: "key",
  CAMELOT: "camelot",
  ENERGY: "energy",
  DANCEABILITY: "danceability",
  VALENCE: "valence",
  LOUDNESS: "loudness",
  MOOD_TAGS: "mood_tags",
  GENRE_TAGS: "genre_tags",
  THEMES: "themes",
  LYRIC_KEYWORDS: "lyric_keywords",
  LYRICS_PLAIN: "lyrics_plain",
  SEMANTIC_TAGS: "semantic_tags",
} as const;

export type EnrichmentFieldName =
  (typeof ENRICHMENT_FIELD)[keyof typeof ENRICHMENT_FIELD];

export const ALL_ENRICHMENT_FIELDS: readonly EnrichmentFieldName[] = [
  ENRICHMENT_FIELD.BPM,
  ENRICHMENT_FIELD.KEY,
  ENRICHMENT_FIELD.CAMELOT,
  ENRICHMENT_FIELD.ENERGY,
  ENRICHMENT_FIELD.DANCEABILITY,
  ENRICHMENT_FIELD.VALENCE,
  ENRICHMENT_FIELD.LOUDNESS,
  ENRICHMENT_FIELD.MOOD_TAGS,
  ENRICHMENT_FIELD.GENRE_TAGS,
  ENRICHMENT_FIELD.THEMES,
  ENRICHMENT_FIELD.LYRIC_KEYWORDS,
  ENRICHMENT_FIELD.LYRICS_PLAIN,
  ENRICHMENT_FIELD.SEMANTIC_TAGS,
];

/** Spotify + internal numeric/text features — Gemini must never win these slots. */
export const DETERMINISTIC_FIELDS: readonly EnrichmentFieldName[] = [
  ENRICHMENT_FIELD.BPM,
  ENRICHMENT_FIELD.KEY,
  ENRICHMENT_FIELD.CAMELOT,
  ENRICHMENT_FIELD.ENERGY,
  ENRICHMENT_FIELD.DANCEABILITY,
  ENRICHMENT_FIELD.VALENCE,
  ENRICHMENT_FIELD.LOUDNESS,
];

/**
 * Source precedence lists (first wins). Used only for rows whose `field_name`
 * matches the snapshot slot.
 */
export const PRECEDENCE_DETERMINISTIC_AUDIO: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.SPOTIFY,
  ENRICHMENT_SOURCE.INTERNAL,
];

/** Normalized catalogue genres — internal normalization beats Spotify metadata beats Gemini hints. */
export const PRECEDENCE_GENRE_TAGS: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.INTERNAL,
  ENRICHMENT_SOURCE.SPOTIFY,
  ENRICHMENT_SOURCE.GEMINI,
];

/** Moods — Gemini primary; others optional fallback if populated later. */
export const PRECEDENCE_MOOD_TAGS: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.GEMINI,
  ENRICHMENT_SOURCE.INTERNAL,
  ENRICHMENT_SOURCE.SPOTIFY,
];

export const PRECEDENCE_THEMES: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.GEMINI,
  ENRICHMENT_SOURCE.INTERNAL,
];

export const PRECEDENCE_LYRIC_KEYWORDS: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.GEMINI,
  ENRICHMENT_SOURCE.INTERNAL,
];

/** Lyrics body — LRCLIB only in MVP provider mix. */
export const PRECEDENCE_LYRICS_PLAIN: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.LRCLIB,
];

export const PRECEDENCE_SEMANTIC_TAGS: readonly EnrichmentSource[] = [
  ENRICHMENT_SOURCE.GEMINI,
  ENRICHMENT_SOURCE.INTERNAL,
];

export function isEnrichmentSource(value: string): value is EnrichmentSource {
  return (Object.values(ENRICHMENT_SOURCE) as string[]).includes(value);
}

export function isEnrichmentFieldName(value: string): value is EnrichmentFieldName {
  return (ALL_ENRICHMENT_FIELDS as readonly string[]).includes(value);
}

// --- Payload conventions (json stored in `field_value`) -----------------------

/** Scalar measurements from Spotify audio features or internal normalization. */
export type ScalarPayload = {
  value: number | null;
};

export type KeyPayload = {
  /** Display-ready key label, e.g. `"A minor"`. */
  label: string | null;
};

export type CamelotPayload = {
  /** Camelot wheel code, e.g. `"8A"`. */
  code: string | null;
};

/** Loudness is typically negative dB — still stored as a scalar `value`. */
export type TagsPayload = {
  tags: string[];
};

export type TextListPayload = {
  /** Theme / narrative labels. */
  themes: string[];
};

export type KeywordsPayload = {
  keywords: string[];
};

export type LyricsPlainPayload = {
  text: string | null;
};
