# Full Test Data Reset

Goal: database ko clean slate par le aana taake poora flow (seller → buyer → agent → broker → pod → closing hold) shuru se test kiya ja sake. Sirf admin login bachega.

Note: yeh project external Supabase par chal raha hai, is liye main yahan se seedha DB par delete nahi chala sakta. Main ek ready-to-run script banaunga jo aap Supabase SQL editor mein paste karke chalayenge.

## Kya banega

Ek nayi file `reset-test-data.sql` project root mein, jo ek transaction mein:

1. **Application data delete** (child → parent order, ya `TRUNCATE ... CASCADE`):
   - Pods/agents side: `pod_messages`, `pod_agent_roles`, `pod_hla_selections`, `pods`, `pending_referral_agreements`, `refer_only_elections`, `agent_invitations`, `agent_acknowledgments`, `broker_acknowledgments`, `broker_invitations`, `attribution_tokens`, `agents`, `brokers`
   - Listing side: `listing_content_items`, `compliance_reviews`, `listing_agent_invitations`, `property_documents`, `property_media`, `properties`, `sellers`
   - Buyer side: `wishlist`, `pod_reservations`, `buyer_enrollment_payments`, `enrollment_payments`, `account_members`, `buyer_accounts`
   - Common: `signed_documents`, `notifications`, `audit_log`, `contact_submissions`
2. **Storage files delete**: `storage.objects` se `property-media`, `property-documents`, `identity-documents`, `verification-documents`, `agent-documents` buckets ki saari rows (buckets khud rahenge).
3. **Auth users delete**: `auth.users` se sab delete **except** wo user jinke paas `public.user_roles` mein `admin` role hai. Admin ka `user_roles` row bhi bacha rehta hai.
4. **Verification queries**: script ke aakhir mein har table ka row count aur bache hue auth users ki list, taake aap confirm kar saken.

## Kaise chalana hai

1. Supabase Dashboard → SQL Editor → `reset-test-data.sql` ka content paste karke Run.
2. Output mein counts 0 aur sirf admin email dikhna chahiye.
3. Storage → buckets check: files gayab honi chahiye (agar koi orphan file dikhe to bucket se manually delete).
4. Phir app mein fresh seller/buyer/agent registration se testing shuru.

## Technical details

- Script `BEGIN; ... COMMIT;` mein wrap hoga, sab kuch atomic.
- `TRUNCATE public.<tables> RESTART IDENTITY CASCADE` use hoga jahan safe ho; jahan schema drift ka risk hai wahan `DELETE FROM` + `IF EXISTS` guard (DO block) taake koi table missing ho to script fail na ho.
- Admin preserve: `DELETE FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin');`
- `auth.users` delete cascade karega identities/sessions ko; jo app tables `auth_user_id` par FK rakhti hain wo pehle hi khaali ho chuki hongi.
- Koi schema change nahi hoga — sirf data. App code bilkul unchanged rahega.
