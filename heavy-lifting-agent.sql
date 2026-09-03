-- divieight — Heavy Lifting Agent selection workflow (Rev 44, two-phase).
-- Run this in the external Supabase SQL editor.
--
-- TRIGGER POINT SUBSTITUTION (flagged): the spec says selection happens after
-- the pod reaches Hard-Lock. The FSB defines Hard-Lock as freezing on the FIRST
-- share reservation, at which point the pod may have only one tethered Resident
-- Agent. This build instead makes selection available at System-Lock (all 8
-- shares reserved), so the full roster of tethered Resident Agents is known.
-- CONFIRM with the spec owner whether literal first-share Hard-Lock timing is
-- intended; if so, change the trigger.
--
-- PHASE 2 (future): after the Launch Period — the earlier of the first 25 pods
-- reaching this selection trigger, or 12 months from the first pod's trigger —
-- replace/extend manual selection with an automated weighted calculation using
-- platform tenure and transaction productivity. Weighting parameters are
-- versioned and the version used at each selection is recorded. Pods assigned
-- during Phase 1 are NOT retroactively reassigned. Phase 2 must also support a
-- Manager override with a required recorded basis, logged distinctly as an
-- override rather than an ordinary selection.
--
-- Independence: no subscription, payment, or other commercial relationship with
-- the Platform may factor into selection. No such column exists here by design.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hla_status') THEN
    CREATE TYPE public.hla_status AS ENUM (
      'awaiting_selection', 'pending_acceptance', 'accepted', 'declined'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hla_selection_method') THEN
    CREATE TYPE public.hla_selection_method AS ENUM ('manual', 'automated');
  END IF;
END
$$;

-- 1. Pods --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  heavy_lifting_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  selection_method public.hla_selection_method,
  selected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_at timestamptz,
  selection_basis text,
  hla_status public.hla_status NOT NULL DEFAULT 'awaiting_selection',
  -- 3 calendar days from selection for the agent to accept or decline.
  acceptance_deadline_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  selection_cycle integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS pods_hla_status_idx ON public.pods (hla_status);
CREATE INDEX IF NOT EXISTS pods_hla_agent_idx ON public.pods (heavy_lifting_agent_id);

GRANT SELECT ON public.pods TO authenticated;
GRANT ALL ON public.pods TO service_role;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view pods" ON public.pods;
CREATE POLICY "Admins can view pods" ON public.pods
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agents can view pods they are tethered into" ON public.pods;
CREATE POLICY "Agents can view pods they are tethered into" ON public.pods
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.pod_reservations r
      JOIN public.buyer_accounts b ON b.id = r.buyer_account_id
      JOIN public.agents a ON a.id = b.tethered_resident_agent_id
      WHERE r.property_id = pods.property_id
        AND r.status = 'reserved'
        AND a.auth_user_id = auth.uid()
    )
  );

-- 2. Per-pod agent roles (passive Resident Agent tag; pod-scoped only) --------
CREATE TABLE IF NOT EXISTS public.pod_agent_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  is_heavy_lifter boolean NOT NULL DEFAULT false,
  is_passive_resident_agent boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pod_id, agent_id)
);

GRANT SELECT ON public.pod_agent_roles TO authenticated;
GRANT ALL ON public.pod_agent_roles TO service_role;
ALTER TABLE public.pod_agent_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view their pod role" ON public.pod_agent_roles;
CREATE POLICY "Agents can view their pod role" ON public.pod_agent_roles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = pod_agent_roles.agent_id AND a.auth_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Selection cycles (append-only history; a re-selection is a NEW cycle) ----
CREATE TABLE IF NOT EXISTS public.pod_hla_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  cycle integer NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL,
  selection_method public.hla_selection_method NOT NULL DEFAULT 'manual',
  -- PHASE 2 (future): record the weighting-parameter version here.
  weighting_version text,
  selected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  selection_basis text,
  selected_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL DEFAULT 'pending_acceptance',
  outcome_at timestamptz,
  UNIQUE (pod_id, cycle)
);

CREATE INDEX IF NOT EXISTS pod_hla_selections_pod_idx ON public.pod_hla_selections (pod_id);

GRANT SELECT ON public.pod_hla_selections TO authenticated;
GRANT ALL ON public.pod_hla_selections TO service_role;
ALTER TABLE public.pod_hla_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view selection history" ON public.pod_hla_selections;
CREATE POLICY "Admins can view selection history" ON public.pod_hla_selections
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agents can view their own selection records" ON public.pod_hla_selections;
CREATE POLICY "Agents can view their own selection records" ON public.pod_hla_selections
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.agents a WHERE a.id = pod_hla_selections.agent_id AND a.auth_user_id = auth.uid())
  );

-- 4. Master Briefcase message thread -----------------------------------------
CREATE TABLE IF NOT EXISTS public.pod_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_label text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pod_messages_pod_idx ON public.pod_messages (pod_id, created_at);

GRANT SELECT ON public.pod_messages TO authenticated;
GRANT ALL ON public.pod_messages TO service_role;
ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pod agents can read pod messages" ON public.pod_messages;
CREATE POLICY "Pod agents can read pod messages" ON public.pod_messages
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.pod_agent_roles pr
      JOIN public.agents a ON a.id = pr.agent_id
      WHERE pr.pod_id = pod_messages.pod_id AND a.auth_user_id = auth.uid()
    )
  );

-- 5. Database-level eligible-pool constraint ---------------------------------
-- The Heavy Lifting Agent MUST be a Resident Agent already tethered to a buyer
-- holding an active reservation in THIS pod. Rejected even on direct writes.
CREATE OR REPLACE FUNCTION public.enforce_hla_eligible_pool()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.heavy_lifting_agent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.pod_reservations r
    JOIN public.buyer_accounts b ON b.id = r.buyer_account_id
    WHERE r.property_id = NEW.property_id
      AND r.status = 'reserved'
      AND b.tethered_resident_agent_id = NEW.heavy_lifting_agent_id
  ) THEN
    RAISE EXCEPTION 'Agent % is not tethered to any buyer in this pod', NEW.heavy_lifting_agent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pods_enforce_hla_pool ON public.pods;
CREATE TRIGGER pods_enforce_hla_pool
  BEFORE INSERT OR UPDATE OF heavy_lifting_agent_id ON public.pods
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hla_eligible_pool();

CREATE OR REPLACE FUNCTION public.enforce_hla_selection_pool()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pod_reservations r
    JOIN public.buyer_accounts b ON b.id = r.buyer_account_id
    WHERE r.property_id = NEW.property_id
      AND r.status = 'reserved'
      AND b.tethered_resident_agent_id = NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'Agent % is not in this pod''s eligible pool', NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pod_hla_selections_enforce_pool ON public.pod_hla_selections;
CREATE TRIGGER pod_hla_selections_enforce_pool
  BEFORE INSERT ON public.pod_hla_selections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hla_selection_pool();
