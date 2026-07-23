
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'seller',
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: allow inserts by the actor themselves
CREATE POLICY "Authenticated can insert own audit rows"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Viewable by any signed-in user (admin gating deferred to a later milestone)
CREATE POLICY "Authenticated can view audit rows"
  ON public.audit_log FOR SELECT TO authenticated
  USING (true);

-- No UPDATE or DELETE policies are defined, so RLS denies both operations
-- for authenticated users. service_role bypasses RLS by design.

CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_actor_id_idx ON public.audit_log (actor_id);
CREATE INDEX audit_log_action_type_idx ON public.audit_log (action_type);
