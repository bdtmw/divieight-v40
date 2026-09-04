-- divieight — FULL TEST DATA RESET
-- Sab application data, storage files aur auth users delete karta hai.
-- Sirf wo auth user bachta hai jiska public.user_roles mein role = 'admin' hai.
-- Schema bilkul change nahi hota — sirf data.
--
-- Chalane ka tareeqa: Supabase Dashboard -> SQL Editor -> paste -> Run.

BEGIN;

-- 1) Application data ---------------------------------------------------
-- Har table optional hai (schema drift safe): agar table mojood nahi to skip.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    -- pods / agents / brokers
    'pod_messages',
    'pod_agent_roles',
    'pod_hla_selections',
    'pods',
    'pending_referral_agreements',
    'refer_only_elections',
    'agent_invitations',
    'agent_acknowledgments',
    'broker_acknowledgments',
    'broker_invitations',
    'attribution_tokens',
    'agents',
    'brokers',
    -- listing side
    'listing_content_items',
    'compliance_reviews',
    'listing_agent_invitations',
    'property_documents',
    'property_media',
    'properties',
    'sellers',
    -- buyer side
    'wishlist',
    'pod_reservations',
    'buyer_enrollment_payments',
    'enrollment_payments',
    'account_members',
    'buyer_accounts',
    -- common
    'signed_documents',
    'notifications',
    'audit_log',
    'contact_submissions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'cleared public.%', t;
    ELSE
      RAISE NOTICE 'skipped (missing) public.%', t;
    END IF;
  END LOOP;
END
$$;

-- 2) Storage files ------------------------------------------------------
-- NOTE: SQL se storage.objects delete karna Supabase block karta hai
-- (storage.protect_delete -> "Direct deletion from storage tables is not allowed").
-- Files Storage API / Dashboard se delete karein:
--   Dashboard -> Storage -> bucket kholein -> select all -> Delete
-- Buckets: property-media, property-documents, identity-documents,
--          verification-documents, agent-documents


-- 3) Auth users ---------------------------------------------------------
-- Admin ke ilawa sab delete (identities/sessions cascade ho jaate hain).
DELETE FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles r
  WHERE r.user_id = u.id
    AND r.role = 'admin'
);

-- Orphan role rows (agar koi user delete hua jiska role row tha) saaf karein.
DELETE FROM public.user_roles r
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.user_id);

COMMIT;

-- 4) Verification -------------------------------------------------------
-- Sab counts 0 hone chahiye.
SELECT 'properties' AS table_name, count(*) FROM public.properties
UNION ALL SELECT 'sellers', count(*) FROM public.sellers
UNION ALL SELECT 'buyer_accounts', count(*) FROM public.buyer_accounts
UNION ALL SELECT 'account_members', count(*) FROM public.account_members
UNION ALL SELECT 'agents', count(*) FROM public.agents
UNION ALL SELECT 'brokers', count(*) FROM public.brokers
UNION ALL SELECT 'pods', count(*) FROM public.pods
UNION ALL SELECT 'pod_reservations', count(*) FROM public.pod_reservations
UNION ALL SELECT 'signed_documents', count(*) FROM public.signed_documents
UNION ALL SELECT 'notifications', count(*) FROM public.notifications
UNION ALL SELECT 'audit_log', count(*) FROM public.audit_log
UNION ALL SELECT 'contact_submissions', count(*) FROM public.contact_submissions
UNION ALL SELECT 'storage_objects', count(*) FROM storage.objects
ORDER BY 1;

-- Sirf admin bachna chahiye.
SELECT u.id, u.email, r.role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
ORDER BY u.created_at;
