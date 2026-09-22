/**
 * Itemized commission authorization — shared constants and pure helpers.
 *
 * A buyer-side commission provision inside an offer, counter-offer, revision or
 * final Real Estate Purchase Agreement is ALWAYS its own discrete authorization
 * item. Authorizing the instrument never authorizes the commission provision:
 * they are two separate affirmative acts, captured separately.
 *
 * Manager's Restraint: the provision is proposed by the Heavy Lifting Agent and
 * reviewed by each Member's tethered Resident Agent. divieight, LLC as Manager
 * only presents it for authorization and executes the authorized instrument —
 * it never originates, negotiates, prices, or advises upon it.
 */

export const COMMISSION_FUNDING_SOURCES = [
  {
    value: "proceeds_at_closing",
    label: "Paid from sale proceeds at closing",
    memberSentence:
      "This provision contemplates payment from the sale proceeds at closing.",
  },
  {
    value: "member_at_closing",
    label: "Funded by the Preferred Member at the closing table",
    memberSentence:
      "This provision contemplates that you fund this amount yourself at the closing table.",
  },
] as const;

export type CommissionFundingSource = (typeof COMMISSION_FUNDING_SOURCES)[number]["value"];

export function fundingSourceLabel(value: CommissionFundingSource | string): string {
  return COMMISSION_FUNDING_SOURCES.find((f) => f.value === value)?.label ?? String(value);
}

export function fundingSourceSentence(value: CommissionFundingSource | string): string {
  return (
    COMMISSION_FUNDING_SOURCES.find((f) => f.value === value)?.memberSentence ??
    "This provision does not state how the amount is funded."
  );
}

/** PRA Section 7.5 — the obligation stands on its own. */
export const NON_CONTINGENT_TEXT =
  "This obligation is non-contingent under Section 7.5 of your Priority Reservation Agreement. It is neither created nor discharged by whatever the seller allows from the sale proceeds. If the seller contributes less than the amount shown, the balance remains your obligation; if the seller contributes it in full, the obligation is satisfied from those proceeds.";

export const COMMISSION_CONFIRMATION_TEXT =
  "I expressly authorize this buyer-side commission provision, as a separate act from my authorization of the instrument itself.";

export const COMMISSION_DECLINE_TEXT =
  "I decline this buyer-side commission provision. Declining is not a Default under Section 8 of the Priority Reservation Agreement; the matter returns to my Resident Agent and the Heavy Lifting Agent for resolution.";

export const COMMISSION_PROPOSER_NOTE =
  "This provision is proposed by the Heavy Lifting Agent and reviewed by your tethered Resident Agent. divieight, LLC as Manager presents it for your authorization and, once authorized, executes the resulting instrument. The Manager does not set, negotiate, or advise on these terms.";

export const COMMISSION_DECLINE_NOT_DEFAULT =
  "Declining this commission provision is explicitly NOT a Default under Section 8 of the Priority Reservation Agreement.";

export interface CommissionItemRow {
  id: string;
  request_id: string;
  proposed_by_agent_id: string | null;
  rate_percent: number;
  funding_source: CommissionFundingSource;
  provision_text: string;
  share_price_cents: number;
  per_share_amount_cents: number;
  instrument_hash: string;
  status: "proposed" | "authorized" | "declined";
  created_at: string;
  updated_at: string | null;
}

export interface CommissionResponseRow {
  id: string;
  item_id: string;
  account_member_id: string;
  decision: "confirmed" | "declined";
  signed_name: string;
  secondary_verification_method: string;
  responded_at: string;
}

/** One-eighth of the listing price, in cents — the frozen per-share basis. */
export function perShareBasisCents(listingPrice: number | null | undefined): number {
  return Math.round(((listingPrice ?? 0) * 100) / 8);
}

/** Dollar amount of the provision attributable to a single 1/8th share. */
export function perShareCommissionCents(listingPrice: number | null | undefined, ratePercent: number): number {
  return Math.round((perShareBasisCents(listingPrice) * ratePercent) / 100);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatRate(rate: number): string {
  return `${Number(rate).toFixed(2).replace(/\.00$/, "")}%`;
}

/**
 * The exact plain-language text presented to a Preferred Member. It stands on
 * its own and references no other document.
 */
export function commissionStatement(item: {
  rate_percent: number;
  funding_source: CommissionFundingSource | string;
  per_share_amount_cents: number;
  provision_text: string;
}): string {
  return [
    `Buyer-side commission attributable to your 1/8th share: ${formatRate(item.rate_percent)} of your share price, which is ${formatCents(item.per_share_amount_cents)}.`,
    fundingSourceSentence(item.funding_source),
    NON_CONTINGENT_TEXT,
    item.provision_text?.trim() ? `Provision as proposed: ${item.provision_text.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Stable hash of the instrument version the provision belonged to. */
export function instrumentHash(input: {
  requestId: string;
  terms: Record<string, string>;
  ratePercent: number;
  fundingSource: string;
  provisionText: string;
}): string {
  const canonical = [
    input.requestId,
    Object.keys(input.terms ?? {})
      .sort()
      .map((k) => `${k}=${input.terms[k]}`)
      .join("|"),
    `rate=${input.ratePercent}`,
    `funding=${input.fundingSource}`,
    input.provisionText.trim(),
  ].join("~");
  let h = 5381;
  for (let i = 0; i < canonical.length; i++)
    h = ((h << 5) + h + canonical.charCodeAt(i)) & 0xffffffff;
  return `djb2_${(h >>> 0).toString(16)}_${canonical.length}`;
}

export interface CommissionItemState {
  outstanding: string[];
  confirmed: string[];
  declined: string[];
  complete: boolean;
  anyDeclined: boolean;
}

export function commissionItemState(
  responses: CommissionResponseRow[],
  memberIds: string[],
): CommissionItemState {
  const confirmed = responses.filter((r) => r.decision === "confirmed").map((r) => r.account_member_id);
  const declined = responses.filter((r) => r.decision === "declined").map((r) => r.account_member_id);
  const answered = new Set([...confirmed, ...declined]);
  const outstanding = memberIds.filter((id) => !answered.has(id));
  return {
    outstanding,
    confirmed,
    declined,
    complete: memberIds.length > 0 && outstanding.length === 0,
    anyDeclined: declined.length > 0,
  };
}
