-- divieight — Agent onboarding step 2: E&O insurance + NAR settlement certification
-- Run this once in the external Supabase project (SQL editor).

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS eo_insurance_url TEXT,
  ADD COLUMN IF NOT EXISTS eo_insurance_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eo_broker_affirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eo_broker_affirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nar_cert_lapsed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS agents_nar_cert_expires_idx
  ON public.agents (nar_cert_expires_at)
  WHERE nar_cert_lapsed = false;

-- Private bucket for agent compliance documents (E&O certificates).
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Agents manage own compliance docs" ON storage.objects;
CREATE POLICY "Agents manage own compliance docs"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'agent-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'agent-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
