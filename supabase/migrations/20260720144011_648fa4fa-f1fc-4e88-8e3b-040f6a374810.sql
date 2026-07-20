DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('forming', 'system_lock', 'closing_ready', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_status public.listing_status NOT NULL DEFAULT 'forming';