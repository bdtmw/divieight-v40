CREATE TABLE public.wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (buyer_account_id, property_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own saved properties"
ON public.wishlist FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = wishlist.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers can save properties"
ON public.wishlist FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = wishlist.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers can remove their saved properties"
ON public.wishlist FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.buyer_accounts b WHERE b.id = wishlist.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Admins can view all wishlist entries"
ON public.wishlist FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));