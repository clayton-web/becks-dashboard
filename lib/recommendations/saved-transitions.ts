import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parsePersistedReasonsV1 } from "@/lib/recommendations/analysis-serialization";
import {
  RECOMMENDATION_DIRECTION_IDS,
  recommendationDirectionLabel,
  type RecommendationDirectionId,
} from "@/lib/recommendations/directions";
import {
  isPostgresUniqueViolation,
  savedTransitionCompositeKey,
} from "@/lib/recommendations/saved-transition-keys";
import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";
import {
  normalizeBreakdownSnapshot,
  normalizeFactsSnapshot,
} from "@/lib/recommendations/saved-transition-snapshot";
import type { Database, Json } from "@/types/supabase";

type UserClient = SupabaseClient<Database>;

const MAX_USER_NOTE_LEN = 2000;

export type SaveBoardTransitionInput = {
  analysisRunId: string;
  directionId: string;
  candidateTrackId: string;
  userNote?: string | null;
};

function isDirectionId(id: string): id is RecommendationDirectionId {
  return (RECOMMENDATION_DIRECTION_IDS as readonly string[]).includes(id);
}

function directionLabelSafe(id: string): string {
  return isDirectionId(id) ? recommendationDirectionLabel(id) : id;
}

function clampNote(note: string | null | undefined): string | null {
  if (note == null) return null;
  const t = note.trim();
  if (!t) return null;
  return t.slice(0, MAX_USER_NOTE_LEN);
}

async function fetchTracksDisplayMap(
  supabase: UserClient,
  ids: string[],
): Promise<Map<string, { title: string; artist: string; missing: boolean }>> {
  const uniq = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, { title: string; artist: string; missing: boolean }>();
  if (uniq.length === 0) return map;

  const CHUNK = 120;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("tracks")
      .select("id,canonical_title,canonical_artist")
      .in("id", slice);
    for (const row of data ?? []) {
      map.set(row.id, {
        title: row.canonical_title,
        artist: row.canonical_artist,
        missing: false,
      });
    }
  }

  for (const id of uniq) {
    if (!map.has(id)) {
      map.set(id, { title: "Unavailable track", artist: "", missing: true });
    }
  }
  return map;
}

function missingDisplay(): { title: string; artist: string; missing: boolean } {
  return { title: "Unavailable track", artist: "", missing: true };
}

export async function fetchSavedCompositeKeysForRun(
  supabase: UserClient,
  userId: string,
  analysisRunId: string,
): Promise<Set<string>> {
  const rid = analysisRunId.trim();
  if (!rid) return new Set();

  const { data, error } = await supabase
    .from("saved_transitions")
    .select("direction_id, candidate_track_id")
    .eq("user_id", userId)
    .eq("analysis_run_id", rid);

  if (error || !data) return new Set();

  const keys = new Set<string>();
  for (const row of data) {
    keys.add(
      savedTransitionCompositeKey(row.direction_id ?? "", row.candidate_track_id ?? ""),
    );
  }
  return keys;
}

export async function saveBoardTransition(
  supabase: UserClient,
  userId: string,
  input: SaveBoardTransitionInput,
): Promise<
  | { ok: true; id: string; duplicate: boolean }
  | {
      ok: false;
      reason:
        | "invalid_direction"
        | "run_not_found"
        | "result_not_found"
        | "db";
      message?: string;
    }
