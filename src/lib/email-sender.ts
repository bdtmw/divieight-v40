/**
 * Resend sender address, resolved at call time (server-only).
 *
 * Set RESEND_FROM to a verified sender on your Resend domain, e.g.
 * `divieight <notifications@divieight.com>`. Until the domain is verified,
 * the fallback `onboarding@resend.dev` only delivers to the Resend
 * account owner's own address.
 */
export function resendFrom(): string {
  return process.env.RESEND_FROM ?? "divieight <onboarding@resend.dev>";
}
