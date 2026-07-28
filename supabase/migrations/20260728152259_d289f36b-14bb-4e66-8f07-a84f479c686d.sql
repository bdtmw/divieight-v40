CREATE TABLE public.buyer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  phone text,
  onboarding_status text NOT NULL DEFAULT 'not_started',
  intent text,
  primary_target_market text,
  priority_rank integer,
  golden_ticket_issued boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.buyer_accounts TO authenticated;
GRANT ALL ON public.buyer_accounts TO service_role;

ALTER TABLE public.buyer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view their own account"
  ON public.buyer_accounts FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Buyers create their own account"
  ON public.buyer_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Buyers update their own account"
  ON public.buyer_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE TRIGGER update_buyer_accounts_updated_at
  BEFORE UPDATE ON public.buyer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id uuid NOT NULL REFERENCES public.buyer_accounts(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'primary',
  vetting_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers view their own account members"
  ON public.account_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.buyer_accounts b
    WHERE b.id = account_members.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers add their own account members"
  ON public.account_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts b
    WHERE b.id = account_members.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers update their own account members"
  ON public.account_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.buyer_accounts b
    WHERE b.id = account_members.buyer_account_id AND b.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.buyer_accounts b
    WHERE b.id = account_members.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE POLICY "Buyers remove their own account members"
  ON public.account_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.buyer_accounts b
    WHERE b.id = account_members.buyer_account_id AND b.auth_user_id = auth.uid()));

CREATE TRIGGER update_account_members_updated_at
  BEFORE UPDATE ON public.account_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_account_members_buyer_account_id ON public.account_members(buyer_account_id);

-- Buyer signups must not also create a seller record.
CREATE OR REPLACE FUNCTION public.handle_new_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'seller') = 'buyer' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.sellers (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_buyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_account_id uuid;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'seller') <> 'buyer' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.buyer_accounts (auth_user_id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (auth_user_id) DO NOTHING
  RETURNING id INTO new_account_id;

  IF new_account_id IS NOT NULL THEN
    INSERT INTO public.account_members (buyer_account_id, full_name, role)
    VALUES (new_account_id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), 'primary');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created_buyer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_buyer();