/**
 * Member Substitution Pipeline — shared, client-safe types and matching rules.
 *
 * When a buyer withdraws before closing, the vacated 1/8th slice must be
 * re-filled from the pool of vetted (Golden Ticket) buyers. Candidate
 * identification reuses the same Compatibility Filter used on the public
 * marketplace, plus a geographic overlap check, then ranks strictly by
 * priority_rank_timestamp (earliest wins).
 */

export interface SubstitutionCandidate {
  buyerAccountId: string;
  email: string;
  primaryName: string;
  priorityRank: number | null;
  priorityRankTimestamp: string | null;
  intent: string | null;
  primaryTargetMarket: string | null;
  targetBudget: number | null;
  matchedOn: ("zip" | "market" | "intent")[];
}

export interface Vacancy {
  reservationId: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  usageTag: string | null;
  listingPrice: number | null;
  vacatedAt: string;
  availableShares: number;
  candidates: SubstitutionCandidate[];
}

/**
 * Compatibility Filter (mirrors the marketplace rule): a buyer whose stated
 * intent conflicts with the property's usage tag is never a candidate.
 */
export function isIncompatibleIntent(intent: string | null, usageTag: string | null): boolean {
  if (!intent || !usageTag) return false;
  if (intent === "long_term") return usageTag === "short_term_rental";
  if (intent === "short_term_rental") return usageTag === "owner_occupied";
  return false;
}

/** Loose geographic overlap: exact zip match, or market string touching city/state/zip. */
export function geoOverlap(
  targetZips: string[],
  primaryTargetMarket: string | null,
  property: { city: string; state: string; zip: string },
): ("zip" | "market")[] {
  const hits: ("zip" | "market")[] = [];
  if (targetZips.some((z) => z.trim() === property.zip.trim())) hits.push("zip");
  const market = (primaryTargetMarket ?? "").trim().toLowerCase();
  if (market) {
    const haystack = `${property.city} ${property.state} ${property.zip}`.toLowerCase();
    const parts = market.split(/[,/|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.some((p) => p.length > 1 && (haystack.includes(p) || p.includes(haystack))))
      hits.push("market");
  }
  return hits;
}
