-- divieight — Listing Agent engagement (accept/decline the assignment) and
-- whole-property rejection with a seller-visible reason.
-- Run this in the external Supabase SQL editor.

-- 1. Engagement state on the property ------------------------------------
ALTER TABLE public.properties
  -- 'none' | 'pending' | 'accepted' | 'declined'
  ADD COLUMN IF NOT EXISTS listing_agent_engagement_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS listing_agent_engagement_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_agent_decline_reason text,
  -- Set when an engaged Listing Agent rejects the property outright.
  ADD COLUMN IF NOT EXISTS listing_rejection_reason text,
  ADD COLUMN IF NOT EXISTS listing_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS listing_rejected_by_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS properties_listing_agent_engagement_idx
  ON public.properties (listing_agent_engagement_status);

-- 2. Declines history — used so the platform never re-assigns an agent who
--    already declined this property.
CREATE TABLE IF NOT EXISTS public.listing_agent_declines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_agent_declines_property_idx
  ON public.listing_agent_declines (property_id);

GRANT SELECT ON public.listing_agent_declines TO authenticated;
GRANT ALL ON public.listing_agent_declines TO service_role;
ALTER TABLE public.listing_agent_declines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers read own listing agent declines" ON public.listing_agent_declines;
CREATE POLICY "sellers read own listing agent declines"
  ON public.listing_agent_declines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = listing_agent_declines.property_id AND p.seller_id = auth.uid()
    )
  );

-- Writes happen through server functions using the service role, which
-- authorize the caller (tagged Listing Agent or owning seller) first.
