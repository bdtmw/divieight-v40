-- divieight — Support Intake.
--
-- On-site support form: anyone (signed in or not) can file a ticket; only
-- admins can read or work them. `channel` defaults to 'form' so a future
-- live-chat channel can write into the same table without restructuring.
--
-- Run this in the external Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  channel text NOT NULL DEFAULT 'form',
  status text NOT NULL DEFAULT 'new',
  internal_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone may file a ticket; a signed-in submitter may only stamp their own id.
DROP POLICY IF EXISTS "Anyone can file a support ticket" ON public.support_tickets;
CREATE POLICY "Anyone can file a support ticket"
  ON public.support_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    submitter_auth_user_id IS NULL
    OR submitter_auth_user_id = auth.uid()
  );

-- Submitters can read their own tickets; admins read everything.
DROP POLICY IF EXISTS "Submitters read own tickets" ON public.support_tickets;
CREATE POLICY "Submitters read own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (submitter_auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all tickets" ON public.support_tickets;
CREATE POLICY "Admins read all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update tickets" ON public.support_tickets;
CREATE POLICY "Admins update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON public.support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_category_idx
  ON public.support_tickets (category, created_at DESC);

-- Ticket creation is logged by the database so anonymous submissions are
-- captured too. Status changes are logged by the admin console.
CREATE OR REPLACE FUNCTION public.log_support_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, actor_type, action_type, entity_type, entity_id, metadata)
  VALUES (
    NEW.submitter_auth_user_id,
    'support',
    'support.ticket_created',
    'support_ticket',
    NEW.id,
    jsonb_build_object(
      'category', NEW.category,
      'channel', NEW.channel,
      'status', NEW.status,
      'submitter_email', NEW.submitter_email,
      'authenticated', NEW.submitter_auth_user_id IS NOT NULL
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_audit_insert ON public.support_tickets;
CREATE TRIGGER support_tickets_audit_insert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_created();
