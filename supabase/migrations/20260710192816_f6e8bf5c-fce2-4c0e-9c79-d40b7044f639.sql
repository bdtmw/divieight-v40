
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  has_co_owners BOOLEAN NOT NULL DEFAULT false,
  co_owners JSONB NOT NULL DEFAULT '[]'::jsonb,
  encumbrances JSONB NOT NULL DEFAULT '{}'::jsonb,
  supporting_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own properties" ON public.properties
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can insert their own properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own properties" ON public.properties
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own properties" ON public.properties
  FOR DELETE TO authenticated USING (auth.uid() = seller_id);

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for property-documents bucket (bucket created via storage tool)
CREATE POLICY "Sellers can view their own property docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Sellers can upload their own property docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Sellers can update their own property docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Sellers can delete their own property docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
