-- divieight — Lead attribution tokens (QR codes + deep links) for agents.
-- Run this in the external Supabase SQL editor.
--
-- Scope: attribution tracking only. A tag decides whether the 25%/75%
-- buyer-side commission split applies at closing (paid by title/escrow from
-- sale proceeds). The Platform never pays an agent or broker anything.

CREATE TABLE IF NOT EXISTS public.attribution_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  token_type text NOT NULL DEFAULT 'link' CHECK (token_type IN ('qr', 'link')),
  campaign_label text,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attribution_tokens_agent_id_idx
  ON public.attribution_tokens (agent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_tokens TO authenticated;
GRANT SELECT ON public.attribution_tokens TO anon;
GRANT ALL ON public.attribution_tokens TO service_role;

ALTER TABLE public.attribution_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents manage their own attribution tokens" ON public.attribution_tokens;
CREATE POLICY "Agents manage their own attribution tokens"
  ON public.attribution_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = attribution_tokens.agent_id
        AND a.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = attribution_tokens.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

-- Anyone following a /r/{token} link must be able to resolve it.
DROP POLICY IF EXISTS "Anyone can resolve an attribution token" ON public.attribution_tokens;
CREATE POLICY "Anyone can resolve an attribution token"
  ON public.attribution_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Lead Attribution Tag on the buyer account.
ALTER TABLE public.buyer_accounts
  ADD COLUMN IF NOT EXISTS referring_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_token text,
  ADD COLUMN IF NOT EXISTS referral_source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS referral_tag_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS buyer_accounts_referring_agent_idx
  ON public.buyer_accounts (referring_agent_id);

-- Agents need to count the buyers tagged to them (no PII exposed by the
-- analytics view — it only reads ids/timestamps).
DROP POLICY IF EXISTS "Agents can view buyers tagged to them" ON public.buyer_accounts;
CREATE POLICY "Agents can view buyers tagged to them"
  ON public.buyer_accounts
  FOR SELECT
  TO authenticated
  USING (
    referring_agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = buyer_accounts.referring_agent_id
        AND a.auth_user_id = auth.uid()
    )
  );
