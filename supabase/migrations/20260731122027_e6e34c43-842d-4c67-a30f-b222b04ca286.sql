CREATE TABLE public.pod_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  shares_reserved smallint NOT NULL DEFAULT 1 CHECK (shares_reserved > 0 AND shares_reserved <= 8),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','withdrawn','defaulted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pod_reservations_property_idx ON public.pod_reservations(property_id);
CREATE INDEX pod_reservations_buyer_idx ON public.pod_reservations(buyer_account_id);

GRANT SELECT, INSERT, UPDATE ON public.pod_reservations TO authenticated;
GRANT SELECT ON public.pod_reservations TO anon;
GRANT ALL ON public.pod_reservations TO service_role;

ALTER TABLE public.pod_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reservations on listed properties"
ON public.pod_reservations FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'listed'));

CREATE POLICY "Buyers can view their own reservations"
ON public.pod_reservations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers can create their own reservations"
ON public.pod_reservations FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers can update their own reservations"
ON public.pod_reservations FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = buyer_account_id AND b.auth_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE TRIGGER update_pod_reservations_updated_at
BEFORE UPDATE ON public.pod_reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS hard_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hard_locked_at timestamptz;