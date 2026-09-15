-- divieight — Member Substitution Pipeline: one-at-a-time invitations.
--
-- A vacated 1/8th slice is offered to exactly ONE candidate at a time, by
-- Priority Rank, with a response window (72h default, shortened when the
-- anticipated closing date requires it). Decline or expiry cascades to the
-- next candidate and carries no consequence for the candidate.
--
-- Run this in the external Supabase SQL editor.

-- Anticipated closing date drives the shortened response window.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS anticipated_closing_date date;

CREATE TABLE IF NOT EXISTS public.substitution_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  vacated_reservation_id uuid REFERENCES public.pod_reservations(id) ON DELETE SET NULL,
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  -- The candidate's own tethered Resident Agent, notified alongside the buyer.
  resident_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  sequence integer NOT NULL DEFAULT 1,
  shares_offered integer NOT NULL DEFAULT 1,
  share_price numeric,
  anticipated_closing_date date,
  window_hours integer NOT NULL DEFAULT 72,
  window_shortened boolean NOT NULL DEFAULT false,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  -- 'pending' | 'accepted' | 'declined' | 'expired' | 'superseded'
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS substitution_invitations_property_idx
  ON public.substitution_invitations (property_id);
CREATE INDEX IF NOT EXISTS substitution_invitations_buyer_idx
  ON public.substitution_invitations (buyer_account_id);
CREATE INDEX IF NOT EXISTS substitution_invitations_status_idx
  ON public.substitution_invitations (status, expires_at);

GRANT SELECT ON public.substitution_invitations TO authenticated;
GRANT ALL ON public.substitution_invitations TO service_role;
ALTER TABLE public.substitution_invitations ENABLE ROW LEVEL SECURITY;

-- The invited buyer may read their own invitation. No agent, broker or seller
-- may read this table: the pipeline is fully platform-driven and must not be
-- searchable. All writes go through server functions using the service role.
DROP POLICY IF EXISTS "candidates read own substitution invitations"
  ON public.substitution_invitations;
CREATE POLICY "candidates read own substitution invitations"
  ON public.substitution_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = substitution_invitations.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
  );
