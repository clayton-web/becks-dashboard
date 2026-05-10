import type { TrackIntelSnapshot } from "@/lib/enrichment/read-model";
import { camelotDistance } from "@/lib/music/key-camelot";
import type { RecommendationCandidateTrack } from "@/lib/recommendations/candidates-core";
import type { RecommendationDirectionId } from "@/lib/recommendations/directions";

import type { NormalizedSemanticSignals } from "@/lib/semantic/normalize";

/** Default max ranked rows returned per direction column. */
export const DEFAULT_MAX_RESULTS_PER_DIRECTION = 50;

export type DirectionScoreFacts = {
  bpmDelta: number | null;
  camelotDistance: number | null;
  energyDelta: number | null;
  sharedSemanticTags: string[];
  moodShift: string | null;
};

export type ScoringReferenceTrack = Pick<
  RecommendationCandidateTrack,
  "trackId" | "intel" | "semantics"
>;

export type DirectionScoreBundle = {
  score: number;
  scoreBreakdown: Record<string, number>;
  facts: DirectionScoreFacts;
};

function nNum(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return v;
}

function nStr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function clamp0100(x: number): number {
  return Math.min(100, Math.max(0, Math.round(x)));
}

function sortedIntersection(a: readonly string[], b: readonly string[]): string[] {
  const B = new Set(b);
  const out = [...new Set(a.filter((x) => B.has(x)))];
  out.sort((x, y) => x.localeCompare(y));
  return out;
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter += 1;
  }
  const uni = A.size + B.size - inter;
  if (uni === 0) return 0;
  return inter / uni;
}

function countSemanticHits(all: readonly string[], tags: ReadonlySet<string>): number {
  let n = 0;
  for (const t of all) {
    if (tags.has(t)) n += 1;
  }
  return n;
}

const GO_DARKER_SEMANTICS = new Set([
  "dark",
  "late-night",
  "melancholic",
  "atmospheric",
]);
const GO_BRIGHTER_SEMANTICS = new Set(["bright", "euphoric", "summer", "playful"]);

export function computeMoodShiftLabel(
  ref: NormalizedSemanticSignals,
  cand: NormalizedSemanticSignals,
): string | null {
  const refDark = countSemanticHits(ref.all, GO_DARKER_SEMANTICS);
  const candDark = countSemanticHits(cand.all, GO_DARKER_SEMANTICS);
  const refBright = countSemanticHits(ref.all, GO_BRIGHTER_SEMANTICS);
  const candBright = countSemanticHits(cand.all, GO_BRIGHTER_SEMANTICS);

  if (candDark - refDark >= 1 && candBright <= refBright + 0) {
    return "darker";
  }
  if (candBright - refBright >= 1 && candDark <= refDark + 0) {
    return "brighter";
  }
  return null;
}

export function computeDirectionScoreFacts(
  refI: TrackIntelSnapshot,
  candI: TrackIntelSnapshot,
  refS: NormalizedSemanticSignals,
  candS: NormalizedSemanticSignals,
): DirectionScoreFacts {
  const rb = nNum(refI.bpm.value);
  const cb = nNum(candI.bpm.value);
  const bpmDelta = rb != null && cb != null ? cb - rb : null;

  const rc = nStr(refI.camelot.value);
  const cc = nStr(candI.camelot.value);
  const camelotDistanceVal =
    rc != null && cc != null ? camelotDistance(rc, cc) : null;

  const re = nNum(refI.energy.value);
  const ce = nNum(candI.energy.value);
  const energyDelta = re != null && ce != null ? ce - re : null;

  const sharedSemanticTags = sortedIntersection(refS.all, candS.all);

  const moodShift = computeMoodShiftLabel(refS, candS);

  return {
    bpmDelta,
    camelotDistance: camelotDistanceVal,
    energyDelta,
    sharedSemanticTags,
    moodShift,
  };
}

function subscoreBpmTight(deltaAbs: number): number {
  if (deltaAbs <= 1) return 100;
  if (deltaAbs <= 4) return 92;
  if (deltaAbs <= 8) return 78;
  if (deltaAbs <= 14) return 62;
  if (deltaAbs <= 22) return 46;
  return Math.max(5, 38 - Math.floor((deltaAbs - 22) * 1.1));
}

