
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS listing_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS usage_tag text,
  ADD COLUMN IF NOT EXISTS bedrooms smallint,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(4,1),
  ADD COLUMN IF NOT EXISTS square_footage integer,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb;
