-- divieight — buyer target budget becomes a coarse bucket (privacy).
-- Run this in the external Supabase SQL editor.
--
-- Human-facing surfaces display ONLY `target_budget_bucket`. The numeric
-- `target_budget` is retained solely as the internal Liquidity Gate basis
-- (1.2x check) and is never shown to any human. Existing exact amounts are
-- mapped into the nearest bucket rather than discarded.

ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS target_budget_bucket text;

-- 1. Map existing exact amounts into the nearest bucket ----------------------
UPDATE public.buyer_accounts
SET target_budget_bucket = CASE
  WHEN target_budget <= 200000 THEN '100k_200k'
  WHEN target_budget <= 300000 THEN '200k_300k'
  WHEN target_budget <= 500000 THEN '300k_500k'
  ELSE '500k_plus'
END
WHERE target_budget_bucket IS NULL
  AND target_budget IS NOT NULL
  AND target_budget > 0;

-- 2. Re-base the internal numeric to the bucket's conservative basis ---------
-- (bucket ceiling; floor for the open-ended top bucket)
UPDATE public.buyer_accounts
SET target_budget = CASE target_budget_bucket
  WHEN '100k_200k' THEN 200000
  WHEN '200k_300k' THEN 300000
  WHEN '300k_500k' THEN 500000
  WHEN '500k_plus' THEN 500000
  ELSE target_budget
END
WHERE target_budget_bucket IS NOT NULL;

CREATE INDEX IF NOT EXISTS buyer_accounts_budget_bucket_idx
  ON public.buyer_accounts (target_budget_bucket);
