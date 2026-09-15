import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { residencyFor, type Residency } from "@/lib/markets";

/**
 * Verified Lead Dashboard data.
 *
 * Read-only view over Month 2 buyer data, scoped so an agent only ever sees
 * the buyers tethered to their own agent row. PII boundary: identity, market,
 * and status flags only — never vetting report contents, liquidity documents,
 * or background-check detail.
 *
 * Runs with the service role because RLS keeps `buyer_accounts` readable only
 * by the buyer; the scoping to `tethered_resident_agent_id` is enforced here.
 */

export interface TetheredBuyer {
  buyerAccountId: string;
  /** Display identity for the agent — email is the buyer's contact of record. */
  name: string;
  email: string;
  market: string | null;
  goldenTicketIssued: boolean;
  goldenTicketIssuedAt: string | null;
  onboardingStatus: string;
  /** 0-100, derived from the Month 2 onboarding milestones. */
  onboardingPercent: number;
  liquidityVerified: boolean;
  liquidityStatus: string;
  /** Platform Enrollment Fee: 'paid' | 'pending' | 'unpaid'. */
  pefStatus: "paid" | "pending" | "unpaid";
  priorityRank: number | null;
  tetheredAt: string | null;
  /** Derived per transaction from the agent's markets — never a stored role. */
  residency: Residency;
}

/** Milestone-based completion so the agent can see how far along a lead is. */
export function onboardingPercent(row: {
  intent: string | null;
  primary_target_market: string | null;
  pefPaid: boolean;
  onboarding_status: string;
  liquidity_verified: boolean;
  golden_ticket_issued: boolean;
}): number {
  const milestones = [
    Boolean(row.intent),
    Boolean(row.primary_target_market),
    row.pefPaid,
    ["vetted", "cleared", "active", "complete"].includes(row.onboarding_status),
    row.liquidity_verified,
    row.golden_ticket_issued,
  ];
  const done = milestones.filter(Boolean).length;
  return Math.round((done / milestones.length) * 100);
}

export const listMyTetheredBuyers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TetheredBuyer[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const { data: agent } = await db
      .from("agents")
      .select("id, markets")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!agent) return [];

    const { data: buyers } = await db
      .from("buyer_accounts")
      .select(
        "id, email, intent, primary_target_market, onboarding_status, golden_ticket_issued, golden_ticket_issued_at, liquidity_verified, liquidity_status, priority_rank, tethered_at",
      )
      .eq("tethered_resident_agent_id", agent.id)
      .order("created_at", { ascending: false });

    const rows = (buyers ?? []) as any[];
    if (rows.length === 0) return [];

    const { data: payments } = await db
      .from("buyer_enrollment_payments")
      .select("buyer_account_id, status")
      .in(
        "buyer_account_id",
        rows.map((r) => r.id),
      );

    const payStatus = new Map<string, "paid" | "pending">();
    for (const p of (payments ?? []) as any[]) {
      const current = payStatus.get(p.buyer_account_id);
      if (p.status === "paid" || p.status === "succeeded" || p.status === "complete") {
        payStatus.set(p.buyer_account_id, "paid");
      } else if (current !== "paid") {
        payStatus.set(p.buyer_account_id, "pending");
      }
    }

    return rows.map((r) => {
      const pef = payStatus.get(r.id) ?? "unpaid";
      return {
        buyerAccountId: r.id,
        name: (r.email ?? "").split("@")[0] || "Buyer",
        email: r.email ?? "",
        market: r.primary_target_market ?? null,
        goldenTicketIssued: Boolean(r.golden_ticket_issued),
        goldenTicketIssuedAt: r.golden_ticket_issued_at ?? null,
        onboardingStatus: r.onboarding_status ?? "unknown",
        onboardingPercent: onboardingPercent({
          intent: r.intent ?? null,
          primary_target_market: r.primary_target_market ?? null,
          pefPaid: pef === "paid",
          onboarding_status: r.onboarding_status ?? "",
          liquidity_verified: Boolean(r.liquidity_verified),
          golden_ticket_issued: Boolean(r.golden_ticket_issued),
        }),
        liquidityVerified: Boolean(r.liquidity_verified),
        liquidityStatus: r.liquidity_status ?? "pending",
        pefStatus: pef,
        priorityRank: r.priority_rank ?? null,
        tetheredAt: r.tethered_at ?? null,
        residency: residencyFor(agent.markets, (r.primary_target_market ?? "").trim()),
      } satisfies TetheredBuyer;
    });
  });