> {
  const directionId = input.directionId.trim();
  const candidateTrackId = input.candidateTrackId.trim();
  const analysisRunId = input.analysisRunId.trim();

  if (!isDirectionId(directionId)) {
    return { ok: false, reason: "invalid_direction" };
  }
  if (!analysisRunId || !candidateTrackId) {
    return { ok: false, reason: "invalid_direction", message: "Missing ids." };
  }

  const { data: run, error: runErr } = await supabase
    .from("analysis_runs")
    .select("id,user_id,rules_version,reference_track_id")
    .eq("id", analysisRunId)
    .eq("user_id", userId)
    .maybeSingle();

  if (runErr || !run) {
    return {
      ok: false,
      reason: "run_not_found",
      message: runErr?.message ?? "Run not found.",
    };
  }

  const { data: resRow, error: resErr } = await supabase
    .from("analysis_track_results")
    .select("score,reasons")
    .eq("analysis_run_id", analysisRunId)
    .eq("track_id", candidateTrackId)
    .eq("result_type", directionId)
    .maybeSingle();

  if (resErr || !resRow) {
    return {
      ok: false,
      reason: "result_not_found",
      message:
        resErr?.message ??
        "No matching recommendation row for this run/direction/track.",
    };
  }

  const parsed = parsePersistedReasonsV1(resRow.reasons);
  const rank = parsed?.rank ?? 9999;
  const explanation =
    parsed?.explanation ?? "Explanation unavailable (legacy or malformed row).";
  const facts = parsed?.facts ?? normalizeFactsSnapshot({} as Json);
  const scoreBreakdown = parsed?.score_breakdown ?? {};
  const scoreNum =
    typeof resRow.score === "number"
      ? Math.round(resRow.score)
      : Number.parseFloat(String(resRow.score ?? 0));

  const insertRow: Database["public"]["Tables"]["saved_transitions"]["Insert"] = {
    user_id: userId,
    analysis_run_id: analysisRunId,
    direction_id: directionId,
    reference_track_id: run.reference_track_id,
    candidate_track_id: candidateTrackId,
    score: Number.isFinite(scoreNum) ? scoreNum : 0,
    rank_at_save: rank,
    explanation,
    facts_snapshot: facts as unknown as Json,
    score_breakdown_snapshot: scoreBreakdown as unknown as Json,
    rules_version_at_save: run.rules_version ?? "",
    user_note: clampNote(input.userNote ?? null),
  };

  const { data: inserted, error: insErr } = await supabase
    .from("saved_transitions")
    .insert(insertRow)
    .select("id")
    .single();

  if (!insErr && inserted?.id) {
    return { ok: true, id: inserted.id, duplicate: false };
  }

  if (isPostgresUniqueViolation(insErr)) {
    const { data: existing, error: exErr } = await supabase
      .from("saved_transitions")
      .select("id")
      .eq("user_id", userId)
      .eq("analysis_run_id", analysisRunId)
      .eq("direction_id", directionId)
      .eq("candidate_track_id", candidateTrackId)
      .maybeSingle();

    if (exErr || !existing?.id) {
      return {
        ok: false,
        reason: "db",
        message: exErr?.message ?? "Duplicate save but row lookup failed.",
      };
    }
    return { ok: true, id: existing.id, duplicate: true };
  }

  return {
    ok: false,
    reason: "db",
    message: insErr?.message ?? "Insert failed.",
  };
}

export async function listSavedTransitionsForUser(
  supabase: UserClient,
  userId: string,
  opts?: { analysisRunId?: string | null },
): Promise<
  { ok: true; items: SavedTransitionListItem[] } | { ok: false; message: string }
> {
  let q = supabase
    .from("saved_transitions")
    .select(
      "id,created_at,analysis_run_id,direction_id,reference_track_id,candidate_track_id,score,rank_at_save,explanation,facts_snapshot,score_breakdown_snapshot,rules_version_at_save,user_note",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const filterRun = opts?.analysisRunId?.trim();
  if (filterRun) {
    q = q.eq("analysis_run_id", filterRun);
  }

  const { data: rows, error } = await q;

  if (error || !rows) {
    return { ok: false, message: error?.message ?? "Query failed." };
  }

  const trackIds = new Set<string>();
  for (const r of rows) {
    if (r.reference_track_id) trackIds.add(r.reference_track_id);
    trackIds.add(r.candidate_track_id);
  }

  const disp = await fetchTracksDisplayMap(supabase, [...trackIds]);

  const items: SavedTransitionListItem[] = rows.map((r) => {
    const refId = r.reference_track_id;
    const refDisp = refId
      ? disp.get(refId) ?? missingDisplay()
      : { title: "—", artist: "", missing: false };
    const candDisp = disp.get(r.candidate_track_id) ?? missingDisplay();

    return {
      id: r.id,
      createdAt: r.created_at,
      analysisRunId: r.analysis_run_id,
      directionId: r.direction_id,
      directionLabel: directionLabelSafe(r.direction_id),
      referenceTrackId: r.reference_track_id,
      candidateTrackId: r.candidate_track_id,
      score: typeof r.score === "number" ? Math.round(r.score) : Number(r.score),
      rankAtSave: r.rank_at_save,
      explanation: r.explanation,
      factsSnapshot: normalizeFactsSnapshot(r.facts_snapshot),
      scoreBreakdownSnapshot: normalizeBreakdownSnapshot(r.score_breakdown_snapshot),
      rulesVersionAtSave: r.rules_version_at_save,
      userNote: r.user_note,
      referenceDisplay: {
        title: refDisp.title,
        artist: refDisp.artist,
        missingFromCatalogue: refDisp.missing,
      },
      candidateDisplay: {
        title: candDisp.title,
        artist: candDisp.artist,
        missingFromCatalogue: candDisp.missing,
      },
    };
  });

  return { ok: true, items };
}

export async function deleteSavedTransition(
  supabase: UserClient,
  userId: string,
  savedId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = savedId.trim();
  if (!id) return { ok: false, message: "Missing id." };

  const { error, data } = await supabase
    .from("saved_transitions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Not found." };
  return { ok: true };
}

export async function updateSavedTransitionNote(
  supabase: UserClient,
  userId: string,
  savedId: string,
  userNote: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = savedId.trim();
  if (!id) return { ok: false, message: "Missing id." };

  const { error, data } = await supabase
    .from("saved_transitions")
    .update({ user_note: clampNote(userNote) })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Not found." };
  return { ok: true };
}
