/**
 * Member Substitution Pipeline — invitation rules (client-safe).
 *
 * Privacy contract for every string produced here: an invitation may NEVER
 * disclose the departing member's identity, whether the slice vacated through
 * a withdrawal or a Default, or any KYO/personal detail of any other pod
 * member. Pod composition is revealed to the candidate only after acceptance,
 * exactly as it is for any other member.
 */

export const DEFAULT_RESPONSE_WINDOW_HOURS = 72;

/** Hours the platform keeps clear between an acceptance and the closing date. */
export const CLOSING_BUFFER_HOURS = 24;

export interface ResponseWindow {
  hours: number;
  expiresAt: string;
  shortened: boolean;
}

/**
 * 72 hours by default, shortened when the anticipated closing date cannot
 * accommodate the full window. A shortened window is stated explicitly in the
 * invitation text.
 */
export function responseWindow(
  anticipatedClosingDate: string | null,
  now: Date = new Date(),
): ResponseWindow {
  const full = DEFAULT_RESPONSE_WINDOW_HOURS;
  const hourMs = 3600_000;
  let hours = full;

  if (anticipatedClosingDate) {
    const closing = new Date(`${anticipatedClosingDate}T00:00:00Z`).getTime();
    if (Number.isFinite(closing)) {
      const available = Math.floor((closing - now.getTime()) / hourMs) - CLOSING_BUFFER_HOURS;
      if (available < full) hours = Math.max(4, available);
    }
  }

  return {
    hours,
    expiresAt: new Date(now.getTime() + hours * hourMs).toISOString(),
    shortened: hours < full,
  };
}

export interface InvitationCopyInput {
  address: string;
  city: string;
  state: string;
  zip: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  usageTag?: string | null;
  sharesOffered: number;
  sharePrice: number | null;
  anticipatedClosingDate: string | null;
  windowHours: number;
  windowShortened: boolean;
  expiresAt: string;
}

function money(n: number | null | undefined) {
  if (n == null) return "to be confirmed at closing";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** The full invitation body. Deliberately free of any other member's detail. */
export function buildInvitationText(i: InvitationCopyInput): string {
  const spec = [
    i.bedrooms != null ? `${i.bedrooms} bd` : null,
    i.bathrooms != null ? `${i.bathrooms} ba` : null,
    i.squareFeet != null ? `${i.squareFeet.toLocaleString("en-US")} sq ft` : null,
    i.usageTag ? i.usageTag.replace(/_/g, " ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    `A 1/8th share has become available on ${i.address}, ${i.city}, ${i.state} ${i.zip}.`,
    spec ? `Listing detail: ${spec}.` : null,
    `Shares available: ${i.sharesOffered} of 8. Share price: ${money(i.sharePrice)}.`,
    `Anticipated closing: ${i.anticipatedClosingDate ?? "to be scheduled"}.`,
    "This pod is already formed — you would be joining an in-progress transaction, not starting a new one.",
    i.windowShortened
      ? `Because of the anticipated closing date, your response window is shortened to ${i.windowHours} hours (by ${new Date(i.expiresAt).toUTCString()}).`
      : `You have ${i.windowHours} hours to respond (by ${new Date(i.expiresAt).toUTCString()}).`,
    "On acceptance you will need to: confirm your reservation of the share, keep your verified liquidity in place through closing, and sign the closing documents on the schedule set for this pod. Pod composition is shared with you once you accept.",
    "Declining has no effect on your Priority Rank or standing.",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface MySubstitutionInvitation {
  id: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  sharesOffered: number;
  sharePrice: number | null;
  anticipatedClosingDate: string | null;
  windowHours: number;
  windowShortened: boolean;
  expiresAt: string;
  invitedAt: string;
  status: string;
  body: string;
}
