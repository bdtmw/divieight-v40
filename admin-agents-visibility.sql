-- divieight — let platform admins read agent records for /admin/agents.
-- Run this in the external Supabase SQL editor.
--
-- Agents already have self-scoped policies; this adds an admin read path via
-- the existing `has_role` security-definer function (no privilege escalation:
-- roles live in public.user_roles, never on the agent row).

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;
CREATE POLICY "Admins can view all agents"
  ON public.agents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all brokers" ON public.brokers;
CREATE POLICY "Admins can view all brokers"
  ON public.brokers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.agents TO authenticated;
GRANT SELECT ON public.brokers TO authenticated;
GRANT ALL ON public.agents TO service_role;
GRANT ALL ON public.brokers TO service_role;
