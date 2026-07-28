CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_submissions TO anon;
GRANT INSERT ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contact message"
ON public.contact_submissions FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE TRIGGER update_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public read access for listed properties (marketing pages)
GRANT SELECT ON public.properties TO anon;
CREATE POLICY "Public can view listed properties"
ON public.properties FOR SELECT TO anon
USING (status = 'listed');

GRANT SELECT ON public.property_media TO anon;
CREATE POLICY "Public can view media for listed properties"
ON public.property_media FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_media.property_id AND p.status = 'listed'
));