ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS plaid_consent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS liquidity_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liquidity_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS liquidity_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS liquidity_institution text,
  ADD COLUMN IF NOT EXISTS liquidity_documents jsonb NOT NULL DEFAULT '[]'::jsonb;