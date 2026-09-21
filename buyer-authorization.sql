-- divieight — Buyer-Authorization Workflow (per-action consent)
-- Run this in the external Supabase SQL editor.

-- 1. Authorization requests -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'offer_tender','offer_revision','counter_offer_acceptance',
    'final_repa_acceptance','contingency_waiver'
  )),
  headline text NOT NULL,
  -- Proposed terms as label/value pairs, plus the prior version for the diff.
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  prior_terms jsonb,
  prior_request_id uuid REFERENCES public.authorization_requests(id) ON DELETE SET NULL,
  -- Market-driven windows (counter-offer expirations) escalate wider.
  market_driven boolean NOT NULL DEFAULT false,
  deadline_at timestamptz NOT NULL,
  consequence_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','declined','withdrawn')),
  -- Parallel Resident Agent recommendation.
  agent_id uuid,
  recommendation_kind text
    CHECK (recommendation_kind IN ('recommend','recommend_against','no_recommendation')),
  recommendation_text text,
  recommendation_at timestamptz,
  -- Escalation bookkeeping (never auto-grants).
  escalated_at timestamptz,
  escalated_second_at timestamptz,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authz_req_buyer_idx
  ON public.authorization_requests (buyer_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS authz_req_pending_idx
  ON public.authorization_requests (deadline_at) WHERE status = 'pending';

GRANT SELECT ON public.authorization_requests TO authenticated;
GRANT ALL ON public.authorization_requests TO service_role;
ALTER TABLE public.authorization_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own authorization requests" ON public.authorization_requests;
CREATE POLICY "buyer reads own authorization requests"
  ON public.authorization_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = authorization_requests.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 2. Per-Preferred-Member responses ----------------------------------------
CREATE TABLE IF NOT EXISTS public.authorization_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.authorization_requests(id) ON DELETE CASCADE,
  buyer_account_id uuid NOT NULL,
  account_member_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('confirmed','declined')),
  signed_name text NOT NULL,
  secondary_verification_method text NOT NULL,
  -- One member acting under documented authority for the other (same rule as PRA).
  on_behalf_of_member_id uuid,
  authority_basis text,
  ip_address text,
  device_fingerprint text,
  responded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS authz_resp_unique
  ON public.authorization_responses (request_id, account_member_id);
CREATE INDEX IF NOT EXISTS authz_resp_request_idx
  ON public.authorization_responses (request_id);

GRANT SELECT ON public.authorization_responses TO authenticated;
GRANT ALL ON public.authorization_responses TO service_role;
ALTER TABLE public.authorization_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own authorization responses" ON public.authorization_responses;
CREATE POLICY "buyer reads own authorization responses"
  ON public.authorization_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = authorization_responses.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 3. Escalation settings ----------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES ('authorization_escalation', '{"default_response_hours":48,"second_escalation_hours":24}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Writes go through server functions using the service role, which verify the
-- caller is the Buyer Account's Preferred Member or the tethered Resident Agent.
