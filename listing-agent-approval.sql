-- divieight — Listing Agent tagging, Listing-Content Approval Queue (Gate 1),
-- and Pre-Publication Compliance Review (Gate 2).
-- Run this in the external Supabase SQL editor.
--
-- PUBLISH GATE: `properties.status` is the flag the public marketplace reads
-- ('listed' = publicly visible). A property now moves
--   draft -> pending_review -> (Gate 1 approvals) -> (Gate 2 compliance) -> listed
-- and may never be set to 'listed' until BOTH gates clear.

-- 1. Listing Agent tagging -----------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_approval_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS properties_listing_agent_idx ON public.properties (listing_agent_id);

-- Listing Agent invitations (seller invites an agent who isn't on-platform yet).
CREATE TABLE IF NOT EXISTS public.listing_agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE ON public.listing_agent_invitations TO authenticated;
GRANT ALL ON public.listing_agent_invitations TO service_role;
ALTER TABLE public.listing_agent_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers manage own listing agent invitations" ON public.listing_agent_invitations;
CREATE POLICY "sellers manage own listing agent invitations"
  ON public.listing_agent_invitations FOR ALL TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

-- 2. Gate 1 — listing content items --------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- 'description' | 'photo_caption' | 'virtual_tour_narrative'
  item_type text NOT NULL,
  label text,
  media_id uuid,
  contributor_id uuid,                       -- seller auth user id
  original_content text NOT NULL,
  revised_content text,
  -- 'pending' | 'approved' | 'approved_with_modification' | 'rejected'
  disposition text NOT NULL DEFAULT 'pending',
  reject_reason text,
  decided_by_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  decided_by_broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL,
  agent_unavailable boolean NOT NULL DEFAULT false,
  unavailability_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_content_items_property_idx
  ON public.listing_content_items (property_id);
CREATE INDEX IF NOT EXISTS listing_content_items_disposition_idx
  ON public.listing_content_items (disposition);

GRANT SELECT, INSERT, UPDATE ON public.listing_content_items TO authenticated;
GRANT ALL ON public.listing_content_items TO service_role;
ALTER TABLE public.listing_content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers read own listing content items" ON public.listing_content_items;
CREATE POLICY "sellers read own listing content items"
  ON public.listing_content_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = listing_content_items.property_id AND p.seller_id = auth.uid()
    )
  );

-- 3. Gate 2 — compliance review queue ------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  flagged_phrases text[] NOT NULL DEFAULT '{}',
  flagged_excerpts jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 'flagged' | 'human_review' | 'approved' | 'denied' | 'revised'
  status text NOT NULL DEFAULT 'flagged',
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_reviews_property_idx ON public.compliance_reviews (property_id);
CREATE INDEX IF NOT EXISTS compliance_reviews_status_idx ON public.compliance_reviews (status);

GRANT SELECT ON public.compliance_reviews TO authenticated;
GRANT ALL ON public.compliance_reviews TO service_role;
ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers read own compliance reviews" ON public.compliance_reviews;
CREATE POLICY "sellers read own compliance reviews"
  ON public.compliance_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = compliance_reviews.property_id AND p.seller_id = auth.uid()
    )
  );

-- Agent/broker/admin reads and all writes go through server functions using the
-- service role, which authorize the caller (tagged Listing Agent, that agent's
-- Broker of Record, or an admin) before touching a row.
