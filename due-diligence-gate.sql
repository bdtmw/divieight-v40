-- divieight — Due Diligence Acknowledgment Gate (per-document, per-Account-Member)
-- Run this in the external Supabase SQL editor.

-- 1. Inventory of due-diligence materials ----------------------------------
CREATE TABLE IF NOT EXISTS public.due_diligence_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  document_title text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'sellers_disclosure','inspection','appraisal','title_commitment',
    'operating_agreement','real_estate_purchase_agreement','other'
  )),
  file_url text NOT NULL,
  content_hash text NOT NULL,
  placed_at timestamptz NOT NULL DEFAULT now(),
  required boolean NOT NULL DEFAULT true,
  superseded_by uuid REFERENCES public.due_diligence_inventory(id) ON DELETE SET NULL,
  is_governing_instrument boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dd_inventory_property_idx
  ON public.due_diligence_inventory (property_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS dd_inventory_current_idx
  ON public.due_diligence_inventory (property_id) WHERE superseded_by IS NULL;

GRANT SELECT ON public.due_diligence_inventory TO authenticated;
GRANT ALL ON public.due_diligence_inventory TO service_role;
ALTER TABLE public.due_diligence_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read diligence inventory" ON public.due_diligence_inventory;
CREATE POLICY "authenticated read diligence inventory"
  ON public.due_diligence_inventory FOR SELECT TO authenticated USING (true);

-- 2. Acknowledgments (Account Member AND parallel Resident Agent) ----------
CREATE TABLE IF NOT EXISTS public.due_diligence_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.due_diligence_inventory(id) ON DELETE CASCADE,
  property_id uuid NOT NULL,
  buyer_account_id uuid NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('account_member','resident_agent')),
  account_member_id uuid,
  agent_id uuid,
  actor_auth_user_id uuid,
  signed_name text NOT NULL,
  acknowledgment_text text NOT NULL,
  content_hash text NOT NULL,
  ip_address text,
  device_fingerprint text,
  secondary_verification_method text NOT NULL,
  -- Independent-Review Notice (Rev 43): recorded as its own distinct pair.
  independent_review_notice_text text,
  independent_review_notice_shown_at timestamptz,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prior acknowledgments are never deleted: a new content_hash simply creates a
-- new row, and only rows pinned to the current hash count as "current".
CREATE UNIQUE INDEX IF NOT EXISTS dd_ack_member_unique
  ON public.due_diligence_acknowledgments (document_id, account_member_id, content_hash)
  WHERE actor_role = 'account_member';
CREATE UNIQUE INDEX IF NOT EXISTS dd_ack_agent_unique
  ON public.due_diligence_acknowledgments (document_id, buyer_account_id, agent_id, content_hash)
  WHERE actor_role = 'resident_agent';
CREATE INDEX IF NOT EXISTS dd_ack_buyer_idx
  ON public.due_diligence_acknowledgments (buyer_account_id, document_id);

GRANT SELECT ON public.due_diligence_acknowledgments TO authenticated;
GRANT ALL ON public.due_diligence_acknowledgments TO service_role;
ALTER TABLE public.due_diligence_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer reads own diligence acks" ON public.due_diligence_acknowledgments;
CREATE POLICY "buyer reads own diligence acks"
  ON public.due_diligence_acknowledgments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = due_diligence_acknowledgments.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );

-- Writes go through server functions using the service role, which verify the
-- caller is the Account Member's buyer account or the tethered Resident Agent.
