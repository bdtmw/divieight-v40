-- divieight — Earnest Money Coordination
-- Earnest money is funded DIRECTLY by each Buyer Account to the title/escrow
-- company. The Manager never holds these funds: this schema tracks the
-- obligation and its status only, it is not a custody mechanism.
--
-- Run this in the external Supabase SQL editor.

-- 1. Per-property terms (escrow instructions, total, deadline) ---------------
CREATE TABLE IF NOT EXISTS public.earnest_money_terms (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  shares_basis integer NOT NULL,
  per_share_amount numeric NOT NULL,
  funding_deadline timestamptz NOT NULL,
  escrow_company text NOT NULL,
  escrow_account_details text NOT NULL,
  escrow_reference text,
  escrow_contact_email text,
  funding_methods text[] NOT NULL DEFAULT ARRAY['Wire transfer','Cashier''s check'],
  -- The authorization request whose final acceptance triggered this, if any.
  source_request_id uuid,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.earnest_money_terms TO authenticated;
GRANT ALL ON public.earnest_money_terms TO service_role;
ALTER TABLE public.earnest_money_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers read terms for their pods" ON public.earnest_money_terms;
CREATE POLICY "buyers read terms for their pods"
  ON public.earnest_money_terms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_reservations r
      JOIN public.buyer_accounts b ON b.id = r.buyer_account_id
      WHERE r.property_id = earnest_money_terms.property_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 2. Per-Buyer-Account obligations ------------------------------------------
CREATE TABLE IF NOT EXISTS public.earnest_money_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  shares integer NOT NULL DEFAULT 1,
  -- 'pending' | 'funded' | 'late' | 'missed'
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','funded','late','missed')),
  funding_deadline timestamptz NOT NULL,
  funded_at timestamptz,
  funded_reference text,
  marked_by uuid,
  late_at timestamptz,
  missed_at timestamptz,
  -- Substitute Members inherit the replaced member's timeline.
  is_substitute boolean NOT NULL DEFAULT false,
  replaces_obligation_id uuid REFERENCES public.earnest_money_obligations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS earnest_obligation_unique
  ON public.earnest_money_obligations (property_id, buyer_account_id);
CREATE INDEX IF NOT EXISTS earnest_obligation_status_idx
  ON public.earnest_money_obligations (status, funding_deadline);

GRANT SELECT ON public.earnest_money_obligations TO authenticated;
GRANT ALL ON public.earnest_money_obligations TO service_role;
ALTER TABLE public.earnest_money_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own earnest obligations"
  ON public.earnest_money_obligations;
CREATE POLICY "buyer reads own earnest obligations"
  ON public.earnest_money_obligations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = earnest_money_obligations.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- 3. Grace period before a late obligation becomes a Default ----------------
INSERT INTO public.platform_settings (key, value)
VALUES ('earnest_money', '{"grace_hours":24,"substitute_minimum_hours":24}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- All writes go through server functions using the service role.
