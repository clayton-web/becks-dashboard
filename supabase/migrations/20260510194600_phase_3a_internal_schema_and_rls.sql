-- Phase 3A — internal Postgres schema + RLS foundation for DJ Playlist Intelligence.
-- Apply via Supabase CLI (`supabase db push` / local `supabase db reset`) or SQL Editor.
-- Trusted writes to global catalogue tables (`tracks`, `track_external_ids`, `track_enrichment_values`)
-- are intentionally blocked for `authenticated` — use server routes with service role later.

--------------------------------------------------------------------------------
-- Core tables
--------------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  canonical_title text NOT NULL,
  canonical_artist text NOT NULL,
  canonical_album text,
  duration_ms integer,
  isrc text,
  spotify_id text,
  spotify_uri text,
  popularity integer,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now (),
  last_enriched_at timestamptz
);

COMMENT ON TABLE public.tracks IS
'Global reusable track catalogue rows. Readable by authenticated users; mutated only via privileged server jobs (service role).';

CREATE UNIQUE INDEX tracks_spotify_id_key ON public.tracks (spotify_id)
WHERE spotify_id IS NOT NULL;

CREATE UNIQUE INDEX tracks_isrc_key ON public.tracks (isrc)
WHERE isrc IS NOT NULL;

CREATE TABLE public.track_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  external_uri text,
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (source, external_id)
);

CREATE TABLE public.track_enrichment_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value jsonb NOT NULL,
  source text NOT NULL,
  confidence numeric,
  source_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (track_id, field_name, source)
);

CREATE TABLE public.crates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  crate_type text NOT NULL DEFAULT 'crate',
  source text NOT NULL DEFAULT 'manual',
  source_external_id text,
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.crate_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  crate_id uuid NOT NULL REFERENCES public.crates (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  position integer,
  set_phase text,
  added_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (crate_id, track_id)
);

COMMENT ON COLUMN public.crate_tracks.set_phase IS
'Free-form phase label (e.g. warm_up, groove, peak, reset, closing).';

CREATE TABLE public.track_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  note text NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now (),
  updated_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (user_id, name)
);

CREATE TABLE public.track_user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.user_tags (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now (),
  UNIQUE (user_id, track_id, tag_id)
);

CREATE TABLE public.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  crate_id uuid REFERENCES public.crates (id) ON DELETE SET NULL,
  reference_track_id uuid REFERENCES public.tracks (id) ON DELETE SET NULL,
  analysis_type text NOT NULL,
  rules_version text NOT NULL,
  input_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE TABLE public.analysis_track_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  analysis_run_id uuid NOT NULL REFERENCES public.analysis_runs (id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  score numeric,
  result_type text,
  reasons jsonb,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE UNIQUE INDEX analysis_track_results_run_track_type_key ON public.analysis_track_results (
  analysis_run_id,
  track_id,
  result_type
) NULLS NOT DISTINCT;

CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid,
  suggestion_type text NOT NULL,
  prompt_version text NOT NULL,
  content_hash text NOT NULL,
  model text,
  input_snapshot jsonb,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now ()
);

CREATE UNIQUE INDEX ai_suggestions_dedupe_idx ON public.ai_suggestions (
  user_id,
  target_type,
  target_id,
  suggestion_type,
  prompt_version,
  content_hash
) NULLS NOT DISTINCT;

--------------------------------------------------------------------------------
-- Auth profile bootstrap + updated_at hygiene
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER tracks_set_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER track_enrichment_values_set_updated_at
  BEFORE UPDATE ON public.track_enrichment_values
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER crates_set_updated_at
  BEFORE UPDATE ON public.crates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE TRIGGER track_notes_set_updated_at
  BEFORE UPDATE ON public.track_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at ();

CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();

--------------------------------------------------------------------------------
-- Helpful secondary indexes
--------------------------------------------------------------------------------

CREATE INDEX idx_track_external_ids_track_id ON public.track_external_ids (track_id);

CREATE INDEX idx_track_enrichment_values_track_id ON public.track_enrichment_values (track_id);

CREATE INDEX idx_crates_user_id ON public.crates (user_id);

CREATE INDEX idx_crate_tracks_crate_id ON public.crate_tracks (crate_id);

CREATE INDEX idx_crate_tracks_track_id ON public.crate_tracks (track_id);

CREATE INDEX idx_track_notes_user_id ON public.track_notes (user_id);

CREATE INDEX idx_track_notes_track_id ON public.track_notes (track_id);

CREATE INDEX idx_user_tags_user_id ON public.user_tags (user_id);

CREATE INDEX idx_track_user_tags_user_id ON public.track_user_tags (user_id);

CREATE INDEX idx_track_user_tags_track_id ON public.track_user_tags (track_id);

CREATE INDEX idx_analysis_runs_user_id ON public.analysis_runs (user_id);

