-- divieight — Resident Agent tethering (fires when a buyer earns Golden Ticket).
-- Run this in the external Supabase SQL editor.
--
-- Scope note: tethering + referral-agreement placeholders only. Commission
-- math lands later; the Platform never pays an agent or broker anything.

-- 1. Tether state on buyer_accounts -----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tether_status') THEN
    CREATE TYPE public.tether_status AS ENUM ('pending', 'tethered', 'awaiting_designation');
  END IF;
END
$$;

ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS tethered_resident_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tether_status public.tether_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tethered_at timestamptz,
  -- true when there is no referring Non-Resident Agent: the tethered Resident
  -- Agent takes the full buyer-side commission at closing (no 25%/75% split).
  ADD COLUMN IF NOT EXISTS resident_agent_full_commission boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS buyer_accounts_tethered_agent_idx
  ON public.buyer_accounts (tethered_resident_agent_id);

-- Tethered Resident Agents can read the buyers assigned to them.
DROP POLICY IF EXISTS "Agents can view buyers tethered to them" ON public.buyer_accounts;
CREATE POLICY "Agents can view buyers tethered to them"
  ON public.buyer_accounts
  FOR SELECT
  TO authenticated
  USING (
    tethered_resident_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = buyer_accounts.tethered_resident_agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- 2. Placeholder rows for Standard NAR Referral Agreements -------------------
CREATE TABLE IF NOT EXISTS public.pending_referral_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  non_resident_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  resident_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_generation',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_account_id)
);

CREATE INDEX IF NOT EXISTS pending_referral_agreements_status_idx
  ON public.pending_referral_agreements (status);

GRANT SELECT ON public.pending_referral_agreements TO authenticated;
GRANT ALL ON public.pending_referral_agreements TO service_role;

ALTER TABLE public.pending_referral_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view their referral agreements" ON public.pending_referral_agreements;
CREATE POLICY "Agents can view their referral agreements"
  ON public.pending_referral_agreements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.auth_user_id = auth.uid()
        AND a.id IN (non_resident_agent_id, resident_agent_id)
    )
  );

DROP POLICY IF EXISTS "Admins can view referral agreements" ON public.pending_referral_agreements;
CREATE POLICY "Admins can view referral agreements"
  ON public.pending_referral_agreements
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
