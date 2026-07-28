ALTER TABLE public.account_members
  ADD COLUMN IF NOT EXISTS verification_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS adverse_action_issued_at timestamp with time zone;

CREATE POLICY "Buyers upload own verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Buyers view own verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Buyers update own verification documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);