/**
 * MVP canonical semantic labels for scoring-facing normalization.
 * Gemini raw tags map here when there is a clear synonym; otherwise the
 * trimmed/lowercased original is kept.
 */
export const CANONICAL_SEMANTIC_TAGS = [
  "aggressive",
  "atmospheric",
  "bright",
  "chill",
  "club",
  "dark",
  "emotional",
  "energetic",
  "euphoric",
  "instrumental",
  "late-night",
  "melancholic",
  "nostalgic",
  "playful",
  "romantic",
  "sexy",
  "summer",
  "vocal",
] as const;

export type CanonicalSemanticTag = (typeof CANONICAL_SEMANTIC_TAGS)[number];

export const CANONICAL_SEMANTIC_TAG_SET: ReadonlySet<string> = new Set(
  CANONICAL_SEMANTIC_TAGS,
);

/**
 * Whole-string matches after trim + lowercase. Keys must be normalized form.
 * Values must be members of CANONICAL_SEMANTIC_TAGS.
 */
export const SEMANTIC_SYNONYM_TO_CANONICAL: Readonly<
  Record<string, CanonicalSemanticTag>
> = {
  // dark
  brooding: "dark",
  grim: "dark",
  gloomy: "dark",
  moody: "dark",
  ominous: "dark",
  shadowy: "dark",
  sinister: "dark",
  "dark vibe": "dark",
  "dark mood": "dark",

  // bright
  upbeat: "bright",
  cheerful: "bright",
  happy: "bright",
  joyous: "bright",
  sunny: "bright",
  uplifting: "bright",
  lighthearted: "bright",

  // euphoric
  ecstatic: "euphoric",
  euphoria: "euphoric",
  blissful: "euphoric",

  // melancholic
  melancholy: "melancholic",
  sorrowful: "melancholic",
  wistful: "melancholic",
  bittersweet: "melancholic",

  // romantic
  intimate: "romantic",
  tender: "romantic",
  "love song": "romantic",

  // aggressive
  angry: "aggressive",
  fierce: "aggressive",
  intense: "aggressive",
  "hard-hitting": "aggressive",

  // chill
  chilled: "chill",
  mellow: "chill",
  relaxed: "chill",
  "laid-back": "chill",
  "low-key": "chill",
  "easy listening": "chill",

  // energetic
  "high energy": "energetic",
  "high-energy": "energetic",
  pumped: "energetic",
  "driving beat": "energetic",

  // sexy
  seductive: "sexy",
  sensual: "sexy",
  sultry: "sexy",

  // playful
  whimsical: "playful",
  cheeky: "playful",

  // nostalgic
  nostalgia: "nostalgic",
  throwback: "nostalgic",
  retro: "nostalgic",

  // atmospheric
  ethereal: "atmospheric",
  spacious: "atmospheric",

  // vocal / instrumental (often repeated across providers)
  vocals: "vocal",
  "vocal-forward": "vocal",
  "singing-focused": "vocal",
  "no vocals": "instrumental",

  // club
  dancefloor: "club",
  "club ready": "club",
  "club-ready": "club",

  // late-night
  "night drive": "late-night",
  nighttime: "late-night",
  nocturnal: "late-night",
  "after hours": "late-night",
  "late night": "late-night",

  // summer
  summery: "summer",
  summertime: "summer",
  "beach vibes": "summer",

  // emotional
  heartfelt: "emotional",
  vulnerable: "emotional",
};
