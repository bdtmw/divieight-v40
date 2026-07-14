CREATE TABLE public.signed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_version TEXT NOT NULL,
  signed_name TEXT NOT NULL,
  document_hash TEXT,
  ip_address TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.signed_documents TO authenticated;
GRANT ALL ON public.signed_documents TO service_role;

ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their own signed documents"
  ON public.signed_documents FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create their own signed documents"
  ON public.signed_documents FOR INSERT
  WITH CHECK (auth.uid() = seller_id);
