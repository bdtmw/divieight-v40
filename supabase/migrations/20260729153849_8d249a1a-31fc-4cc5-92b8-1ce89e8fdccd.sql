DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all sellers" ON public.sellers;
CREATE POLICY "Admins can view all sellers" ON public.sellers
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all buyer accounts" ON public.buyer_accounts;
CREATE POLICY "Admins can view all buyer accounts" ON public.buyer_accounts
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update buyer accounts" ON public.buyer_accounts;
CREATE POLICY "Admins can update buyer accounts" ON public.buyer_accounts
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all account members" ON public.account_members;
CREATE POLICY "Admins can view all account members" ON public.account_members
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties" ON public.properties
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update properties" ON public.properties;
CREATE POLICY "Admins can update properties" ON public.properties
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all property media" ON public.property_media;
CREATE POLICY "Admins can view all property media" ON public.property_media
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all signed documents" ON public.signed_documents;
CREATE POLICY "Admins can view all signed documents" ON public.signed_documents
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view seller enrollment payments" ON public.enrollment_payments;
CREATE POLICY "Admins can view seller enrollment payments" ON public.enrollment_payments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view buyer enrollment payments" ON public.buyer_enrollment_payments;
CREATE POLICY "Admins can view buyer enrollment payments" ON public.buyer_enrollment_payments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));