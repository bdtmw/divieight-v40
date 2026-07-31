ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS lifestyle_perks_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifestyle_perks_consent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lifestyle_perks_prompt_dismissed_at timestamp with time zone;