# DJ Playlist Intelligence — Delivery checklist

Phased implementation for a personal DJ workspace: imports become local truth, deterministic analysis leads, AI only assists.

## Phase 1 — Foundation

- [x] Next.js app initialized
- [x] TypeScript strict mode confirmed
- [x] Tailwind configured
- [x] Route groups created
- [x] App shell created
- [x] Placeholder pages created
- [x] Project folder structure created
- [x] Initial docs checklist created

## Phase 2 — Supabase Foundation

- [x] Supabase project connected (runtime via `@supabase/ssr` + env; provision project in Supabase dashboard)
- [x] Environment validation added (`lib/config/env.ts`, `.env.example`)
- [x] Auth configured (email/password via `signInWithPassword`, middleware session refresh, protected `(app)` routes)
- [x] Database schema drafted (`docs/supabase-schema-draft.md` — now supplemented by Phase 3A migration)
- [x] RLS policies drafted (Phase 3A migration implements initial RLS SQL)
- [x] Local Supabase types strategy chosen (`supabase gen types typescript`; see Phase 3B)

## Phase 3A — Internal database schema + RLS foundation

- [x] Initial SQL migration authored (`supabase/migrations/20260510194600_phase_3a_internal_schema_and_rls.sql`)
- [x] Core entity tables (`profiles`, `tracks`, identifiers, enrichment, crates, tagging, deterministic analysis, append-only AI)
- [x] `updated_at` trigger function + triggers on mutable tables
- [x] `profiles` provisioning trigger on `auth.users`
- [x] Global catalogue read-only for `authenticated` writers (mutations deferred to privileged server/service role flows)
- [x] Ownership RLS policies for user data + lineage checks (`crate_tracks`, `analysis_track_results`)
- [x] Documentation refreshed (`docs/database-rls.md`, `docs/supabase-schema-draft.md`)

## Phase 3B — Apply migration + typed clients

- [x] Supabase CLI linkage confirmed for this workstation (`supabase link`, `.temp/` gitignored — re-link on fresh clones)
- [x] `supabase db push` executed against hosted project (`20260510194319_*` empty stub + full `20260510194600_*`)
- [x] `supabase gen types typescript --linked` → `types/supabase.ts`
- [x] `Database` wired into `lib/supabase/server.ts`, `lib/supabase/browser.ts`, and `middleware.ts`

## Phase 4A — Spotify developer docs + OAuth skeleton

- [x] Spotify server env trio (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`) validated (`lib/config/env.ts`) + `.env.example` sanitized
- [x] OAuth helpers scoped to read playlists only (`lib/spotify/oauth.ts`)
- [x] `spotify_connections` migration (`20260511120000_phase_4a_spotify_connections.sql`) with `updated_at` trigger, RLS, column-level `SELECT` without tokens
- [x] API routes: `/api/spotify/connect`, `/callback`, `/disconnect`
- [x] Settings UI surfaces connect/disconnect + safety copy (never renders tokens client-side)
- [x] `docs/spotify-setup.md` + checklist updates (`docs/project-checklist.md`, `docs/database-rls.md`)
- [x] Hosted DB migration applied (`supabase db push`) & types regenerated (`types/supabase.ts`)

## Phase 3 / 4 — Spotify + import (remainder)

Spotify roadmap items split between OAuth vs ingest:

### Spotify OAuth / connection polish

- [x] Spotify developer app created (manual dashboard — see docs)
- [x] OAuth connect/callback/disconnect implemented (Phase 4A)
- [ ] Disconnect CSRF posture hardened (prefer POST + Origin checks if surfaced beyond trusted UI)
- [ ] Token encryption / Vault story for production workloads

### Spotify data usage

- [ ] Playlist list fetched server-side
- [ ] Playlist import pipeline
- [ ] Tracks normalized/deduplicated (`tracks` ingest)
- [ ] Duplicate detection + import audit history UX

*(Keep scope tight: playlist write/export scopes still intentionally absent.)*

## Phase 5 — Track Intelligence

- [ ] Deterministic relationship scoring added
- [ ] BPM compatibility scoring added
- [ ] Key/Camelot compatibility added
- [ ] Energy flow scoring added
- [ ] Theme signal model added

## Phase 6 — AI Assistance

- [ ] Gemini configured
- [ ] AI suggestions stored append-only
- [ ] Theme hints added
- [ ] Wordplay/lyrical hints added
- [ ] Playlist flow summaries added

## Phase 7 — Export and Workflow

- [ ] CSV export added
- [ ] Spotify URI copy/export added
- [ ] Draft set builder added
- [ ] Manual override settings added
