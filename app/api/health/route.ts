import { NextResponse } from "next/server";

/** Liveness for hosting / monitors — no database, no secrets. */
export function GET() {
  return NextResponse.json({ ok: true, service: "becks-dash" });
}
