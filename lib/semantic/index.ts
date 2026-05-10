export {
  CANONICAL_SEMANTIC_TAGS,
  CANONICAL_SEMANTIC_TAG_SET,
  SEMANTIC_SYNONYM_TO_CANONICAL,
  type CanonicalSemanticTag,
} from "@/lib/semantic/taxonomy";

export {
  buildNormalizedSemanticSignals,
  normalizeLyricKeywords,
  normalizeMoodTags,
  normalizeSemanticLabel,
  normalizeSemanticRaw,
  normalizeSemanticTags,
  normalizeThemes,
  synonymTargetsCanonical,
  type NormalizedSemanticSignals,
  type SemanticNormalizationKind,
} from "@/lib/semantic/normalize";

export {
  normalizedSemanticSignalsFromSnapshot,
} from "@/lib/semantic/signals";
