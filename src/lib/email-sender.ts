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

/**
 * Plain-text footer linking to the on-site Support Intake form. Support is
 * handled on-site only — no published support email or phone number.
 */
export function supportFooter(origin: string): string {
  return `\n\nNeed help? Submit a support request: ${origin}/support`;
}
