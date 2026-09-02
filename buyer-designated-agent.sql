-- divieight — Buyer-Designated Agent flow + Refer-Only Election.
-- Run this in the external Supabase SQL editor.
--
-- Scope note: designation, invitations and the refer-only election only.
-- A referring agent's ONLY compensation in any of these paths is their share
-- of the buyer-side commission cascade paid at closing by title/escrow from
-- sale proceeds (25% referral split, or the full amount when they are the
-- tethered agent). The Platform never pays an agent or broker anything, so no
-- bounty/fee/payout field exists here by design.

-- 1. Designation state on buyer_accounts ------------------------------------
ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS designated_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designated_agent_email text,
  ADD COLUMN IF NOT EXISTS designated_agent_name text,
  ADD COLUMN IF NOT EXISTS designated_at timestamptz,
  -- 3 calendar days from designation (Prompt 4 ethics acknowledgment).
  ADD COLUMN IF NOT EXISTS designation_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS designation_expired boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS buyer_accounts_designated_agent_idx
  ON public.buyer_accounts (designated_agent_id);

-- A designated agent must be able to read the buyer who named them.
DROP POLICY IF EXISTS "Agents can view buyers who designated them" ON public.buyer_accounts;
CREATE POLICY "Agents can view buyers who designated them"
  ON public.buyer_accounts
  FOR SELECT
  TO authenticated
  USING (
    designated_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = buyer_accounts.designated_agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- 2. Referring agent role on the staged referral agreements ------------------
ALTER TABLE public.pending_referral_agreements
  ADD COLUMN IF NOT EXISTS referring_agent_role text NOT NULL DEFAULT 'non_resident';

-- 3. agent_invitations (parallel to broker_invitations) ----------------------
CREATE TABLE IF NOT EXISTS public.agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email text NOT NULL,
  invited_name text,
  invited_by_buyer_account_id uuid REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  accepted_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_invitations_email_idx ON public.agent_invitations (invited_email);

GRANT SELECT, INSERT, UPDATE ON public.agent_invitations TO authenticated;
GRANT ALL ON public.agent_invitations TO service_role;

ALTER TABLE public.agent_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers manage their own agent invitations" ON public.agent_invitations;
CREATE POLICY "Buyers manage their own agent invitations"
  ON public.agent_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = agent_invitations.invited_by_buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 4. refer_only_elections ----------------------------------------------------
-- A Resident Agent who referred the buyer AND covers the buyer's market picks
-- between taking the tether themselves or referring the buyer on.
CREATE TABLE IF NOT EXISTS public.refer_only_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  referring_agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  -- 'pending' | 'accepted_tether' | 'refer_only'
  status text NOT NULL DEFAULT 'pending',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_account_id, referring_agent_id)
);

CREATE INDEX IF NOT EXISTS refer_only_elections_agent_idx
  ON public.refer_only_elections (referring_agent_id, status);

GRANT SELECT, UPDATE ON public.refer_only_elections TO authenticated;
GRANT ALL ON public.refer_only_elections TO service_role;

ALTER TABLE public.refer_only_elections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents view their own elections" ON public.refer_only_elections;
CREATE POLICY "Agents view their own elections"
  ON public.refer_only_elections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = refer_only_elections.referring_agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all elections" ON public.refer_only_elections;
CREATE POLICY "Admins view all elections"
  ON public.refer_only_elections
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
