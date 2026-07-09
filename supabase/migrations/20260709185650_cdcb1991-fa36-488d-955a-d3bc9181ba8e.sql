CREATE POLICY "Sellers can upload own identity docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Sellers can view own identity docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Sellers can update own identity docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Sellers can delete own identity docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);