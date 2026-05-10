/**
 * Spotify Audio Features uses pitch class `key` (0–11, −1 unknown) and `mode` (0 minor, 1 major).
 * Camelot codes follow the common DJ wheel (1B–12B major ring, 1A–12A minor ring).
 */

/** Pitch class → Camelot major code (mode major). Index = Spotify `key`. */
const CAMELOT_MAJOR_BY_PITCH_CLASS: readonly string[] = [
  "8B", // 0 C
  "3B", // 1 Db / C#
  "10B", // 2 D
  "5B", // 3 Eb
  "12B", // 4 E
  "7B", // 5 F
  "2B", // 6 Gb / F#
  "9B", // 7 G
  "4B", // 8 Ab / G#
  "11B", // 9 A
  "6B", // 10 Bb / A#
  "1B", // 11 B
];

/** Pitch class → Camelot minor code (mode minor). Index = Spotify `key` (minor root). */
const CAMELOT_MINOR_BY_PITCH_CLASS: readonly string[] = [
  "5A", // 0 C minor
  "12A", // 1 C# minor
  "7A", // 2 D minor
  "2A", // 3 Eb minor
  "9A", // 4 E minor
  "4A", // 5 F minor
  "11A", // 6 F# minor
  "6A", // 7 G minor
  "1A", // 8 Ab minor
  "8A", // 9 A minor
  "3A", // 10 Bb minor
  "10A", // 11 B minor
];

const SHARP_ROOT_NAMES: readonly string[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function isValidSpotifyMode(mode: number): mode is 0 | 1 {
  return mode === 0 || mode === 1;
}

/** Human-readable key like `"C major"` / `"A minor"` — null when Spotify key is unknown (-1). */
export function spotifyKeyModeToLabel(key: number, mode: 0 | 1): string | null {
  if (key < 0 || key > 11) return null;
  const root = SHARP_ROOT_NAMES[key];
  if (!root) return null;
  return mode === 1 ? `${root} major` : `${root} minor`;
}

/** Camelot code from Spotify pitch class + mode — null when key unknown or mode invalid. */
export function spotifyKeyModeToCamelot(
  key: number,
  mode: 0 | 1,
): string | null {
  if (key < 0 || key > 11) return null;
  const codes =
    mode === 1 ? CAMELOT_MAJOR_BY_PITCH_CLASS : CAMELOT_MINOR_BY_PITCH_CLASS;
  return codes[key] ?? null;
}

export type ParsedCamelotCode = {
  num: number;
  letter: "A" | "B";
};

/** Accepts codes like `"8B"` / `"12a"`; trims whitespace. */
export function parseCamelotCode(code: string): ParsedCamelotCode | null {
  const m = code.trim().toUpperCase().match(/^(\d{1,2})([AB])$/);
  if (!m?.[1] || !m[2]) return null;
  const num = Number(m[1]);
  if (!Number.isInteger(num) || num < 1 || num > 12) return null;
  return { num, letter: m[2] as "A" | "B" };
}

function ringDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 12 - d);
}

/**
 * DJ-wheel friendly distance for harmonic prep (lower = closer).
 * Same letter: circular distance on 1–12.
 * Different letter: parallel match (`8B` vs `8A`) → 0; otherwise ring distance + penalty.
 */
export function camelotDistance(left: string, right: string): number | null {
  const p = parseCamelotCode(left);
  const q = parseCamelotCode(right);
  if (!p || !q) return null;

  if (p.letter === q.letter) {
    return ringDistance(p.num, q.num);
  }

  if (p.num === q.num) return 0;

  return ringDistance(p.num, q.num) + 1;
}
