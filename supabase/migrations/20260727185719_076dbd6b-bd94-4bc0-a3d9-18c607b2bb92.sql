CREATE TABLE public.enrollment_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  retained_shares smallint NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrollment_payments_seller ON public.enrollment_payments(seller_id);

GRANT SELECT, INSERT ON public.enrollment_payments TO authenticated;
GRANT ALL ON public.enrollment_payments TO service_role;

ALTER TABLE public.enrollment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own enrollment payments"
  ON public.enrollment_payments FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers create own enrollment payments"
  ON public.enrollment_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE TRIGGER update_enrollment_payments_updated_at
  BEFORE UPDATE ON public.enrollment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();