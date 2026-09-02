-- divieight — Agent onboarding step 3: FinCEN/AML + Ethics & Interoperability
-- Run this in the external Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.agent_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  acknowledgment_type TEXT NOT NULL
    CHECK (acknowledgment_type IN (
      'fincen_aml',
      'ethics_data_accuracy',
      'ethics_non_solicitation',
      'ethics_designated_agent_responsiveness'
    )),
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  acknowledgment_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, acknowledgment_type)
);

CREATE INDEX IF NOT EXISTS agent_acknowledgments_agent_idx
  ON public.agent_acknowledgments (agent_id);
CREATE INDEX IF NOT EXISTS agent_acknowledgments_type_idx
  ON public.agent_acknowledgments (acknowledgment_type, accepted);

GRANT SELECT, INSERT, UPDATE ON public.agent_acknowledgments TO authenticated;
GRANT ALL ON public.agent_acknowledgments TO service_role;

ALTER TABLE public.agent_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents read own acknowledgments" ON public.agent_acknowledgments;
CREATE POLICY "Agents read own acknowledgments"
  ON public.agent_acknowledgments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_acknowledgments.agent_id AND a.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agents insert own acknowledgments" ON public.agent_acknowledgments;
CREATE POLICY "Agents insert own acknowledgments"
  ON public.agent_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_acknowledgments.agent_id AND a.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Agents update own acknowledgments" ON public.agent_acknowledgments;
CREATE POLICY "Agents update own acknowledgments"
  ON public.agent_acknowledgments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_acknowledgments.agent_id AND a.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = agent_acknowledgments.agent_id AND a.auth_user_id = auth.uid()
  ));

-- Mirror timestamps on agents for fast per-agent gating queries.
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS fincen_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_data_accuracy_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_non_solicitation_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_responsiveness_ack_at TIMESTAMPTZ;
