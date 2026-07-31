CREATE POLICY "Authenticated users can view media for listed properties"
ON public.property_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = property_media.property_id
      AND p.status = 'listed'
  )
);