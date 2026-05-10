import Link from "next/link";

import { SPOTIFY_SCOPES_PHASE_4A } from "@/lib/spotify/oauth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ spotify?: string; reason?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const flags = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: connection } = await supabase
    .from("spotify_connections")
    .select(
      "display_name, spotify_user_id, scope, expires_at, created_at, updated_at",
    )
    .maybeSingle();

  const connected = !!connection?.spotify_user_id;
  const expiryLabel =
    connection?.expires_at != null
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(connection.expires_at))
      : null;

  const flash = flags.spotify ?? null;
  const reason = flags.reason?.replace(/\+/g, " ") ?? "";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Connections, quotas, deterministic defaults, and append-only AI
          consent consolidate here alongside external integrations.
        </p>
        <p className="mt-3 text-sm">
          <Link
            href="/settings/diagnostics"
            className="font-medium text-violet-400 hover:text-violet-300"
          >
            Deployment checklist
          </Link>
          <span className="text-zinc-500">
            {" "}
            — verify Vercel env vars and OAuth redirect (no secrets displayed).
          </span>
        </p>
      </header>

      {flash === "connected" ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100"
        >
          Spotify connected — you’re ready for future playlist imports into the
          internal library.
        </p>
      ) : null}

      {flash === "disconnected" ? (
        <p
          role="status"
          className="rounded-lg border border-zinc-600/70 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200"
        >
          Spotify disconnected — stored tokens were removed server-side.
        </p>
      ) : null}

      {flash === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
        >
          Spotify handshake failed ({reason ? reason : "unknown_error"}).
        </p>
      ) : null}

      <section
        className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-6 ring-1 ring-inset ring-white/5"
        aria-labelledby="spotify-heading"
      >
        <h2
          id="spotify-heading"
          className="text-lg font-semibold text-zinc-100"
        >
          Spotify integration
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Spotify is used <strong className="text-zinc-200">only</strong> as a{" "}
          <strong className="text-zinc-200">source to read playlists</strong>{" "}
          that we will reconcile into Postgres. After import your internal
          database remains authoritative — Spotify is enrichment, never the lone
          brain.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Phase 4A scopes (read playlists only — no playlist writes yet):{" "}
          {[...SPOTIFY_SCOPES_PHASE_4A].join(", ")}.
        </p>

        <div className="mt-6 space-y-4">
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Connection status
            </p>
            <p className="mt-1 font-medium text-zinc-100">
              {connected
                ? `Connected as ${connection?.display_name ?? connection?.spotify_user_id}`
                : "Not connected"}
            </p>
            {connected ? (
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                <li>Spotify user id · {connection?.spotify_user_id}</li>
                {connection?.scope ? (
                  <li className="break-all">Granted scope · {connection.scope}</li>
                ) : null}
                {expiryLabel ? (
                  <li className="text-zinc-400">
                    Access token expires (cached) · {expiryLabel}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {connected ? (
              <>
                <Link
                  href="/api/spotify/connect"
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-500/50 hover:text-violet-200"
                >
                  Reauthorize Spotify
                </Link>
                <Link
                  href="/api/spotify/disconnect"
                  className="rounded-lg border border-red-500/35 bg-red-950/35 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/45"
                >
                  Disconnect Spotify
                </Link>
              </>
            ) : (
              <Link
                href="/api/spotify/connect"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                Connect Spotify
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
