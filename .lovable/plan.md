# Rotate Resend API key + wire Supabase SMTP

## Why
Stored secrets are write-only — the existing `RESEND_API_KEY` value can't be read back. So we create one fresh Resend key, use it for both Supabase SMTP and the app.

## Steps you do (Resend)
1. Resend → API Keys → Create API Key.
2. Name: `divieight-prod`, Permission: **Sending access**, Domain: `divieight-v40.freelancerportfolio.me`.
3. Copy the key now — Resend shows it only once.

## Steps you do (Supabase SMTP)
Supabase → Project Settings → Authentication → SMTP Settings → Enable custom SMTP:
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the new key
- Sender email: `notifications@divieight-v40.freelancerportfolio.me`
- Sender name: `divieight`

Then Authentication → Emails → Templates to rebrand "Confirm signup", "Reset password", "Magic link".

## Steps I do
- Open a secure form for you to paste the new key so the app's `RESEND_API_KEY` is updated.
- Verify `RESEND_FROM` still points at the verified sender.
- Send one test email through the app's sender to confirm delivery still works after rotation.

## Notes
- Old key can be deleted in Resend after the test passes.
- No code changes needed — `src/lib/email-sender.ts` reads the secret at runtime.
