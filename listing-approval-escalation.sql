-- divieight — Gate 1 (Listing-Content Approval Queue) escalation timers.
--
-- Adds queue-entry tracking + escalation stamps to listing_content_items and a
-- platform settings table holding the escalation intervals so platform
-- compliance can change them without a code deploy.
--
-- Run this in the external Supabase SQL editor.

-- 1. Queue timestamps ------------------------------------------------------
ALTER TABLE public.listing_content_items
  ADD COLUMN IF NOT EXISTS queued_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reminder_first_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_second_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS stalled_at timestamptz;

UPDATE public.listing_content_items
SET queued_at = created_at
WHERE queued_at IS DISTINCT FROM created_at AND disposition = 'pending';

CREATE INDEX IF NOT EXISTS listing_content_items_queued_at_idx
  ON public.listing_content_items (queued_at);
CREATE INDEX IF NOT EXISTS listing_content_items_stalled_idx
  ON public.listing_content_items (stalled_at);

-- 2. Platform settings (compliance-configurable) ---------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read platform settings" ON public.platform_settings;
CREATE POLICY "authenticated read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated USING (true);

-- Writes go through server functions using the service role, which verify the
-- caller holds the admin role first.

INSERT INTO public.platform_settings (key, value)
VALUES (
  'listing_approval_escalation',
  '{"first_reminder_hours": 72, "second_reminder_hours": 120, "stalled_hours": 168}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
