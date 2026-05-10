import {
  CANONICAL_SEMANTIC_TAG_SET,
  SEMANTIC_SYNONYM_TO_CANONICAL,
  type CanonicalSemanticTag,
} from "@/lib/semantic/taxonomy";

export type SemanticNormalizationKind = "tag" | "lyric_keyword";

function unicodeTrimLower(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

/**
 * Normalize free text for dedupe / synonym lookup (trim, Unicode-safe lowercase).
 */
export function normalizeSemanticRaw(input: string): string {
  return unicodeTrimLower(input).replace(/\s+/g, " ");
}

/**
 * Map one raw label to a canonical tag or a preserved normalized token.
 * Uses whole-string synonym lookup only (no substring replacement).
 * Lyric keywords intentionally skip synonym folding to preserve wordplay-friendly tokens.
 */
export function normalizeSemanticLabel(
  raw: string,
  kind: SemanticNormalizationKind = "tag",
): string {
  if (typeof raw !== "string") return "";
  const n = normalizeSemanticRaw(raw);
  if (n === "") return "";

  if (kind === "lyric_keyword") {
    return n;
  }

  if (CANONICAL_SEMANTIC_TAG_SET.has(n)) return n;
  const mapped = SEMANTIC_SYNONYM_TO_CANONICAL[n];
  if (mapped) return mapped;
  return n;
}

function dedupePreserveOrder(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (t === "") continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function normalizeStringList(
  raw: readonly string[] | null | undefined,
  kind: SemanticNormalizationKind,
): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const mapped: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = normalizeSemanticLabel(item, kind);
    if (t !== "") mapped.push(t);
  }
  return dedupePreserveOrder(mapped);
}

export function normalizeMoodTags(tags: readonly string[] | null | undefined): string[] {
  return normalizeStringList(tags, "tag");
}

export function normalizeThemes(tags: readonly string[] | null | undefined): string[] {
  return normalizeStringList(tags, "tag");
}

export function normalizeSemanticTags(tags: readonly string[] | null | undefined): string[] {
  return normalizeStringList(tags, "tag");
}

/**
 * Lyric keywords: same whole-string synonym table, but callers should add few
 * lyric-specific synonyms only — avoids rewriting playful / ambiguous phrases.
 */
export function normalizeLyricKeywords(
  keywords: readonly string[] | null | undefined,
): string[] {
  return normalizeStringList(keywords, "lyric_keyword");
}

export type NormalizedSemanticSignals = {
  moodTags: string[];
  themes: string[];
  lyricKeywords: string[];
  semanticTags: string[];
  /** Ordered merge: moods → themes → lyric keywords → semantic tags; global dedupe. */
  all: string[];
};

function mergeAllOrdered(parts: readonly string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bucket of parts) {
    for (const t of bucket) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function buildNormalizedSemanticSignals(parts: {
  moodTags: readonly string[] | null | undefined;
  themes: readonly string[] | null | undefined;
  lyricKeywords: readonly string[] | null | undefined;
  semanticTags: readonly string[] | null | undefined;
}): NormalizedSemanticSignals {
  const moodTags = normalizeMoodTags(parts.moodTags);
  const themes = normalizeThemes(parts.themes);
  const lyricKeywords = normalizeLyricKeywords(parts.lyricKeywords);
  const semanticTags = normalizeSemanticTags(parts.semanticTags);

  return {
    moodTags,
    themes,
    lyricKeywords,
    semanticTags,
    all: mergeAllOrdered([moodTags, themes, lyricKeywords, semanticTags]),
  };
}

/** Narrow synonym map typing helper for tests / tooling. */
export function synonymTargetsCanonical(): readonly CanonicalSemanticTag[] {
  return [...new Set(Object.values(SEMANTIC_SYNONYM_TO_CANONICAL))];
}
