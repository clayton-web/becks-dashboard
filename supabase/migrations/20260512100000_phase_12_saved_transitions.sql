--------------------------------------------------------------------------------
-- Phase 12: User-saved transition paths (bookmarks from the reference board).
-- Snapshots explanation/facts/breakdown at save time for audit after rule changes.
--------------------------------------------------------------------------------

CREATE TABLE public.saved_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  analysis_run_id uuid NOT NULL REFERENCES public.analysis_runs (id) ON DELETE CASCADE,
  direction_id text NOT NULL,
  reference_track_id uuid,
  candidate_track_id uuid NOT NULL,
  score numeric NOT NULL,
  rank_at_save integer NOT NULL,
  explanation text NOT NULL DEFAULT '',
  facts_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_breakdown_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_version_at_save text NOT NULL DEFAULT '',
  user_note text,
  created_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT saved_transitions_facts_snapshot_object CHECK (jsonb_typeof(facts_snapshot) = 'object'),
  CONSTRAINT saved_transitions_breakdown_object CHECK (jsonb_typeof(score_breakdown_snapshot) = 'object')
);

COMMENT ON TABLE public.saved_transitions IS
'User bookmarks of board recommendations; payloads frozen at save time.';

CREATE UNIQUE INDEX saved_transitions_user_run_direction_candidate_idx ON public.saved_transitions (
  user_id,
  analysis_run_id,
  direction_id,
  candidate_track_id
);

CREATE INDEX saved_transitions_user_created_idx ON public.saved_transitions (user_id, created_at DESC);

ALTER TABLE public.saved_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_transitions_select_own" ON public.saved_transitions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "saved_transitions_insert_own" ON public.saved_transitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.analysis_runs ar
      WHERE ar.id = analysis_run_id
        AND ar.user_id = auth.uid()));

CREATE POLICY "saved_transitions_update_own" ON public.saved_transitions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_transitions_delete_own" ON public.saved_transitions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
