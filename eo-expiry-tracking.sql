-- divieight — E&O insurance expiry tracking for agents.
--
-- Parallel to the NAR settlement certification expiry logic: same shape,
-- same lapse mechanism. The lapse itself reuses `agents.transactions_held`
-- so in-flight transactions hold exactly as they do for a lapsed
-- agent-broker relationship. No second lapse mechanism is introduced.
--
-- Run this in the external Supabase SQL editor.

ALTER TABLE public.agents
  -- Coverage end date captured at onboarding (upload or broker affirmation).
  ADD COLUMN IF NOT EXISTS eo_expires_at timestamptz,
  -- True once coverage has expired without renewed evidence.
  ADD COLUMN IF NOT EXISTS eo_lapsed boolean NOT NULL DEFAULT false,
  -- Reminder bookkeeping so each notice is sent exactly once per term.
  ADD COLUMN IF NOT EXISTS eo_reminder_60_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS eo_reminder_30_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS eo_reminder_7_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS eo_lapsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS eo_restored_at timestamptz;

-- Same for Brokers of Record, which share the credentialing screens.
ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS eo_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS agents_eo_expires_at_idx
  ON public.agents (eo_expires_at)
  WHERE eo_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS agents_eo_lapsed_idx
  ON public.agents (eo_lapsed)
  WHERE eo_lapsed = true;
