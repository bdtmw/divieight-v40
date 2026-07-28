CREATE OR REPLACE FUNCTION public.handle_new_seller()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create a seller profile when the signup explicitly declares itself a seller.
  IF COALESCE(NEW.raw_user_meta_data ->> 'account_type', '') <> 'seller' THEN
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