-- divieight — let a Broker of Record read the details of agents who have a
-- PENDING link request addressed to them (name, license, email), so the
-- "Pending requests" card is not blank.
-- Run this in the external Supabase SQL editor.

DROP POLICY IF EXISTS "Brokers can view agents who requested them" ON public.agents;
CREATE POLICY "Brokers can view agents who requested them"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.broker_link_requests r
      WHERE r.agent_id = agents.id
        AND r.status = 'pending'
        AND public.is_broker_of_record(r.broker_id)
    )
  );
