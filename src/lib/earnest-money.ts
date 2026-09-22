/**
 * Earnest Money Coordination — shared, client-safe logic.
 *
 * Earnest money is funded DIRECTLY by each Buyer Account to the title/escrow
 * company. The platform never takes custody: it calculates the pro-rata
 * obligation, issues the funding instruction, and tracks status.
 *
 * This is a COMPLETELY SEPARATE obligation from the Platform Enrollment Fee.
 */

export const EARNEST_STATUSES = ["pending", "funded", "late", "missed"] as const;
export type EarnestStatus = (typeof EARNEST_STATUSES)[number];

export const EARNEST_STATUS_LABELS: Record<EarnestStatus, string> = {
  pending: "Awaiting funding",
  funded: "Funded to escrow",
  late: "Past deadline",
  missed: "Not funded — Default",
};

export const DEFAULT_FUNDING_METHODS = ["Wire transfer", "Cashier's check"];

export const DIRECT_TO_ESCROW_NOTICE =
  "Send these funds directly to the title/escrow company named below. divieight never receives, holds, or disburses earnest money.";

export const NOT_ENROLLMENT_FEE_NOTICE =
  "This is not your Platform Enrollment Fee. The Enrollment Fee is a separate, already-satisfied obligation and is not credited against your earnest money.";

export const DEFAULT_PRA8_NOTICE =
  "Failure to fund by the deadline is a Default under PRA Section 8. The title/escrow company, the non-defaulting members and the tethered Resident Agents are notified, and the Member Substitution Pipeline is opened for the affected share.";

export const SUBSTITUTE_CONDITION_NOTICE =
  "Funding this pro-rata earnest money on the existing pod timeline is a condition of your installation into the Buyer Group.";

export interface EarnestTerms {
  property_id: string;
  total_amount: number;
  shares_basis: number;
  per_share_amount: number;
  funding_deadline: string;
  escrow_company: string;
  escrow_account_details: string;
  escrow_reference: string | null;
  escrow_contact_email: string | null;
  funding_methods: string[] | null;
  issued_at: string;
}

export interface EarnestObligation {
  id: string;
  buyer_account_id: string;
  property_id: string;
  amount: number;
  shares: number;
  status: EarnestStatus;
  funding_deadline: string;
  funded_at: string | null;
  funded_reference: string | null;
  late_at: string | null;
  missed_at: string | null;
  is_substitute: boolean;
}

export interface ShareHolder {
  buyerAccountId: string;
  shares: number;
}

export interface ProRataShare extends ShareHolder {
  amountCents: number;
}

/**
 * Split a total pro-rata by shares: a 2-share Account owes exactly twice a
 * 1-share Account. Rounding remainder cents go to the largest holder so the
 * parts always sum back to the total.
 */
export function splitProRata(totalCents: number, holders: ShareHolder[]): ProRataShare[] {
  const totalShares = holders.reduce((s, h) => s + Math.max(0, h.shares), 0);
  if (totalShares <= 0 || totalCents <= 0)
    return holders.map((h) => ({ ...h, amountCents: 0 }));

  const perShare = Math.floor(totalCents / totalShares);
  const parts = holders.map((h) => ({ ...h, amountCents: perShare * Math.max(0, h.shares) }));
  const remainder = totalCents - parts.reduce((s, p) => s + p.amountCents, 0);

  if (remainder > 0 && parts.length > 0) {
    let biggest = 0;
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]!.shares > parts[biggest]!.shares) biggest = i;
    }
    parts[biggest]!.amountCents += remainder;
  }
  return parts;
}

export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function money(amount: number | null | undefined) {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDeadline(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Plain-language funding instruction shown to a Buyer Account. */
export function fundingInstruction(o: EarnestObligation, t: EarnestTerms): string {
  const methods = (t.funding_methods ?? DEFAULT_FUNDING_METHODS).join(", ");
  return [
    `Your Buyer Account is acquiring ${o.shares} of eight shares, so your pro-rata earnest-money obligation is ${money(o.amount)} of the ${money(t.total_amount)} total.`,
    `Send it to ${t.escrow_company}${t.escrow_reference ? ` (reference ${t.escrow_reference})` : ""} by ${formatDeadline(o.funding_deadline)}.`,
    `Accepted funding methods: ${methods}.`,
    DIRECT_TO_ESCROW_NOTICE,
    NOT_ENROLLMENT_FEE_NOTICE,
  ].join(" ");
}
