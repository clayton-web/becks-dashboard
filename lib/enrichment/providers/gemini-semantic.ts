import type { Json } from "@/types/supabase";

import {
  ENRICHMENT_FIELD,
  ENRICHMENT_SOURCE,
} from "@/lib/enrichment/fields";
import type { TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import type { TrackEnrichmentUpsertInput } from "@/lib/enrichment/upsert-types";
import { createHash } from "node:crypto";

export const GEMINI_SEMANTIC_LIMITS = {
  moodTags: 5,
  themes: 5,
  lyricKeywords: 10,
  semanticTags: 10,
} as const;

const ALLOWED_KEYS = new Set([
  "moodTags",
  "themes",
  "lyricKeywords",
  "semanticTags",
]);

const FORBIDDEN_KEYS = new Set([
  "bpm",
  "key",
  "camelot",
  "energy",
  "danceability",
  "valence",
  "loudness",
]);

export type GeminiSemanticSourcePayload = {
  input_hash: string;
};

export type GeminiSemanticValidated = {
  moodTags: string[];
  themes: string[];
  lyricKeywords: string[];
  semanticTags: string[];
};

export type GeminiSemanticProviderInput = {
  title: string;
  artist: string;
  album: string | null;
  genreTags: readonly string[];
  lyricExcerpt: string | null;
  snapshot: Pick<
    TrackIntelSnapshot,
    | "bpm"
    | "key"
    | "camelot"
    | "energy"
    | "danceability"
    | "valence"
    | "loudness"
  >;
};

const LYRIC_EXCERPT_MAX = 1800;
const TAG_STRING_MAX = 80;

function clampStringArray(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim().slice(0, TAG_STRING_MAX);
    if (t.length === 0) continue;
    out.push(t);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function excerptLyricsPlain(lyricsPlain: string | null): string | null {
  if (lyricsPlain == null) return null;
  const n = normalizeWhitespace(lyricsPlain);
  if (n.length === 0) return null;
  return n.length <= LYRIC_EXCERPT_MAX ? n : `${n.slice(0, LYRIC_EXCERPT_MAX)}…`;
}

/**
 * Stable hash for skip/re-enrich decisions when deterministic context or lyrics excerpt changes.
 */
export function computeSemanticInputHash(input: GeminiSemanticProviderInput): string {
  const genres = [...input.genreTags].map((g) => g.trim()).filter(Boolean).sort();
  const canonical = {
    title: input.title.trim(),
    artist: input.artist.trim(),
    album: input.album?.trim() ?? "",
    genres,
    lyricExcerpt: input.lyricExcerpt ?? "",
    bpm: input.snapshot.bpm.value,
    key: input.snapshot.key.value,
    camelot: input.snapshot.camelot.value,
    energy: input.snapshot.energy.value,
    danceability: input.snapshot.danceability.value,
    valence: input.snapshot.valence.value,
    loudness: input.snapshot.loudness.value,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 24);
}

export type GeminiSemanticParseResult =
  | { ok: true; value: GeminiSemanticValidated }
  | { ok: false; error: string };

export function parseGeminiSemanticJson(text: string): GeminiSemanticParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "expected_object" };
  }

  const rec = parsed as Record<string, unknown>;
  for (const k of Object.keys(rec)) {
    const lower = k.toLowerCase();
    if (FORBIDDEN_KEYS.has(lower)) {
      return { ok: false, error: `forbidden_field:${k}` };
    }
    if (!ALLOWED_KEYS.has(k)) {
      return { ok: false, error: `unexpected_field:${k}` };
    }
  }

  const moodTags = clampStringArray(rec.moodTags, GEMINI_SEMANTIC_LIMITS.moodTags);
  const themes = clampStringArray(rec.themes, GEMINI_SEMANTIC_LIMITS.themes);
  const lyricKeywords = clampStringArray(
    rec.lyricKeywords,
    GEMINI_SEMANTIC_LIMITS.lyricKeywords,
  );
  const semanticTags = clampStringArray(
    rec.semanticTags,
    GEMINI_SEMANTIC_LIMITS.semanticTags,
  );

  return {
    ok: true,
    value: { moodTags, themes, lyricKeywords, semanticTags },
  };
}

export function buildGeminiSemanticSystemInstruction(): string {
  return [
    "You annotate music tracks with concise semantic labels only.",
    "Use title, artist, album, genres, optional lyric excerpt, and the supplied Spotify/measured audio metrics only as context.",
    "Do NOT output or infer BPM, musical key, Camelot wheel codes, energy, danceability, valence, loudness, tempo, or tuning.",
    "Do NOT repeat artist or song title as tags unless they encode a clear theme.",
    "Prefer short English phrases (1–3 words). Avoid duplicates across arrays.",
    "If lyrics are missing, leave lyric-heavy arrays sparse rather than inventing lines.",
    "Respond strictly as JSON matching the requested schema.",
  ].join(" ");
}

