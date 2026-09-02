-- divieight — let a Broker of Record read the agents they supervise.
-- Run this in the external Supabase SQL editor.

-- Security-definer helper: is this auth user the broker with the given id?
CREATE OR REPLACE FUNCTION public.is_broker_of_record(_broker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brokers b
    WHERE b.id = _broker_id AND b.auth_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_broker_of_record(uuid) TO authenticated;

DROP POLICY IF EXISTS "Brokers can view their supervised agents" ON public.agents;
CREATE POLICY "Brokers can view their supervised agents"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (broker_id IS NOT NULL AND public.is_broker_of_record(broker_id));
