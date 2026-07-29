CREATE POLICY "Authenticated can view listed properties" ON public.properties FOR SELECT TO authenticated USING (status = 'listed');
GRANT SELECT ON public.property_media TO authenticated;