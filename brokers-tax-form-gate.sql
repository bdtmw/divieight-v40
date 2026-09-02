-- divieight — W-9/W-8 enforcement as a hard payment gate at the Broker of Record level.
-- Run this in the external Supabase SQL editor.
--
-- Money-flow scope: the only payment a broker ever receives is a real-estate
-- commission paid at closing by the title/escrow company from sale proceeds.
-- This gate exists solely to block that commission disbursement until a tax
-- form is on file. The Platform never pays brokers anything else.

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS tax_form_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_form_verified_at timestamptz;

-- Month 3 definition of "reviewed" = a tax form document is on file.
-- A manual admin approval UI can tighten this later.
UPDATE public.brokers
SET tax_form_verified = true,
    tax_form_verified_at = COALESCE(tax_form_verified_at, w9_or_w8_uploaded_at, now())
WHERE w9_or_w8_url IS NOT NULL
  AND tax_form_verified = false;

CREATE INDEX IF NOT EXISTS brokers_tax_form_verified_idx
  ON public.brokers (tax_form_verified);

-- Admin console needs to see every brokerage's payout-blocking status.
DROP POLICY IF EXISTS "Admins can view all brokers" ON public.brokers;
CREATE POLICY "Admins can view all brokers"
  ON public.brokers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
