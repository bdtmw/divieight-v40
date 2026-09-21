-- Notifications go to any platform participant (buyer, agent, broker, seller),
-- not just sellers. The original foreign key pinned seller_id to public.sellers,
-- so every notification addressed to a buyer or agent failed with a foreign-key
-- violation and silently never appeared. Drop that constraint; RLS still scopes
-- every read/write to auth.uid() = seller_id.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_seller_id_fkey;

COMMENT ON COLUMN public.notifications.seller_id IS
  'Recipient auth user id (buyer, agent, broker, or seller). Legacy column name.';
