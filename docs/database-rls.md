# Database RLS and ownership model

This document explains how **Row Level Security (RLS)** maps to product ownership for **DJ Playlist Intelligence** after **Phase 3A** (see `supabase/migrations/20260510194600_phase_3a_internal_schema_and_rls.sql`).

Architectural framing also lives in [`architecture.md`](./architecture.md).

## Applying migrations

### Phase 3B status (hosted project)

Phase 3B executed **`supabase link`** against the CLI session on this machine (no interactive `supabase login` prompt was needed because the CLI was already authenticated) and ran **`supabase db push`** so the migrations in `supabase/migrations/` are **applied on the linked remote Postgres**.

Fresh clones cannot rely on `.temp/` (ignored by Git): each workstation must **`supabase link --project-ref <your-ref>`** before `db push` / `gen types --linked`.

> **CLI note:** Duplicate timestamp `20260510194319_phase_3a_internal_schema_and_rls.sql` is an **empty no-op file** leftover from an earlier `supabase migration new` race. It was applied remotely before deletion; retain the **0-byte stub** locally so hashes stay aligned until you intentionally repair/squash history.

Other environments / CI:

### Option A — Supabase CLI (linked remote)

```bash
supabase login   # once per workstation if not already authenticated
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase gen types typescript --linked 2>/dev/null > types/supabase.ts
```

`2>/dev/null` hides the stray “Initialising login role…” line some CLI builds print to stderr while still allowing real errors through if you omit redirection during debugging.

### Option B — Local stack (Docker required)

```bash
supabase start
supabase db reset   # reapplies migrations to local Postgres
supabase gen types typescript --local 2>/dev/null > types/supabase.ts
```

## Ownership model (`authenticated`)

| Surface | Pattern |
|---------|---------|
| **`profiles`** | One row per `auth.users`: `SELECT`/`UPDATE` where `id = auth.uid()`; rows are **`INSERT`-ed via `handle_new_user` trigger** (`SECURITY DEFINER`), not directly by clients. |
| **Global catalogue** — `tracks`, `track_external_ids`, `track_enrichment_values` | **`SELECT` allowed** for signed-in DJs. **`INSERT`/`UPDATE`/`DELETE` withheld** — catalogue mutations must flow through **`service_role` server jobs** later (imports, merges, enrichment pipelines). Never expose the service key to browsers. |
| **`crates`**, **`crate_tracks`**, **`track_notes`**, **`user_tags`**, **`track_user_tags`** | Rows are keyed by **`user_id`,** or gated through **`crate_tracks → crates.user_id`**; CRUD stays with **the owning JWT**. |
| **`analysis_runs`**, **`analysis_track_results`** | Runs are keyed by **`user_id`**. `crate_id` on a run **must belong to the same user when set** (`INSERT`/`UPDATE` `WITH CHECK`). Results inherit access via **parent run ownership.** |
| **`ai_suggestions`** | **`SELECT`** and **`INSERT`** only for **`user_id = auth.uid()`** — append-only from browsers (no `UPDATE`/`DELETE` policies). Prefer new rows rather than overwriting history. |
| **`spotify_connections`** | OAuth row keyed by **`user_id`** (`UNIQUE`). RLS limits CRUD to **owner**. Postgres **column grants** omit `access_token` / `refresh_token` from `SELECT`, so JWT-backed clients cannot accidentally pull tokens into browsers even though codegen still lists columns in TS. Server Route Handlers perform `UPSERT` with the logged-in JWT. MVP stores plaintext secrets — tighten before scaling (see migration `20260511120000_phase_4a_spotify_connections.sql`, [`spotify-setup.md`](./spotify-setup.md)). |

## Global tracks vs deterministic / AI layers

- **Canonical snapshots** (`tracks`, external ids, enrichment JSON) form the deterministic spine used by playlists, crates, and future analysis runs.
- **User overlays** (`track_notes`, tagging) capture subjective intent under explicit per-user isolation.
- **`ai_suggestions`** stores assistant payloads **orthogonal** to canonical catalogue rows.
- **`spotify_connections`** persists Spotify OAuth payloads for imports (Phase 4A+) — plaintext MVP only.

## Caveats & follow-ups

- **Existing `auth.users` without `profiles`:** run a one-time backfill after deploying the trigger (see Supabase docs for `INSERT INTO profiles ... FROM auth.users`), or sign users out/in during personal testing.
- **`set_phase` text** is intentionally loose; add `CHECK` constraints when UI locks allowed phases.
- **Spotify import:** playlists + normalization remain future work (`spotify_connections` is linkage only until ingest ships).
- **Type regeneration** whenever the schema drifts:

  ```bash
  supabase gen types typescript --linked 2>/dev/null > types/supabase.ts
  # or locally:
  # supabase gen types typescript --local 2>/dev/null > types/supabase.ts
  ```

  Phase 3B checked in **`types/supabase.ts`** and wires it through `createServerClient<Database>` / `createBrowserClient<Database>`.

## RLS caveats (operational)

- **`service_role` bypasses RLS entirely** — treat keys like root credentials; limit to edge functions / server-only modules.
- **Catalogue read policies are broad (`USING (true)`)** under `authenticated`. That is intentional for a shared global library, but it means **any signed-in user can read every track row** you insert. Do not store private licensing secrets in `tracks` without an additional classification column + tighter policy later.
- **`ai_suggestions` append-only policies** prevent casual tampering via the anon/authenticated roles, yet service role inserts should still be audited in application code once Gemini lands.
