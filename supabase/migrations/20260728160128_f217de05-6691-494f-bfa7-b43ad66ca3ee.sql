ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS priority_rank_timestamp timestamptz;

CREATE TABLE IF NOT EXISTS public.buyer_enrollment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.buyer_enrollment_payments TO authenticated;
GRANT ALL ON public.buyer_enrollment_payments TO service_role;

ALTER TABLE public.buyer_enrollment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own enrollment payments"
  ON public.buyer_enrollment_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Buyers view own enrollment payments"
  ON public.buyer_enrollment_payments FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE TRIGGER update_buyer_enrollment_payments_updated_at
  BEFORE UPDATE ON public.buyer_enrollment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.signed_documents
  ADD COLUMN IF NOT EXISTS buyer_account_id uuid REFERENCES public.buyer_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.signed_documents ALTER COLUMN seller_id DROP NOT NULL;

CREATE POLICY "Buyers can create their own signed documents"
  ON public.signed_documents FOR INSERT TO authenticated
  WITH CHECK (
    buyer_account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = signed_documents.buyer_account_id AND b.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view their own signed documents"
  ON public.signed_documents FOR SELECT TO authenticated
  USING (
    buyer_account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.buyer_accounts b
      WHERE b.id = signed_documents.buyer_account_id AND b.auth_user_id = auth.uid()
    )
  );