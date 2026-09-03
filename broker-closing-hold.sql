-- divieight — Broker Closing Hold mechanism.
-- Run this in the external Supabase SQL editor.
--
-- MONTH 4 INTEGRATION POINT: `closing_hold_active` is the flag the closing
-- engine MUST check before allowing the Closing Ping Saga to proceed. While
-- true, no closing step may advance for this pod.
--
-- Authority: only the Broker of Record of the pod's ACCEPTED Heavy Lifting
-- Agent may place or lift a hold. Enforced in the server functions and, for
-- placement, by the trigger below.

ALTER TABLE public.pods
  ADD COLUMN IF NOT EXISTS closing_hold_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closing_hold_reason text,
  ADD COLUMN IF NOT EXISTS closing_hold_placed_by uuid REFERENCES public.brokers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closing_hold_placed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closing_hold_lifted_at timestamptz;

CREATE INDEX IF NOT EXISTS pods_closing_hold_active_idx
  ON public.pods (closing_hold_active) WHERE closing_hold_active;

-- A hold may only be attributed to the Broker of Record of this pod's accepted
-- Heavy Lifting Agent — rejected even on direct writes.
CREATE OR REPLACE FUNCTION public.enforce_closing_hold_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.closing_hold_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.hla_status <> 'accepted' OR NEW.heavy_lifting_agent_id IS NULL THEN
    RAISE EXCEPTION 'A closing hold requires an accepted Heavy Lifting Agent';
  END IF;
  IF NEW.closing_hold_placed_by IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = NEW.heavy_lifting_agent_id
      AND a.broker_id = NEW.closing_hold_placed_by
  ) THEN
    RAISE EXCEPTION 'Only the Heavy Lifting Agent''s Broker of Record may place a closing hold';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pods_enforce_closing_hold ON public.pods;
CREATE TRIGGER pods_enforce_closing_hold
  BEFORE INSERT OR UPDATE OF closing_hold_active ON public.pods
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closing_hold_authority();
