
-- property_media table
CREATE TABLE public.property_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  media_type TEXT NOT NULL DEFAULT 'photo',
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;
GRANT ALL ON public.property_media TO service_role;

ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view media for their properties"
  ON public.property_media FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));

CREATE POLICY "Sellers can insert media for their properties"
  ON public.property_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));

CREATE POLICY "Sellers can update media for their properties"
  ON public.property_media FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));

CREATE POLICY "Sellers can delete media for their properties"
  ON public.property_media FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));

CREATE TRIGGER update_property_media_updated_at
  BEFORE UPDATE ON public.property_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for property-media bucket (folder = property_id, owned via join)
CREATE POLICY "Sellers can view own property-media objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-media'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.seller_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Sellers can upload own property-media objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.seller_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Sellers can update own property-media objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.seller_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Sellers can delete own property-media objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.seller_id = auth.uid()
      AND p.id::text = (storage.foldername(name))[1]
    )
  );
