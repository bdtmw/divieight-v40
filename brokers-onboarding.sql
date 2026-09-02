-- divieight — Broker of Record onboarding
-- Run this in the external Supabase SQL editor.
--
-- Money-flow note: brokers only ever receive real-estate commission paid at
-- closing by the title/escrow company out of sale proceeds. The Platform never
-- pays a broker. There are intentionally NO bounty / marketing / referral fee
-- columns in this schema.

-- ---------------------------------------------------------------------------
-- brokers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brokerage_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT,
  ADD COLUMN IF NOT EXISTS license_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arello_pending_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eo_insurance_url TEXT,
  ADD COLUMN IF NOT EXISTS eo_insurance_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eo_broker_affirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS eo_broker_affirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_lapsed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fincen_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_data_accuracy_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_non_solicitation_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ethics_responsiveness_ack_at TIMESTAMPTZ,
  -- Banking: commission payouts from title/escrow at closing.
  -- TODO: route through a proper secrets/PCI-safe storage solution before
  -- production, do not store raw account numbers in a plain database column
  -- in production. `bank_account_secure_ref` is a placeholder for the vault
  -- reference/token; only the last 4 digits are ever displayed.
  ADD COLUMN IF NOT EXISTS bank_account_last4 TEXT,
  ADD COLUMN IF NOT EXISTS bank_routing_last4 TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_secure_ref TEXT,
  ADD COLUMN IF NOT EXISTS bank_details_saved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS w9_or_w8_url TEXT,
  ADD COLUMN IF NOT EXISTS w9_or_w8_type TEXT,
  ADD COLUMN IF NOT EXISTS w9_or_w8_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'arello_pending',
  ADD COLUMN IF NOT EXISTS invited_by_agent_id UUID;

DO $$ BEGIN
  ALTER TABLE public.brokers
    ADD CONSTRAINT brokers_tax_form_type_check
    CHECK (w9_or_w8_type IS NULL OR w9_or_w8_type IN ('W-9', 'W-8BEN', 'W-8BEN-E'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS brokers_auth_user_id_key
  ON public.brokers (auth_user_id) WHERE auth_user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.brokers TO authenticated;
GRANT ALL ON public.brokers TO service_role;

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read brokers" ON public.brokers;
CREATE POLICY "Authenticated can read brokers" ON public.brokers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Broker can insert own record" ON public.brokers;
CREATE POLICY "Broker can insert own record" ON public.brokers
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Broker can update own record" ON public.brokers;
CREATE POLICY "Broker can update own record" ON public.brokers
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- broker_acknowledgments (mirror of agent_acknowledgments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broker_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  acknowledgment_type TEXT NOT NULL
    CHECK (acknowledgment_type IN (
      'fincen_aml',
      'ethics_data_accuracy',
      'ethics_non_solicitation',
      'ethics_designated_agent_responsiveness'
    )),
  acknowledgment_text TEXT,
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, acknowledgment_type)
);

GRANT SELECT, INSERT, UPDATE ON public.broker_acknowledgments TO authenticated;
GRANT ALL ON public.broker_acknowledgments TO service_role;

ALTER TABLE public.broker_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broker manages own acknowledgments" ON public.broker_acknowledgments;
CREATE POLICY "Broker manages own acknowledgments" ON public.broker_acknowledgments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brokers b WHERE b.id = broker_id AND b.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brokers b WHERE b.id = broker_id AND b.auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- broker_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broker_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_email TEXT NOT NULL,
  invited_brokerage_name TEXT,
  invited_contact_name TEXT,
  invited_by_agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broker_invitations_email_idx ON public.broker_invitations (invited_email);
CREATE INDEX IF NOT EXISTS broker_invitations_agent_idx ON public.broker_invitations (invited_by_agent_id);

GRANT SELECT, INSERT, UPDATE ON public.broker_invitations TO authenticated;
GRANT SELECT ON public.broker_invitations TO anon;
GRANT ALL ON public.broker_invitations TO service_role;

ALTER TABLE public.broker_invitations ENABLE ROW LEVEL SECURITY;

-- Invitation links are opened before the broker has an account, so the row is
-- readable by link (id is an unguessable UUID).
DROP POLICY IF EXISTS "Invitations readable" ON public.broker_invitations;
CREATE POLICY "Invitations readable" ON public.broker_invitations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Agents create invitations" ON public.broker_invitations;
CREATE POLICY "Agents create invitations" ON public.broker_invitations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents a WHERE a.id = invited_by_agent_id AND a.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Invitations updatable by participants" ON public.broker_invitations;
CREATE POLICY "Invitations updatable by participants" ON public.broker_invitations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Shared private document bucket (already created for agents; safe to re-run)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Professionals manage own documents" ON storage.objects;
CREATE POLICY "Professionals manage own documents" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'agent-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
