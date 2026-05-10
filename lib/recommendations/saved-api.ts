import type { SavedTransitionListItem } from "@/lib/recommendations/saved-transition-types";

export async function getSavedTransitionKeysForRun(
  runId: string,
  signal?: AbortSignal,
): Promise<{ ok: true; keys: string[] } | { ok: false; status: number }> {
  const id = runId.trim();
  const url = new URL("/api/recommendations/saved", window.location.origin);
  url.searchParams.set("runId", id);
  url.searchParams.set("compact", "keys");

  const res = await fetch(url.toString(), { cache: "no-store", signal });
  if (!res.ok) return { ok: false, status: res.status };
  const body = (await res.json()) as { keys?: unknown };
  const keys = Array.isArray(body.keys)
    ? body.keys.filter((k): k is string => typeof k === "string")
    : [];
  return { ok: true, keys };
}

export async function postSaveBoardTransition(input: {
  analysisRunId: string;
  directionId: string;
  candidateTrackId: string;
  userNote?: string | null;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; id: string; duplicate: boolean }
  | { ok: false; status: number; error?: string; message?: string }
> {
  const res = await fetch("/api/recommendations/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysisRunId: input.analysisRunId.trim(),
      directionId: input.directionId.trim(),
      candidateTrackId: input.candidateTrackId.trim(),
      ...(input.userNote !== undefined ? { userNote: input.userNote } : {}),
    }),
    signal: input.signal,
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof body.error === "string" ? body.error : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
    };
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const duplicate = body.duplicate === true;
  if (!id) return { ok: false, status: 500, message: "Missing id in response." };

  return { ok: true, id, duplicate };
}

export async function getSavedTransitionsList(opts?: {
  analysisRunId?: string | null;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; items: SavedTransitionListItem[] }
  | { ok: false; status: number; message?: string }
> {
  const url = new URL("/api/recommendations/saved", window.location.origin);
  const run = opts?.analysisRunId?.trim();
  if (run) url.searchParams.set("runId", run);

  const res = await fetch(url.toString(), { cache: "no-store", signal: opts?.signal });
  let body: { items?: unknown } = {};
  try {
    body = (await res.json()) as { items?: unknown };
  } catch {
    body = {};
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : undefined,
    };
  }

  const items = Array.isArray(body.items)
    ? (body.items as SavedTransitionListItem[])
    : [];

  return { ok: true, items };
}

export async function deleteSavedTransitionClient(
  id: string,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; status: number; message?: string }> {
  const res = await fetch(`/api/recommendations/saved/${encodeURIComponent(id.trim())}`, {
    method: "DELETE",
    signal,
  });
  if (!res.ok) {
    let message: string | undefined;
    try {
      const b = (await res.json()) as { message?: unknown };
      message = typeof b.message === "string" ? b.message : undefined;
    } catch {
      message = undefined;
    }
    return { ok: false, status: res.status, message };
  }
  return { ok: true };
}

export async function patchSavedTransitionNoteClient(
  id: string,
  userNote: string | null,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; status: number; message?: string }> {
  const res = await fetch(`/api/recommendations/saved/${encodeURIComponent(id.trim())}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userNote }),
    signal,
  });
  if (!res.ok) {
    let message: string | undefined;
    try {
      const b = (await res.json()) as { message?: unknown };
      message = typeof b.message === "string" ? b.message : undefined;
    } catch {
      message = undefined;
    }
    return { ok: false, status: res.status, message };
  }
  return { ok: true };
}
