-- divieight — agents: remove the stored role, add a markets array.
--
-- Resident vs Non-Resident is no longer an attribute of an agent. It is
-- derived per transaction by comparing the property/referral market against
-- `agents.markets`. Listing Agent stays purely `properties.listing_agent_id`
-- and Heavy Lifting Agent stays purely `pods.heavy_lifting_agent_id`.
--
-- Run this in the external Supabase SQL editor.

-- 1. Markets array ---------------------------------------------------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS markets text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Migrate the old single service_area value into a one-item array -------
UPDATE public.agents
SET markets = ARRAY[btrim(service_area)]
WHERE cardinality(markets) = 0
  AND service_area IS NOT NULL
  AND btrim(service_area) <> '';

-- 3. Drop the retired columns ---------------------------------------------
ALTER TABLE public.agents DROP COLUMN IF EXISTS role;
ALTER TABLE public.agents DROP COLUMN IF EXISTS service_area;

-- 4. Index for market lookups ---------------------------------------------
CREATE INDEX IF NOT EXISTS agents_markets_idx ON public.agents USING gin (markets);
