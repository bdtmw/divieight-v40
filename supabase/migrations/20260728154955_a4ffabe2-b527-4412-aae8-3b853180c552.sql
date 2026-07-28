ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS target_zip_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS non_negotiable_amenities jsonb NOT NULL DEFAULT '[]'::jsonb;