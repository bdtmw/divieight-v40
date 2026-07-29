CREATE TABLE public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid
);

CREATE INDEX idx_property_documents_property ON public.property_documents(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_documents TO authenticated;
GRANT ALL ON public.property_documents TO service_role;

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- Sellers manage documents on their own properties
CREATE POLICY "Sellers manage own property documents"
ON public.property_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.seller_id = auth.uid()));

-- Golden Ticket buyers can read documents for listed properties
CREATE POLICY "Golden ticket buyers read property documents"
ON public.property_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.buyer_accounts b
    WHERE b.auth_user_id = auth.uid() AND b.golden_ticket_issued = true
  )
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.status = 'listed'
  )
);

-- Admins can read everything
CREATE POLICY "Admins read property documents"
ON public.property_documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for the private property-documents bucket
CREATE POLICY "Sellers manage own data room files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'property-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'property-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