CREATE INDEX idx_analysis_track_results_run_id ON public.analysis_track_results (analysis_run_id);

CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions (user_id);

--------------------------------------------------------------------------------
-- Row level security
--------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_external_ids ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_enrichment_values ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crate_tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.track_user_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.analysis_track_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- global catalogue (read-only for authenticated)
CREATE POLICY "tracks_select_authenticated" ON public.tracks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "track_external_ids_select_authenticated" ON public.track_external_ids
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "track_enrichment_values_select_authenticated" ON public.track_enrichment_values
  FOR SELECT
  TO authenticated
  USING (true);

-- crates
CREATE POLICY "crates_select_own" ON public.crates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "crates_insert_own" ON public.crates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "crates_update_own" ON public.crates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "crates_delete_own" ON public.crates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- crate_tracks (scoped through crate ownership)
CREATE POLICY "crate_tracks_select_own" ON public.crate_tracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crates c
      WHERE c.id = crate_tracks.crate_id
        AND c.user_id = auth.uid()));

CREATE POLICY "crate_tracks_insert_own" ON public.crate_tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.crates c
      WHERE c.id = crate_tracks.crate_id
        AND c.user_id = auth.uid()));

CREATE POLICY "crate_tracks_update_own" ON public.crate_tracks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crates c
      WHERE c.id = crate_tracks.crate_id
        AND c.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.crates c
      WHERE c.id = crate_tracks.crate_id
        AND c.user_id = auth.uid()));

CREATE POLICY "crate_tracks_delete_own" ON public.crate_tracks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crates c
      WHERE c.id = crate_tracks.crate_id
        AND c.user_id = auth.uid()));

-- track_notes
CREATE POLICY "track_notes_select_own" ON public.track_notes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "track_notes_insert_own" ON public.track_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "track_notes_update_own" ON public.track_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "track_notes_delete_own" ON public.track_notes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_tags
CREATE POLICY "user_tags_select_own" ON public.user_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_tags_insert_own" ON public.user_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_tags_update_own" ON public.user_tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_tags_delete_own" ON public.user_tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- track_user_tags
CREATE POLICY "track_user_tags_select_own" ON public.track_user_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "track_user_tags_insert_own" ON public.track_user_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_tags t
      WHERE t.id = track_user_tags.tag_id
        AND t.user_id = auth.uid()));

CREATE POLICY "track_user_tags_update_own" ON public.track_user_tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_tags t
      WHERE t.id = track_user_tags.tag_id
        AND t.user_id = auth.uid()));

CREATE POLICY "track_user_tags_delete_own" ON public.track_user_tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- analysis_runs
CREATE POLICY "analysis_runs_select_own" ON public.analysis_runs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "analysis_runs_insert_own" ON public.analysis_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      crate_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.crates c
        WHERE c.id = analysis_runs.crate_id
          AND c.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "analysis_runs_update_own" ON public.analysis_runs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
    AND (crate_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.crates c
        WHERE c.id = analysis_runs.crate_id
          AND c.user_id = auth.uid())));

CREATE POLICY "analysis_runs_delete_own" ON public.analysis_runs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- analysis_track_results
CREATE POLICY "analysis_track_results_select_own" ON public.analysis_track_results
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.analysis_runs ar
    WHERE ar.id = analysis_track_results.analysis_run_id
      AND ar.user_id = auth.uid()));

CREATE POLICY "analysis_track_results_insert_own" ON public.analysis_track_results
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.analysis_runs ar
    WHERE ar.id = analysis_track_results.analysis_run_id
      AND ar.user_id = auth.uid()));

CREATE POLICY "analysis_track_results_update_own" ON public.analysis_track_results
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.analysis_runs ar
    WHERE ar.id = analysis_track_results.analysis_run_id
      AND ar.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.analysis_runs ar
    WHERE ar.id = analysis_track_results.analysis_run_id
      AND ar.user_id = auth.uid()));

CREATE POLICY "analysis_track_results_delete_own" ON public.analysis_track_results
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.analysis_runs ar
    WHERE ar.id = analysis_track_results.analysis_run_id
      AND ar.user_id = auth.uid()));

-- ai_suggestions append-only semantics for JWT sessions
CREATE POLICY "ai_suggestions_select_own" ON public.ai_suggestions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_suggestions_insert_own" ON public.ai_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

--------------------------------------------------------------------------------
-- Documentation comments
--------------------------------------------------------------------------------

COMMENT ON COLUMN public.track_enrichment_values.field_name IS
'Examples: bpm, key, camelot, energy, danceability, mood_tags, genre_tags, theme_signals, lyric_keywords';

COMMENT ON TABLE public.ai_suggestions IS
'Append-only model output keyed by hashing inputs; no UPDATE/DELETE policies for authenticated users.';
