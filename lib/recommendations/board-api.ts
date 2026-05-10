import type { LoadedTransitionBoardAnalysis } from "@/lib/recommendations/transition-board-types";

export type AnalyzeReferenceErrorBody = {
  error?: string;
  message?: string;
};

export async function postAnalyzeReference(input: {
  referenceTrackId: string;
  crateIds?: string[];
  signal?: AbortSignal;
}): Promise<
  | { ok: true; runId: string }
  | { ok: false; status: number; body: AnalyzeReferenceErrorBody }
> {
  const payload: Record<string, unknown> = {
    referenceTrackId: input.referenceTrackId.trim(),
  };
  if (input.crateIds && input.crateIds.length > 0) {
    payload.crateIds = input.crateIds;
  }

  const res = await fetch("/api/recommendations/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: input.signal,
  });

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  if (!res.ok) {
    const body =
      raw && typeof raw === "object"
        ? (raw as AnalyzeReferenceErrorBody)
        : {};
    return { ok: false, status: res.status, body };
  }

  const runId =
    raw &&
    typeof raw === "object" &&
    "runId" in raw &&
    typeof (raw as { runId: unknown }).runId === "string"
      ? (raw as { runId: string }).runId.trim()
      : "";

  if (!runId) {
    return {
      ok: false,
      status: 500,
      body: { error: "invalid_response", message: "Missing runId in response." },
    };
  }

  return { ok: true, runId };
}

export async function getTransitionBoardRun(
  runId: string,
  signal?: AbortSignal,
): Promise<
  | { ok: true; analysis: LoadedTransitionBoardAnalysis }
  | { ok: false; status: number; body: unknown }
> {
  const id = runId.trim();
  const res = await fetch(`/api/recommendations/runs/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  return { ok: true, analysis: body as LoadedTransitionBoardAnalysis };
}
