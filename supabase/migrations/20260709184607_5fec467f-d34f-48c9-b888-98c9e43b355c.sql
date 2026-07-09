ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS exit_type TEXT CHECK (exit_type IN ('full_exit','hybrid_exit')),
  ADD COLUMN IF NOT EXISTS retained_shares SMALLINT CHECK (retained_shares BETWEEN 1 AND 7);