export function buildGeminiSemanticUserPrompt(input: GeminiSemanticProviderInput): string {
  const lines: string[] = [
    `Title: ${input.title}`,
    `Artist: ${input.artist}`,
    `Album: ${input.album?.trim() || "(unknown)"}`,
    `Genres: ${input.genreTags.length ? input.genreTags.join(", ") : "(none)"}`,
    "",
    "Context audio metrics (do not output these; deterministic sources own them):",
    `- BPM: ${input.snapshot.bpm.value ?? "unknown"}`,
    `- Key: ${input.snapshot.key.value ?? "unknown"}`,
    `- Camelot: ${input.snapshot.camelot.value ?? "unknown"}`,
    `- Energy 0–1: ${input.snapshot.energy.value ?? "unknown"}`,
    `- Danceability 0–1: ${input.snapshot.danceability.value ?? "unknown"}`,
    `- Valence 0–1: ${input.snapshot.valence.value ?? "unknown"}`,
    `- Loudness dB: ${input.snapshot.loudness.value ?? "unknown"}`,
    "",
  ];

  if (input.lyricExcerpt) {
    lines.push("Lyric excerpt (may be truncated):", input.lyricExcerpt, "");
  } else {
    lines.push("Lyrics excerpt: (not available)", "");
  }

  lines.push(
    "Return JSON with moodTags, themes, lyricKeywords, semanticTags arrays only.",
  );

  return lines.join("\n");
}

export function geminiSemanticValidatedToUpserts(
  trackId: string,
  validated: GeminiSemanticValidated,
  inputHash: string,
): TrackEnrichmentUpsertInput[] {
  const meta = { input_hash: inputHash } satisfies GeminiSemanticSourcePayload;

  return [
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.MOOD_TAGS,
      source: ENRICHMENT_SOURCE.GEMINI,
      fieldValue: { tags: validated.moodTags } as Json,
      confidence: null,
      sourcePayload: meta as unknown as Json,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.THEMES,
      source: ENRICHMENT_SOURCE.GEMINI,
      fieldValue: { themes: validated.themes } as Json,
      confidence: null,
      sourcePayload: meta as unknown as Json,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.LYRIC_KEYWORDS,
      source: ENRICHMENT_SOURCE.GEMINI,
      fieldValue: { keywords: validated.lyricKeywords } as Json,
      confidence: null,
      sourcePayload: meta as unknown as Json,
    },
    {
      trackId,
      fieldName: ENRICHMENT_FIELD.SEMANTIC_TAGS,
      source: ENRICHMENT_SOURCE.GEMINI,
      fieldValue: { tags: validated.semanticTags } as Json,
      confidence: null,
      sourcePayload: meta as unknown as Json,
    },
  ];
}

export type GeminiSemanticProbeRow = {
  track_id: string;
  field_name: string;
  source_payload: Json | null;
};

export type GeminiSemanticProbeState = {
  complete: boolean;
  moodInputHash: string | null;
};

const GEMINI_SEMANTIC_FIELDS = [
  ENRICHMENT_FIELD.MOOD_TAGS,
  ENRICHMENT_FIELD.THEMES,
  ENRICHMENT_FIELD.LYRIC_KEYWORDS,
  ENRICHMENT_FIELD.SEMANTIC_TAGS,
] as const;

export function mergeGeminiSemanticProbeRows(
  rows: GeminiSemanticProbeRow[],
): Map<string, GeminiSemanticProbeState> {
  const byTrack = new Map<
    string,
    { fields: Set<string>; moodPayload: Json | null }
  >();

  for (const row of rows) {
    const id = row.track_id;
    const slot = byTrack.get(id) ?? {
      fields: new Set<string>(),
      moodPayload: null as Json | null,
    };
    slot.fields.add(row.field_name);
    if (row.field_name === ENRICHMENT_FIELD.MOOD_TAGS) {
      slot.moodPayload = row.source_payload;
    }
    byTrack.set(id, slot);
  }

  const out = new Map<string, GeminiSemanticProbeState>();
  for (const [trackId, slot] of byTrack) {
    const complete = GEMINI_SEMANTIC_FIELDS.every((f) => slot.fields.has(f));
    let moodInputHash: string | null = null;
    if (slot.moodPayload && typeof slot.moodPayload === "object" && !Array.isArray(slot.moodPayload)) {
      const h = (slot.moodPayload as Record<string, unknown>).input_hash;
      moodInputHash = typeof h === "string" && h.trim() ? h.trim() : null;
    }
    out.set(trackId, { complete, moodInputHash });
  }

  return out;
}

export function shouldSkipGeminiSemanticCall(args: {
  force: boolean;
  probe: GeminiSemanticProbeState | undefined;
  computedHash: string;
}): boolean {
  if (args.force) return false;
  const p = args.probe;
  if (!p?.complete) return false;
  if (p.moodInputHash === args.computedHash) return true;
  // Legacy rows without hash: treat as satisfied for MVP (avoid surprise spend).
  if (p.moodInputHash == null) return true;
  return false;
}
