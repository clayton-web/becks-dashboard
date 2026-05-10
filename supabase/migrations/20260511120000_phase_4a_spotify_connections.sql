-- Phase 4A — Spotify OAuth connection storage (MVP plaintext tokens — see COMMENT + docs).

CREATE TABLE public.spotify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  spotify_user_id text,
  display_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  scope text,
  token_type text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.spotify_connections IS
'MVP Spotify OAuth linkage per Supabase Auth user — tokens are plaintext in-row; production should migrate to Vault/encryption + tighter access patterns.';
COMMENT ON COLUMN public.spotify_connections.access_token IS
'MVP plaintext. Do not expose to browser or PostgREST SELECT; prefer Vault KMS / pgcrypto for production.';
COMMENT ON COLUMN public.spotify_connections.refresh_token IS
'MVP plaintext long-lived credential — treat as strictly server-side persisted material. Rotate + encrypt before multi-tenant rollout.';

CREATE TRIGGER spotify_connections_set_updated_at
  BEFORE UPDATE ON public.spotify_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE INDEX idx_spotify_connections_user_id ON public.spotify_connections (user_id);

ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spotify_connections_select_own"
  ON public.spotify_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "spotify_connections_insert_own"
  ON public.spotify_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "spotify_connections_update_own"
  ON public.spotify_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "spotify_connections_delete_own"
  ON public.spotify_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Column grants: callers with the user JWT cannot read raw tokens via PostgREST/Supabase `.select()`
-- Server routes SHOULD still mutate tokens only from Route Handlers (never serialized to browsers).
REVOKE ALL ON public.spotify_connections FROM PUBLIC;
REVOKE ALL ON public.spotify_connections FROM anon;
REVOKE ALL ON public.spotify_connections FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  spotify_user_id,
  display_name,
  scope,
  token_type,
  expires_at,
  created_at,
  updated_at
)
ON public.spotify_connections TO authenticated;

GRANT INSERT (
  user_id,
  spotify_user_id,
  display_name,
  access_token,
  refresh_token,
  scope,
  token_type,
  expires_at
)
ON public.spotify_connections TO authenticated;

GRANT UPDATE (
  spotify_user_id,
  display_name,
  access_token,
  refresh_token,
  scope,
  token_type,
  expires_at
)
ON public.spotify_connections TO authenticated;

GRANT DELETE ON public.spotify_connections TO authenticated;
