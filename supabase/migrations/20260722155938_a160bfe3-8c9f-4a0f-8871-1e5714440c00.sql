
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Sellers update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

CREATE INDEX idx_notifications_seller ON public.notifications(seller_id, created_at DESC);
