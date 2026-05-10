# Spotify developer setup — Phase 4A (read-only playlists)

Instructions for provisioning the **OAuth confidential client** that powers **`/api/spotify/connect` → `/api/spotify/callback`**. Playlist import/normalization deliberately lives in later phases.

## 1. Create a Spotify Developer app

1. Open [Spotify for Developers Dashboard](https://developer.spotify.com/dashboard).
2. **Create App** → name it (“DJ Playlist Intelligence – local” is fine).
3. Note **Client ID** → `SPOTIFY_CLIENT_ID`.

## 2. Client secret & env vars

1. Reveal/show **Client Secret** once → store as `SPOTIFY_CLIENT_SECRET` (server-only, never prefixed with `NEXT_PUBLIC_`).
2. Add to `.env.local` beside existing Supabase keys:

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# MUST match Spotify Dashboard Redirect URI verbatim (typically local dev below)
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

3. Duplicate into deployment secrets (`Vercel` / Fly / etc.) with **production HTTPS callback** URI when deploying.

### Expected dev redirect URI

```
http://localhost:3000/api/spotify/callback
```

Add this under **Redirect URIs** in the Spotify Dashboard (Settings → Redirect URIs). Localhost **must** appear exactly as Spotify stores it (`http`, port `3000`, path spelled identically).

## 3. Scopes (Phase 4A baseline)

Authorize requests only request:

- `playlist-read-private`
- `playlist-read-collaborative`

**Do not enable** playlist write scopes (`playlist-modify-public` / `playlist-modify-private`) until there is explicit product justification and safeguards.

Scopes are enumerated in-code at `SPOTIFY_SCOPES_PHASE_4A` in `lib/spotify/oauth.ts`.

## 4. OAuth flow recap

1. User hits **`GET /api/spotify/connect`** while signed into Supabase.
2. App stores a cryptographic `state` in an **httpOnly cookie** (`spotify_oauth_state`), then redirects browser to Spotify.
3. Spotify calls **`GET /api/spotify/callback`** with `code + state`; server validates state, exchanges the code confidentially (`client_secret`), fetches **`/v1/me`**, and **upserts** `public.spotify_connections` for `auth.uid()`.
4. User returns to **`/settings?spotify=connected`** (or meaningful error codes).
5. **Disconnect**: **`GET /api/spotify/disconnect`** deletes their row server-side (`/settings?spotify=disconnected`).

## 5. Token storage caveat (MVP honesty)

Migration `*_phase_4a_spotify_connections.sql` currently stores **`access_token`** and **`refresh_token` as plaintext `text`** in Postgres for personal-use scaffolding.

- Tokens must **never** be selected into Client Components (`select()` limited to metadata columns via DB privileges + RLS discipline).
- **Production / shared hosting** → migrate tokens into **encrypted columns**, **Vault**, or envelope encryption keyed per environment **before broader exposure**.
- `docs/database-rls.md` documents row + column protections for `authenticated` reads.

Treat refresh tokens like **credentials** regardless of plaintext vs encrypted storage.

## 6. Operational checklist

| Step | Action |
|------|--------|
| Dashboard redirect | Matches `SPOTIFY_REDIRECT_URI` exactly |
| `.env.local` hydrated | IDs + secrets + redirect present |
| `supabase db push` applied | Ensures `spotify_connections` table exists |
| Resign-in test | Signed-in DJ account before hitting connect |

Manual dashboard work always required—you cannot programmatically approve redirect URIs.

## Remaining backlog (explicitly Phase 4+)

| Item | Reason |
|------|--------|
| Playlist import API | Deferred per Phase roadmap |
| Normalized `tracks` population | Depends on ingest pipeline |
| Token refresh cron / helper | Skeleton exists (`refreshSpotifyAccessToken` throws until wired) |
