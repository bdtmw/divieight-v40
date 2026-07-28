// Liquidity gate helpers.
//
// Kept out of the route file so the logic is testable and reusable once real
// Plaid balances flow in.
//
// TODO (production): create link tokens server-side with the live Plaid
// client_id/secret, exchange public_token -> access_token, and call
// /accounts/balance/get. Never ship Plaid secrets to the browser.

export const LIQUIDITY_MULTIPLIER = 1.2;

export const PLAID_SANDBOX = {
  username: "user_good",
  password: "pass_good",
  institution: "First Platypus Bank",
} as const;

export interface PlaidAccountBalance {
  name: string;
  mask: string;
  available: number;
}

/** Sum of available balances across linked depository accounts. */
export function totalAvailableBalance(accounts: PlaidAccountBalance[]): number {
  return accounts.reduce((sum, a) => sum + (a.available ?? 0), 0);
}

/** Real rule: linked accounts must hold >= 1.2x the buyer's target budget. */
export function meetsLiquidityThreshold(
  accounts: PlaidAccountBalance[],
  targetBudget: number | null,
): boolean {
  if (!targetBudget || targetBudget <= 0) return false;
  return totalAvailableBalance(accounts) >= targetBudget * LIQUIDITY_MULTIPLIER;
}

/**
 * Plaid sandbox "user_good" returns fixed synthetic balances. Here we shape
 * sandbox data so the threshold logic above runs against a realistic payload;
 * swap this for the live /accounts/balance/get response in production.
 */
export function sandboxBalanceFor(targetBudget: number | null): PlaidAccountBalance[] {
  const base = targetBudget && targetBudget > 0 ? targetBudget : 100_000;
  return [
    { name: "Plaid Checking", mask: "0000", available: Math.round(base * 0.35) },
    { name: "Plaid Saving", mask: "1111", available: Math.round(base * 0.95) },
  ];
}
