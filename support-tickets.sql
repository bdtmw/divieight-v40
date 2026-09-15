-- divieight — Support Intake tickets.
--
-- One table, no restructuring needed later: `channel` (default 'form')
-- future-proofs the data model for a live-chat intake without changing
-- anything else. Ticket creation and status/note changes are logged to
-- audit_log by the app; this file only creates the storage.
--
-- Run this in the external Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Set when the submitter was signed in; null for anonymous visitors.
  submitter_auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  -- 'form' today; 'chat' reserved for a future intake without a schema change.
  channel text NOT NULL DEFAULT 'form',
  -- new | in_progress | resolved
  status text NOT NULL DEFAULT 'new',
  internal_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx
  ON public.support_tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON public.support_tickets (status)
  WHERE status <> 'resolved';

CREATE INDEX IF NOT EXISTS support_tickets_category_idx
  ON public.support_tickets (category);

-- The form is reachable by signed-out visitors, so anon INSERT is required.
GRANT INSERT ON public.support_tickets TO anon, authenticated;
-- Signed-in users may read their own tickets; admins read all via policy.
GRANT SELECT ON public.support_tickets TO authenticated;
-- Only admins update (status / internal note) — enforced by policy below.
GRANT UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Anyone (including signed-out visitors) can submit a ticket.
CREATE POLICY "Anyone can submit a support ticket"
  ON public.support_tickets
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Submitters can read their own tickets; admins can read all.
CREATE POLICY "Users read own tickets, admins read all"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    submitter_auth_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only admins change status / add the internal note.
CREATE POLICY "Admins update tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
