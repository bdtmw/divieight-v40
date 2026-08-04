# Enable email sending via Resend (Stripe stays in test mode)

## Current state (verified)

- Stripe: only sandbox credentials exist in the project (sandbox API key + sandbox webhook secret). Test-mode checkout works; live keys are absent. Per your choice, nothing changes here.
- Email: the code already calls Resend in two places, but `RESEND_API_KEY` is not configured, so every send is skipped silently and only the in-app notification is written.
- Sender address is still `onboarding@resend.dev`, which Resend only delivers to the Resend account owner.

## What will be done

1. Ask you for your Resend API key through the secure secret form (nothing is pasted into code or chat).
2. Switch the sender address from the shared Resend test address to your verified domain sender (for example `notifications@divieight.com`), applied consistently in both email paths.
3. Add proper failure surfacing: when Resend rejects a send, log the status and reason instead of failing silently, so problems are visible instead of invisible.
4. Send a live test email through the existing notification path and confirm delivery/response.

## What you need to do on your side

- Create an API key at resend.com/api-keys (Sending access is enough).
- Verify your sending domain in Resend (Domains → Add domain → add the DNS records at your registrar). Until this is done, emails only reach your own Resend account email.
- Tell me the exact sender address you want to use.

## Files touched

- `src/lib/notifications.functions.ts` — sender address, error logging.
- `src/lib/enrollment-maintenance.functions.ts` — same sender address and logging for stall/forfeiture emails.

No database, schema, or Stripe changes.
