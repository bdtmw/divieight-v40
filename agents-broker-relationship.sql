-- divieight — ongoing Agent-to-Broker relationship verification
-- Run this in the external Supabase SQL editor.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
    CREATE TYPE public.relationship_status AS ENUM ('active', 'lapsed', 'transferred');
  END IF;
END
$$;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS relationship_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS relationship_status public.relationship_status NOT NULL DEFAULT 'active',
  -- Read by Month 4's transaction engine to hold in-flight transactions.
  ADD COLUMN IF NOT EXISTS transactions_held boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS agents_relationship_status_idx
  ON public.agents (relationship_status);
CREATE INDEX IF NOT EXISTS agents_relationship_verified_at_idx
  ON public.agents (relationship_verified_at);

-- Agents already linked to a broker start verified as of now.
UPDATE public.agents
SET relationship_verified_at = now()
WHERE broker_id IS NOT NULL AND relationship_verified_at IS NULL;
