ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stall_warning_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS priority_forfeited_at timestamp with time zone;