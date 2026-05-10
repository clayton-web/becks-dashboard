# Supabase schema (design + migration status)

> **Implemented DDL:** Phase 3A landed as `supabase/migrations/20260510194600_phase_3a_internal_schema_and_rls.sql` (tables, indexes, **`updated_at` triggers**, **`auth.users → profiles` bootstrap trigger**, **`RLS`**). Phase 3B applied migrations remotely and commits **`types/supabase.ts`** (see [`database-rls.md`](./database-rls.md)). **Phase 4A** adds `spotify_connections` via `supabase/migrations/20260511120000_phase_4a_spotify_connections.sql` for authenticated OAuth linkage (see [`spotify-setup.md`](./spotify-setup.md)).

Canonical architecture notes remain in [`architecture.md`](./architecture.md). RLS + apply instructions live in [`database-rls.md`](./database-rls.md).

## Principles (unchanged)

### Internal database as source of truth

Imported Spotify data will normalize into Postgres; external APIs enrich but do not replace authoritative internal rows (`tracks`, related ids, enrichment JSON).

### RLS-first

**`authenticated`** access is mediated by **`auth.uid()`** policies. **`service_role`** bypasses RLS and is reserved for **trusted server ingestion** touching global caches.

### Service-role catalogue writes

`tracks`, `track_external_ids`, and `track_enrichment_values` are **read-mostly from the JWT client perspective** (`SELECT` policies only). Mutation happens through privileged routes you will add later.

### Append-only AI layer

`ai_suggestions` enforces append-only semantics for JWT callers via **no `UPDATE`/`DELETE`** policies (`INSERT` + `SELECT` only).

---

## Implemented tables (Phase 3A)

### `profiles`

- `id` → `auth.users(id)` (**PK**, `ON DELETE CASCADE`)
- `email`, `display_name`, `created_at`, `updated_at`
- Provisioned automatically through trigger `handle_new_user` on `auth.users` (`SECURITY DEFINER`, `search_path` locked down)

### `tracks` (global reusable cache)

- Canonical fields: `canonical_title`, `canonical_artist`, `canonical_album`, `duration_ms`, `isrc`, `spotify_id`, `spotify_uri`, `popularity`
- Auditing: `created_at`, `updated_at`, `last_enriched_at`
- Partial **unique indexes** enforcing uniqueness when **`spotify_id`** / **`isrc`** are present (nullable-friendly)

### `track_external_ids`

- `(source, external_id)` uniqueness; FK `track_id → tracks`

### `track_enrichment_values`

- Structured facts with `field_name`, `field_value jsonb`, `source`, optional `confidence`, `source_payload`, timestamps
- Uniqueness: `(track_id, field_name, source)`
- Typical `field_name` values documented in-column comment (`bpm`, `key`, camelot aliases, vibes, lyrical keywords, …)

### `crates`

- User-bound (`user_id`), `crate_type`, `source` defaults (`crate`, `manual`), optional mirrored external ids for future playlists

### `crate_tracks`

- Join `(crate_id, track_id)` unique + optional `position`, textual `set_phase`

### `track_notes`, `user_tags`, `track_user_tags`

- User-authored overlays with appropriate uniqueness (`(user_id, name)` tags, `(user_id, track_id, tag_id)` junction)

### `analysis_runs` / `analysis_track_results`

- Deterministic bundles (`rules_version`, `input_snapshot`), optional `crate_id` / `reference_track_id`
- Deduped results via **`UNIQUE (...) NULLS NOT DISTINCT`** triple `(analysis_run_id, track_id, result_type)` allowing controlled `NULL result_type`

### `ai_suggestions`

- Stored outputs with prompt/model metadata + hashing
- Deduped similarly via **`UNIQUE (...) NULLS NOT DISTINCT`** composite including nullable `target_id`

### `spotify_connections` (Phase 4A)

- **`UNIQUE(user_id)`** row per authenticated DJ holding Spotify IDs, plaintext tokens (documented MVP), granted scopes/types, **`expires_at`**, auditing timestamps
- RLS-owner policies + Postgres column grants withholding tokens from JWT `SELECT` lists (still encrypt/Vault-protect before hostile multi-tenant hosting)

---

## Future tables / extensions (still not migrated)

Standalone **`spotify_playlist_import_batches`**, ingestion audit tables, and encrypted token vault wrappers remain backlog until playlist import/normalization milestones land alongside catalogue writers.
