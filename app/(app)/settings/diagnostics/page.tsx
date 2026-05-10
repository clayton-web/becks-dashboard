import Link from "next/link";
import { redirect } from "next/navigation";

import {
  expectedSpotifyCallbackUrl,
  getServerEnvChecklist,
} from "@/lib/diagnostics/env-checks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/class-names";

export const dynamic = "force-dynamic";

function StatusRow({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint?: string;
}) {
  return (
    <li className="border-b border-zinc-800/80 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-zinc-300">{label}</span>
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            ok ? "text-emerald-400" : "text-amber-400",
          )}
        >
          {ok ? "OK" : "Missing / invalid"}
        </span>
      </div>
      {hint && !ok ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </li>
  );
}

export default async function DiagnosticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login?next=/settings/diagnostics");
  }

  const checklist = getServerEnvChecklist();
  const callbackHint = expectedSpotifyCallbackUrl(checklist.publicSiteUrl);

  const { data: connection } = await supabase
    .from("spotify_connections")
    .select(
      "display_name, spotify_user_id, scope, expires_at, created_at, updated_at",
    )
    .maybeSingle();

  const spotifyLinked = !!connection?.spotify_user_id;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Deployment checklist
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Read-only checks for local or Vercel production. Values are never
          shown for secrets — only whether each variable is set. Share this
          page with operators when debugging imports or OAuth.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6 ring-1 ring-inset ring-white/5"
        aria-labelledby="env-heading"
      >
        <h2 id="env-heading" className="text-lg font-semibold text-zinc-100">
          Environment variables
        </h2>
        <p className="mt-2 text-xs text-zinc-500">
          Vercel → Project → Settings → Environment Variables. Redeploy after
          changes.
        </p>
        <ul className="mt-4 divide-y divide-zinc-800/50 border-t border-zinc-800/50">
          <StatusRow
            label="NEXT_PUBLIC_SUPABASE_URL"
            ok={checklist.nextPublicSupabaseUrl}
            hint="Supabase → Project Settings → API → Project URL"
          />
          <StatusRow
            label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
            ok={checklist.nextPublicSupabaseAnonKey}
            hint="Supabase → API → anon public key"
          />
          <StatusRow
            label="NEXT_PUBLIC_SITE_URL"
            ok={checklist.nextPublicSiteUrl}
            hint="Production: https://your-app.vercel.app (no trailing path)"
          />
          <StatusRow
            label="SUPABASE_SERVICE_ROLE_KEY"
            ok={checklist.supabaseServiceRoleKey}
            hint="Required for playlist import + Spotify token read/refresh server-side."
          />
          <StatusRow
            label="SPOTIFY_CLIENT_ID"
            ok={checklist.spotifyClientId}
          />
          <StatusRow
            label="SPOTIFY_CLIENT_SECRET"
            ok={checklist.spotifyClientSecret}
          />
          <StatusRow
            label="SPOTIFY_REDIRECT_URI"
            ok={checklist.spotifyRedirectUri}
            hint="Must match Spotify Dashboard redirect URI exactly (including https)."
          />
          <StatusRow
            label="GEMINI_API_KEY"
            ok={checklist.geminiApiKey}
            hint="Server-only — add in Vercel → Environment Variables (not NEXT_PUBLIC_*). Semantic enrichment APIs only."
          />
          <StatusRow
            label="Spotify OAuth bundle (ID + secret + redirect valid)"
            ok={checklist.spotifyBundleOk}
            hint="If individual vars look OK but this fails, check redirect URL format or typos."
          />
        </ul>

        <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
          <p className="font-medium text-zinc-300">Gemini enrichment (semantic only)</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-500">
            <li className="font-mono text-zinc-400">
              Effective model id · {checklist.geminiEffectiveModelId}
              {checklist.geminiModelOverrideSet ? (
                <span className="ml-1 font-sans font-normal text-zinc-600">
                  (from GEMINI_MODEL)
                </span>
              ) : (
                <span className="ml-1 font-sans font-normal text-zinc-600">(built-in default)</span>
              )}
            </li>
            <li>Keys stay server-side; dashboard and this page never print secret values.</li>
          </ul>
        </div>

        {checklist.publicSiteUrl ? (
          <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Public site URL (safe)</p>
            <p className="mt-1 break-all font-mono text-zinc-400">
              {checklist.publicSiteUrl}
            </p>
            {callbackHint ? (
              <p className="mt-2 text-zinc-500">
                OAuth redirect should match (set this in Spotify +{" "}
                <code className="text-zinc-400">SPOTIFY_REDIRECT_URI</code>):{" "}
                <span className="break-all font-mono text-violet-300/90">
                  {callbackHint}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-zinc-600">
              Production example host:{" "}
              <span className="break-all font-mono text-zinc-500">
                https://becks-music-dashboard.vercel.app/api/spotify/callback
              </span>
            </p>
          </div>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6 ring-1 ring-inset ring-white/5"
        aria-labelledby="spotify-user-heading"
      >
        <h2
          id="spotify-user-heading"
          className="text-lg font-semibold text-zinc-100"
        >
          Your Spotify connection (this account)
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-400">
          <li>
            Status:{" "}
            <span
              className={
                spotifyLinked ? "font-medium text-emerald-400" : "text-amber-400"
              }
            >
              {spotifyLinked ? "Connected" : "Not connected"}
            </span>
          </li>
          {spotifyLinked ? (
            <>
              <li>Spotify user id · {connection?.spotify_user_id}</li>
              <li>Display name · {connection?.display_name ?? "—"}</li>
            </>
          ) : (
            <li>
              <Link
                href="/settings"
                className="text-violet-400 hover:text-violet-300"
              >
                Connect in Settings →
              </Link>
            </li>
          )}
        </ul>
      </section>

      <section className="text-sm text-zinc-500">
        <p>
          Public liveness endpoint:{" "}
          <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-400">
            GET /api/health
          </code>
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-block text-violet-400 hover:text-violet-300"
        >
          ← Back to Settings
        </Link>
      </section>
    </div>
  );
}
