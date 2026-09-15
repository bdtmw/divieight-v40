/**
 * Market helpers.
 *
 * An agent is not stored as "Resident" or "Non-Resident" anywhere. Those are
 * derived per transaction: an agent is Resident on a property/referral when
 * that property's market is one of the markets they are licensed and active
 * in (`agents.markets`), and Non-Resident when it is not.
 */

export type Residency = "resident" | "non_resident";

/** Loose market match: exact, or either string containing the other. */
export function marketMatches(market: string, other: string) {
  const a = (market ?? "").trim().toLowerCase();
  const b = (other ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Normalise whatever the database/form hands us into a clean string array. */
export function parseMarkets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/** True when the agent covers the given market. */
export function isResidentInMarket(markets: unknown, market: string): boolean {
  const list = parseMarkets(markets);
  if (!market.trim()) return false;
  return list.some((m) => marketMatches(m, market));
}

/** Derived residency for one specific property/referral market. */
export function residencyFor(markets: unknown, market: string): Residency {
  return isResidentInMarket(markets, market) ? "resident" : "non_resident";
}

export function residencyLabel(residency: Residency): string {
  return residency === "resident" ? "Resident on this transaction" : "Non-Resident on this transaction";
}

export function formatMarkets(markets: unknown): string {
  const list = parseMarkets(markets);
  return list.length > 0 ? list.join(" · ") : "—";
}
