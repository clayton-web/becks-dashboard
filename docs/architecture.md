# Architecture — DJ Playlist Intelligence

## Ownership and truth

- Spotify (and other connectors) are **ingest paths only**. After import, playlists and tracks are normalized into **our Postgres database**, which is the **source of truth** for product behavior, history, and edits.
- External APIs may **enrich** snapshots of metadata. They are **not** the authoritative store for long-lived state.

## Analysis and AI

- **Deterministic scoring and rules ship first**—BPM/key/energy compatibility, relationship memory, and playlist flow heuristics drive the core experience without model randomness.
- **AI is assistive only**: summarization, hints, and creative ideation. Outputs are **non-authoritative**.
- AI-generated content is stored **append-only** (new rows, new versions) so humans can ignore, supersede, or roll back without losing auditability.

## Boundaries

- **No user audio uploads**, **no streaming playback**, **no live DJ mixing**, and **no realtime waveform analysis**. The product focuses on metadata, graph memory, and DJ workflow—not a DAW or streaming client.

## Limits and operations

- Prefer **soft operational caps** (guided batch sizes, rate-conscious sync, clear messaging) instead of arbitrary hard SaaS ceilings. Scale policies should feel like studio hygiene, not punitive gating.

## Database access

- Initial **RLS + ownership** model for the internal schema is documented in [`database-rls.md`](./database-rls.md); migrations live under `supabase/migrations/`.
