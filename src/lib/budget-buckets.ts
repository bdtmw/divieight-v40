/**
 * Buyer target-budget buckets.
 *
 * Privacy rule: a buyer's budget is captured and DISPLAYED only as a coarse
 * bucket. Buckets are deliberately wide so that the union of two overlapping
 * buyer ranges can never be narrowed down to identify an individual. No
 * human-facing surface may ever show a computed budget figure.
 *
 * The only permitted numeric use is the Platform's internal Liquidity Gate
 * math (>= 1.2x). For that we store `liquidityBasis` — the conservative top of
 * the bucket (or the floor for the open-ended top bucket) — in
 * `buyer_accounts.target_budget`. That number is internal only.
 *
 * Bucket boundaries are a business decision; confirm with the spec owner
 * before changing them.
 */

export interface BudgetBucket {
  id: string;
  label: string;
  min: number;
  /** null = open ended. */
  max: number | null;
}

export const BUDGET_BUCKETS: BudgetBucket[] = [
  { id: "100k_200k", label: "$100K–200K", min: 100_000, max: 200_000 },
  { id: "200k_300k", label: "$200K–300K", min: 200_000, max: 300_000 },
  { id: "300k_500k", label: "$300K–500K", min: 300_000, max: 500_000 },
  { id: "500k_plus", label: "$500K+", min: 500_000, max: null },
];

/** Internal-only numeric basis for the 1.2x Liquidity Gate. Never displayed. */
export function liquidityBasisFor(bucket: BudgetBucket): number {
  return bucket.max ?? bucket.min;
}

export function bucketById(id: string | null | undefined): BudgetBucket | null {
  if (!id) return null;
  return BUDGET_BUCKETS.find((b) => b.id === id) ?? null;
}

/** Maps a legacy exact amount into the nearest bucket (data is bucketed, not discarded). */
export function bucketForAmount(amount: number | null | undefined): BudgetBucket | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  for (const b of BUDGET_BUCKETS) {
    if (b.max === null || amount <= b.max) {
      // Below the lowest floor still maps to the lowest bucket — nearest match.
      return b;
    }
  }
  return BUDGET_BUCKETS[BUDGET_BUCKETS.length - 1] ?? null;
}

/**
 * The only budget string any human should ever see. Falls back to the bucket
 * derived from a legacy numeric value.
 */
export function budgetBucketLabel(
  bucketId: string | null | undefined,
  legacyAmount?: number | null,
): string {
  const bucket = bucketById(bucketId) ?? bucketForAmount(legacyAmount);
  return bucket ? bucket.label : "Not provided";
}