function subscoreBpmLoose(deltaAbs: number): number {
  if (deltaAbs <= 6) return 100;
  if (deltaAbs <= 12) return 88;
  if (deltaAbs <= 20) return 72;
  if (deltaAbs <= 30) return 54;
  return Math.max(8, 42 - Math.floor((deltaAbs - 30) * 0.9));
}

function subscoreBpmHarmonicFriendly(deltaAbs: number): number {
  if (deltaAbs <= 8) return 100;
  if (deltaAbs <= 14) return 82;
  if (deltaAbs <= 22) return 64;
  if (deltaAbs <= 34) return 44;
  return Math.max(10, 34 - Math.floor((deltaAbs - 34) * 0.75));
}

function subscoreCamelot(dist: number | null): number {
  if (dist === null) return 48;
  if (dist === 0) return 100;
  if (dist === 1) return 88;
  if (dist === 2) return 70;
  if (dist <= 4) return 52;
  return 30;
}

function subscoreEnergyTight(deltaAbs: number): number {
  if (deltaAbs <= 0.04) return 100;
  if (deltaAbs <= 0.1) return 84;
  if (deltaAbs <= 0.18) return 68;
  if (deltaAbs <= 0.28) return 52;
  return Math.max(12, 42 - Math.floor(deltaAbs * 90));
}

function genreBridgeShape(j: number): number {
  if (j <= 0.06) return 24;
  if (j <= 0.38) return Math.round(26 + ((j - 0.06) / 0.32) * 56);
  if (j <= 0.82) return Math.round(82 - ((j - 0.38) / 0.44) * 36);
  return Math.max(30, Math.round(46 - ((j - 0.82) / 0.18) * 22));
}

function resetBpmScore(deltaAbs: number): number {
  if (deltaAbs < 6) return 18;
  if (deltaAbs <= 14) return 52;
  if (deltaAbs <= 28) return 92;
  if (deltaAbs <= 42) return 76;
  return Math.max(22, 58 - Math.floor((deltaAbs - 42) * 1.2));
}

function resetCamelotScore(dist: number | null): number {
  if (dist === null) return 50;
  if (dist === 0) return 22;
  if (dist <= 2) return 86;
  if (dist <= 5) return 72;
  return 44;
}

function resetEnergyDeltaScore(deltaAbs: number | null): number {
  if (deltaAbs == null) return 46;
  if (deltaAbs <= 0.06) return 18;
  if (deltaAbs <= 0.22) return 58;
  return Math.min(100, Math.round(62 + deltaAbs * 95));
}

