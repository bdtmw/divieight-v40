ALTER TABLE public.account_members
  ADD COLUMN IF NOT EXISTS background_check_result text,
  ADD COLUMN IF NOT EXISTS background_check_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS fcra_consent_at timestamp with time zone;