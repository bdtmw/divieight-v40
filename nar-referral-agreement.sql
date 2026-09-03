-- divieight — Standard NAR Referral Agreement generation + dual e-signature.
-- Run this in the external Supabase SQL editor.
--
-- Scope note: this document only fixes how the buyer-side commission cascade
-- is split at closing (25% referring / 75% receiving), paid by the
-- title/escrow company from sale proceeds through each agent's Broker of
-- Record. The Platform never pays an agent or broker anything.

-- 1. signed_documents gains multi-party signature fields --------------------
ALTER TABLE public.signed_documents
  ADD COLUMN IF NOT EXISTS document_body text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'executed',
  ADD COLUMN IF NOT EXISTS requires_signatures_from jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS signed_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS referral_agreement_id uuid
    REFERENCES public.pending_referral_agreements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz;

-- signed_name is NOT NULL in the original schema; multi-party documents start
-- unsigned, so allow an empty placeholder instead of dropping the column.
ALTER TABLE public.signed_documents ALTER COLUMN signed_name SET DEFAULT '';

CREATE INDEX IF NOT EXISTS signed_documents_referral_agreement_idx
  ON public.signed_documents (referral_agreement_id);

-- Both named agents may read the agreement they must sign.
DROP POLICY IF EXISTS "Agents can view their referral agreement documents"
  ON public.signed_documents;
CREATE POLICY "Agents can view their referral agreement documents"
  ON public.signed_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.auth_user_id = auth.uid()
        AND signed_documents.requires_signatures_from ? a.id::text
    )
  );

-- 2. Link the executed agreement back to the buyer --------------------------
ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS nar_agreement_id uuid
    REFERENCES public.signed_documents(id) ON DELETE SET NULL;

-- 3. Pending agreement bookkeeping ------------------------------------------
ALTER TABLE public.pending_referral_agreements
  ADD COLUMN IF NOT EXISTS document_id uuid
    REFERENCES public.signed_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;
-- status values: 'pending_generation' -> 'awaiting_signatures' -> 'executed'