export function scoreCandidateForDirection(
  directionId: RecommendationDirectionId,
  reference: ScoringReferenceTrack,
  candidate: RecommendationCandidateTrack,
): DirectionScoreBundle {
  const refI = reference.intel;
  const candI = candidate.intel;
  const refS = reference.semantics;
  const candS = candidate.semantics;

  const facts = computeDirectionScoreFacts(refI, candI, refS, candS);
  const bd: Record<string, number> = {};

  const deltaBpmAbs =
    facts.bpmDelta == null ? null : Math.abs(facts.bpmDelta);
  const deltaEnergyAbs =
    facts.energyDelta == null ? null : Math.abs(facts.energyDelta);

  let score = 0;

  switch (directionId) {
    case "stay_similar": {
      const bpm =
        deltaBpmAbs == null ? 46 : subscoreBpmTight(deltaBpmAbs);
      const har = subscoreCamelot(facts.camelotDistance);
      const en =
        facts.energyDelta == null || deltaEnergyAbs == null
          ? 46
          : subscoreEnergyTight(deltaEnergyAbs);
      const sem = Math.round(jaccard(refS.all, candS.all) * 100);
      bd.bpm_fit = Math.round(bpm * 0.28);
      bd.harmonic_fit = Math.round(har * 0.28);
      bd.energy_fit = Math.round(en * 0.28);
      bd.semantic_overlap = Math.round(sem * 0.16);
      score = bd.bpm_fit + bd.harmonic_fit + bd.energy_fit + bd.semantic_overlap;
      break;
    }
    case "bpm_safe": {
      const bpm =
        deltaBpmAbs == null ? 52 : subscoreBpmLoose(deltaBpmAbs);
      const har = subscoreCamelot(facts.camelotDistance);
      const en =
        facts.energyDelta == null || deltaEnergyAbs == null
          ? 48
          : subscoreEnergyTight(deltaEnergyAbs);
      bd.bpm_safe = Math.round(bpm * 0.68);
      bd.harmonic_secondary = Math.round(har * 0.18);
      bd.energy_secondary = Math.round(en * 0.14);
      score = bd.bpm_safe + bd.harmonic_secondary + bd.energy_secondary;
      break;
    }
    case "harmonic_match": {
      const har = subscoreCamelot(facts.camelotDistance);
      const bpm =
        deltaBpmAbs == null ? 50 : subscoreBpmHarmonicFriendly(deltaBpmAbs);
      const sem = Math.round(jaccard(refS.all, candS.all) * 100);
      bd.harmonic_primary = Math.round(har * 0.62);
      bd.bpm_for_mix = Math.round(bpm * 0.28);
      bd.semantic_glue = Math.round(sem * 0.1);
      score = bd.harmonic_primary + bd.bpm_for_mix + bd.semantic_glue;
      break;
    }
    case "lift_energy": {
      const re = nNum(refI.energy.value);
      const ce = nNum(candI.energy.value);
      let lift = 52;
      let gate = 0;
      if (re != null && ce != null) {
        const d = ce - re;
        if (d <= 0.03) {
          lift = 14;
          gate = -28;
        } else {
          lift = clamp0100(Math.round(28 + d * 210));
        }
      }
      const bpm =
        deltaBpmAbs == null ? 48 : subscoreBpmHarmonicFriendly(deltaBpmAbs);
      const har = subscoreCamelot(facts.camelotDistance);
      bd.energy_lift = lift;
      bd.lift_alignment_gate = gate;
      bd.bpm_guardrail = Math.round(bpm * 0.26);
      bd.harmonic_support = Math.round(har * 0.22);
      score = bd.energy_lift + bd.lift_alignment_gate + bd.bpm_guardrail + bd.harmonic_support;
      break;
    }
    case "drop_energy": {
      const re = nNum(refI.energy.value);
      const ce = nNum(candI.energy.value);
      let drop = 52;
      let gate = 0;
      if (re != null && ce != null) {
        const d = ce - re;
        if (d >= -0.03) {
          drop = 14;
          gate = -28;
        } else {
          drop = clamp0100(Math.round(28 + Math.abs(d) * 210));
        }
      }
      const bpm =
        deltaBpmAbs == null ? 48 : subscoreBpmHarmonicFriendly(deltaBpmAbs);
      const har = subscoreCamelot(facts.camelotDistance);
      bd.energy_drop = drop;
      bd.drop_alignment_gate = gate;
      bd.bpm_guardrail = Math.round(bpm * 0.26);
      bd.harmonic_support = Math.round(har * 0.22);
      score = bd.energy_drop + bd.drop_alignment_gate + bd.bpm_guardrail + bd.harmonic_support;
      break;
    }
    case "go_darker": {
      const candDarkHits = countSemanticHits(candS.all, GO_DARKER_SEMANTICS);
      const darkTone = clamp0100(26 + candDarkHits * 22);
      const rv = nNum(refI.valence.value);
      const cv = nNum(candI.valence.value);
      let valSig = 44;
      if (rv != null && cv != null && cv < rv - 0.04) {
        valSig = clamp0100(52 + (rv - cv) * 140);
      } else if (rv != null && cv != null) {
        valSig = 28;
      }
      const har = subscoreCamelot(facts.camelotDistance);
      const bpm =
        deltaBpmAbs == null ? 48 : subscoreBpmHarmonicFriendly(deltaBpmAbs);
      bd.dark_semantics = Math.round(darkTone * 0.38);
      bd.valence_tone = Math.round(valSig * 0.26);
      bd.harmonic_compat = Math.round(har * 0.22);
      bd.bpm_compat = Math.round(bpm * 0.14);
      score =
        bd.dark_semantics + bd.valence_tone + bd.harmonic_compat + bd.bpm_compat;
      break;
    }
    case "go_brighter": {
      const candBrightHits = countSemanticHits(candS.all, GO_BRIGHTER_SEMANTICS);
      const brightTone = clamp0100(26 + candBrightHits * 22);
      const rv = nNum(refI.valence.value);
      const cv = nNum(candI.valence.value);
      let valSig = 44;
      if (rv != null && cv != null && cv > rv + 0.04) {
        valSig = clamp0100(52 + (cv - rv) * 140);
      } else if (rv != null && cv != null) {
        valSig = 28;
      }
      const har = subscoreCamelot(facts.camelotDistance);
      const bpm =
        deltaBpmAbs == null ? 48 : subscoreBpmHarmonicFriendly(deltaBpmAbs);
      bd.bright_semantics = Math.round(brightTone * 0.38);
      bd.valence_tone = Math.round(valSig * 0.26);
      bd.harmonic_compat = Math.round(har * 0.22);
      bd.bpm_compat = Math.round(bpm * 0.14);
      score =
        bd.bright_semantics +
        bd.valence_tone +
        bd.harmonic_compat +
        bd.bpm_compat;
      break;
    }
    case "genre_bridge": {
      const genresRef = refI.genreTags.value ?? [];
      const genresCand = candI.genreTags.value ?? [];
      const gj = jaccard(genresRef, genresCand);
      const genreScore = genreBridgeShape(gj);
      const sem = Math.round(jaccard(refS.all, candS.all) * 100);
      const bpm =
        deltaBpmAbs == null ? 50 : subscoreBpmLoose(deltaBpmAbs);
      bd.genre_partial_overlap = Math.round(genreScore * 0.42);
      bd.semantic_overlap = Math.round(sem * 0.34);
      bd.tempo_neighborhood = Math.round(bpm * 0.24);
      score =
        bd.genre_partial_overlap + bd.semantic_overlap + bd.tempo_neighborhood;
      break;
    }
    case "lyric_wordplay": {
      const refKw = refS.lyricKeywords ?? [];
      const candKw = candS.lyricKeywords ?? [];
      const interKw = sortedIntersection(
        refKw.map((x) => x.toLowerCase()),
        candKw.map((x) => x.toLowerCase()),
      );
      const denom = Math.max(2, refKw.length, candKw.length);
      const kwBase = Math.round((interKw.length / denom) * 100);
      bd.lyric_keyword_overlap = Math.round(kwBase * 0.58);

      const themeOverlap = Math.round(
        jaccard(
          [...refS.themes, ...refS.moodTags],
          [...candS.themes, ...candS.moodTags],
        ) * 100,
      );
      bd.theme_mood_overlap = Math.round(themeOverlap * 0.34);

      let availabilityPct = 100;
      if (refKw.length === 0 && candKw.length === 0) availabilityPct = 42;
      else if (refKw.length === 0 || candKw.length === 0) availabilityPct = 72;

      bd.lyrics_data_weight = availabilityPct;
      let raw = bd.lyric_keyword_overlap + bd.theme_mood_overlap;
      raw = Math.round((raw * availabilityPct) / 100);
      score = clamp0100(raw);
      break;
    }
    case "reset_room": {
      const bpmS =
        deltaBpmAbs == null ? 44 : resetBpmScore(deltaBpmAbs);
      const har = resetCamelotScore(facts.camelotDistance);
      const enS = resetEnergyDeltaScore(
        facts.energyDelta == null ? null : Math.abs(facts.energyDelta),
      );
      const semSep = Math.round((1 - jaccard(refS.all, candS.all)) * 72);
      bd.refresh_tempo_shift = Math.round(bpmS * 0.34);
      bd.refresh_harmonic_distance = Math.round(har * 0.26);
      bd.refresh_energy_change = Math.round(enS * 0.22);
      bd.palette_semantic_distance = Math.round(semSep * 0.18);
      score =
        bd.refresh_tempo_shift +
        bd.refresh_harmonic_distance +
        bd.refresh_energy_change +
        bd.palette_semantic_distance;
      break;
    }
  }

  score = clamp0100(score);
  return { score, scoreBreakdown: bd, facts };
}
