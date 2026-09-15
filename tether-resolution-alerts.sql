-- divieight — Tether failure detection (Buyer-Designated Agent flow).
--
-- Adds the bookkeeping the admin alerts need. The designation/acceptance
-- logic itself is unchanged; these columns only record what happened when
-- the buyer goes silent or cannot be reached.
--
-- Run this in the external Supabase SQL editor.

ALTER TABLE public.buyer_accounts
  -- When the "your designated agent did not respond" notice was sent.
  ADD COLUMN IF NOT EXISTS designation_expiry_notified_at timestamptz,
  -- True when that notice could not be delivered (bounce / send rejected).
  ADD COLUMN IF NOT EXISTS designation_notice_delivery_failed boolean NOT NULL DEFAULT false,
  -- Last time the platform successfully reached this buyer.
  ADD COLUMN IF NOT EXISTS last_successful_contact_at timestamptz,
  -- "Awaiting tether resolution" admin flag.
  ADD COLUMN IF NOT EXISTS tether_resolution_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS tether_resolution_reason text,
  -- Separate 14-day Pending Tether alert.
  ADD COLUMN IF NOT EXISTS pending_tether_alert_at timestamptz;

CREATE INDEX IF NOT EXISTS buyer_accounts_tether_resolution_idx
  ON public.buyer_accounts (tether_resolution_flagged_at)
  WHERE tether_resolution_flagged_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS buyer_accounts_pending_tether_alert_idx
  ON public.buyer_accounts (pending_tether_alert_at)
  WHERE pending_tether_alert_at IS NOT NULL;
