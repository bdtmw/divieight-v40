-- divieight — Broker approval for agent-to-broker linking.
-- Run this in the external Supabase SQL editor.
--
-- Scope: only the "select an existing broker" paths (initial registration and
-- broker change). The broker_invitations flow is untouched — registering via
-- an invite link already IS the broker's acceptance.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'broker_link_request_status') THEN
    CREATE TYPE public.broker_link_request_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'broker_link_request_reason') THEN
    CREATE TYPE public.broker_link_request_reason AS ENUM ('initial_registration', 'broker_change');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.broker_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  status public.broker_link_request_status NOT NULL DEFAULT 'pending',
  reason public.broker_link_request_reason NOT NULL DEFAULT 'initial_registration',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS broker_link_requests_agent_idx
  ON public.broker_link_requests (agent_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS broker_link_requests_broker_pending_idx
  ON public.broker_link_requests (broker_id) WHERE status = 'pending';

-- Only one open request per agent at a time.
CREATE UNIQUE INDEX IF NOT EXISTS broker_link_requests_one_pending_per_agent
  ON public.broker_link_requests (agent_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.broker_link_requests TO authenticated;
GRANT ALL ON public.broker_link_requests TO service_role;

ALTER TABLE public.broker_link_requests ENABLE ROW LEVEL SECURITY;

-- Helper: is this auth user the agent with the given id?
CREATE OR REPLACE FUNCTION public.is_agent_self(_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = _agent_id AND a.auth_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_agent_self(uuid) TO authenticated;

DROP POLICY IF EXISTS "Agents read own link requests" ON public.broker_link_requests;
CREATE POLICY "Agents read own link requests"
  ON public.broker_link_requests FOR SELECT TO authenticated
  USING (public.is_agent_self(agent_id));

DROP POLICY IF EXISTS "Agents create own link requests" ON public.broker_link_requests;
CREATE POLICY "Agents create own link requests"
  ON public.broker_link_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_agent_self(agent_id));

DROP POLICY IF EXISTS "Brokers read requests addressed to them" ON public.broker_link_requests;
CREATE POLICY "Brokers read requests addressed to them"
  ON public.broker_link_requests FOR SELECT TO authenticated
  USING (public.is_broker_of_record(broker_id));

DROP POLICY IF EXISTS "Brokers resolve requests addressed to them" ON public.broker_link_requests;
CREATE POLICY "Brokers resolve requests addressed to them"
  ON public.broker_link_requests FOR UPDATE TO authenticated
  USING (public.is_broker_of_record(broker_id))
  WITH CHECK (public.is_broker_of_record(broker_id));

-- A broker must be able to set broker_id on an agent they accept.
DROP POLICY IF EXISTS "Brokers link agents who requested them" ON public.agents;
CREATE POLICY "Brokers link agents who requested them"
  ON public.agents FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.broker_link_requests r
      WHERE r.agent_id = agents.id
        AND r.status = 'pending'
        AND public.is_broker_of_record(r.broker_id)
    )
  )
  WITH CHECK (true);
