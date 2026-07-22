ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS exit_type TEXT,
  ADD COLUMN IF NOT EXISTS retained_shares SMALLINT;

-- Backfill existing properties from their seller's current setting so historical
-- listings keep their previously-shown share counts.
UPDATE public.properties p
SET exit_type = s.exit_type,
    retained_shares = CASE WHEN s.exit_type = 'hybrid_exit' THEN s.retained_shares ELSE 0 END
FROM public.sellers s
WHERE p.seller_id = s.id
  AND p.exit_type IS NULL;