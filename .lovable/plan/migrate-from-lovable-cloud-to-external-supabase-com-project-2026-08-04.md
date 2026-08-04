# Migrate from Lovable Cloud to External Supabase.com Project

## Goal
Point this Lovable project at your own Supabase.com project so you get the full Supabase dashboard, SQL editor, and direct project ownership, while preserving the existing sellers, buyers, properties, documents, and auth users.

## Important warnings
- Disconnecting Lovable Cloud is **irreversible** and will permanently delete all current cloud data (database, storage, functions). We only do this after the new project is fully migrated and verified.
- Only a workspace admin can disconnect Cloud. If you are not the admin, you will need one to complete the final step.
- Some Lovable Cloud-only features (managed email, built-in secrets) may stop working or need manual replacement.

## Plan

### 1. Prepare the external Supabase project
- Create a new Supabase project at supabase.com in the desired region.
- Save the project URL, anon/publishable key, service role key, and database password in a secure place.

### 2. Connect the Supabase Integration in Lovable
- Use the Lovable Supabase connector to link your external Supabase project to this app.
- This injects the external Supabase credentials as environment variables so the app can talk to the new project.

### 3. Export the current Lovable Cloud data
- Open **Cloud → Advanced → Export data** to get a full database export of the current project.
- Download the resulting SQL dump.

### 4. Re-create schema and migrate data
- Apply the exported SQL dump to the new Supabase project (via the Supabase SQL editor or `psql`).
- Verify that tables, RLS policies, triggers, functions, storage buckets, and auth users are present.

### 5. Reconfigure the app environment
- Update the project's Supabase environment variables to point to the new project URL and keys.
- Rebind secrets so the server runtime picks up the new service role key.

### 6. Migrate storage files
- Download files from the existing Lovable Cloud storage buckets (property-media, property-documents, identity-documents, verification-documents).
- Re-upload them to the matching buckets in the new Supabase project, preserving paths so database references stay valid.

### 7. Verify the migration
- Run end-to-end checks:
  - Seller login and dashboard load.
  - Buyer login, onboarding, and Golden Ticket flow work.
  - Property marketplace and details pages render.
  - Virtual Data Room and reservation flows function.
  - Admin panel and audit log are accessible.
- Fix any environment-specific issues (keys, bucket permissions, RLS, etc.).

### 8. Disconnect Lovable Cloud
- Once verified, a workspace admin goes to **Cloud → Advanced → Disconnect**.
- This removes Lovable Cloud from the project. The app now runs entirely against your external Supabase project.

## Open questions to confirm before starting
1. Are you the workspace admin, or do you need to involve one for the final Cloud disconnect?
2. Do you already have a Supabase.com project created, or should the plan include creating one?
3. Are you comfortable pausing app changes during the migration window to avoid data drift between the old and new databases?
