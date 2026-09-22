-- divieight — Itemized commission authorization (discrete from the instrument)
-- Run this in the external Supabase SQL editor.
--
-- Manager's Restraint: the provision is PROPOSED by the Heavy Lifting Agent and
-- reviewed by each Member's tethered Resident Agent. divieight, LLC as Manager
-- only presents it for authorization and executes the authorized instrument.

-- 1. The commission provision attached to an authorization request -----------
CREATE TABLE IF NOT EXISTS public.authorization_commission_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE
    REFERENCES public.authorization_requests(id) ON DELETE CASCADE,
  -- Always an agent: the Heavy Lifting Agent who proposed the provision.
  proposed_by_agent_id uuid,
  rate_percent numeric(6,3) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  funding_source text NOT NULL
    CHECK (funding_source IN ('proceeds_at_closing','member_at_closing')),
  provision_text text NOT NULL DEFAULT '',
  share_price_cents bigint NOT NULL DEFAULT 0,
  per_share_amount_cents bigint NOT NULL DEFAULT 0,
  -- Hash of the instrument version this provision belonged to.
  instrument_hash text NOT NULL,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','authorized','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS authz_comm_item_request_idx
  ON public.authorization_commission_items (request_id);

GRANT SELECT ON public.authorization_commission_items TO authenticated;
GRANT ALL ON public.authorization_commission_items TO service_role;
ALTER TABLE public.authorization_commission_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own commission items" ON public.authorization_commission_items;
CREATE POLICY "buyer reads own commission items"
  ON public.authorization_commission_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.authorization_requests r
      JOIN public.buyer_accounts b ON b.id = r.buyer_account_id
      WHERE r.id = authorization_commission_items.request_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 2. Per-Preferred-Member itemized commission authorizations -----------------
-- Its own distinct Audit Vault record type: Member identity, the exact text
-- presented, timestamp, IP, secondary verification, and the instrument hash.
CREATE TABLE IF NOT EXISTS public.authorization_commission_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL
    REFERENCES public.authorization_commission_items(id) ON DELETE CASCADE,
  request_id uuid NOT NULL
    REFERENCES public.authorization_requests(id) ON DELETE CASCADE,
  buyer_account_id uuid NOT NULL,
  account_member_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('confirmed','declined')),
  signed_name text NOT NULL,
  secondary_verification_method text NOT NULL,
  -- Exact text presented to this Member at the moment of the affirmative act.
  presented_text text NOT NULL,
  instrument_hash text NOT NULL,
  ip_address text,
  device_fingerprint text,
  responded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS authz_comm_resp_unique
  ON public.authorization_commission_responses (item_id, account_member_id);
CREATE INDEX IF NOT EXISTS authz_comm_resp_item_idx
  ON public.authorization_commission_responses (item_id);

GRANT SELECT ON public.authorization_commission_responses TO authenticated;
GRANT ALL ON public.authorization_commission_responses TO service_role;
ALTER TABLE public.authorization_commission_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own commission responses"
  ON public.authorization_commission_responses;
CREATE POLICY "buyer reads own commission responses"
  ON public.authorization_commission_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = authorization_commission_responses.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- Writes go through server functions using the service role, which verify the
-- caller is the pod's Heavy Lifting Agent (proposal) or the Buyer Account's
-- Preferred Member (authorization).
