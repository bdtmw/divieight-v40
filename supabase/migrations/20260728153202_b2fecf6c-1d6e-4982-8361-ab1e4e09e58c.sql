ALTER TABLE public.buyer_accounts ADD COLUMN IF NOT EXISTS target_budget numeric;
ALTER TABLE public.account_members ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.account_members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.account_members ADD COLUMN IF NOT EXISTS id_document_url text;