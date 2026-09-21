-- divieight — Entity Genesis, Stage 1 (Digital Genesis).
--
-- Triggered when a property's first 1/8th share is reserved (Hard-Lock).
-- Each property gets ONE standalone Delaware LLC record — there is no
-- Master LLC / Series-cell structure by design.
--
-- Run this in the external Supabase SQL editor.

-- ---------------------------------------------------------------- entities
CREATE TABLE IF NOT EXISTS public.entity_genesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE
    REFERENCES public.properties (id) ON DELETE CASCADE,
  -- digital_genesis (Stage 1) | state_filed (Stage 2)
  stage text NOT NULL DEFAULT 'digital_genesis'
    CHECK (stage IN ('digital_genesis', 'state_filed')),
  draft_operating_agreement_url text,
  cap_table_generated_at timestamptz,
  -- Placeholder pattern until the Delaware filing confirms the real name.
  llc_name text NOT NULL,
  -- Null until Stage 2 (state filing + IRS).
  ein text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- cap table
CREATE TABLE IF NOT EXISTS public.cap_table_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL
    REFERENCES public.properties (id) ON DELETE CASCADE,
  share_number integer NOT NULL CHECK (share_number BETWEEN 1 AND 8),
  holder_type text NOT NULL CHECK (holder_type IN ('buyer_account', 'retained_seller')),
  buyer_account_id uuid REFERENCES public.buyer_accounts (id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.sellers (id) ON DELETE SET NULL,
  -- Both named members when a buyer account has two.
  account_member_names text[] NOT NULL DEFAULT '{}',
  acquisition_date timestamptz NOT NULL DEFAULT now(),
  -- Retention Lock: acquisition_date + 12 months.
  retention_lock_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, share_number)
);

CREATE INDEX IF NOT EXISTS cap_table_entries_property_idx
  ON public.cap_table_entries (property_id, share_number);
CREATE INDEX IF NOT EXISTS cap_table_entries_buyer_idx
  ON public.cap_table_entries (buyer_account_id);

-- ------------------------------------------------------------------ grants
GRANT SELECT ON public.entity_genesis TO authenticated;
GRANT ALL ON public.entity_genesis TO service_role;

GRANT SELECT ON public.cap_table_entries TO authenticated;
GRANT ALL ON public.cap_table_entries TO service_role;

ALTER TABLE public.entity_genesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_table_entries ENABLE ROW LEVEL SECURITY;

-- Writes happen server-side with the service role only.
CREATE POLICY "Admins read entity genesis"
  ON public.entity_genesis
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins see the whole cap table; a member sees only their own share rows.
CREATE POLICY "Admins and holders read cap table"
  ON public.cap_table_entries
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = cap_table_entries.buyer_account_id
        AND b.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = cap_table_entries.seller_id
        AND s.auth_user_id = auth.uid()
    )
  );
