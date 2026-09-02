import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Resident Agent Selection Logic.
 *
 * Runs the moment a Buyer Account earns Golden Ticket status:
 *   1. read the buyer's primary_target_market (zip / market string)
 *   2. find `resident` agents whose service_area matches that market
 *   3. tether the most-tenured one (earliest created_at)
 *   4. if the buyer arrived through a Non-Resident Agent referral, stage a
 *      Standard NAR Referral Agreement placeholder for later generation
 *   5. otherwise flag the Resident Agent for the full buyer-side commission
 *
 * Runs with the service role because a buyer cannot read the agents table and
 * cannot write notifications addressed to an agent's user id.
 */

export type TetherStatus = "pending" | "tethered" | "awaiting_designation";

export interface TetherResult {
  status: TetherStatus;
  residentAgentId: string | null;
  referralAgreementCreated: boolean;
  fullCommission: boolean;
}

/** Loose market match: exact zip, or either string containing the other. */
function marketMatches(serviceArea: string, market: string) {
  const a = serviceArea.trim().toLowerCase();
  const b = market.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export const tetherResidentAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { buyerAccountId: string }) => input)
  .handler(async ({ data, context }): Promise<TetherResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const { data: buyer } = await db
      .from("buyer_accounts")
      .select(
        "id, auth_user_id, primary_target_market, referring_agent_id, golden_ticket_issued, tether_status, tethered_resident_agent_id",
      )
      .eq("id", data.buyerAccountId)
      .maybeSingle();

    if (!buyer || !buyer.golden_ticket_issued) {
      return {
        status: "pending",
        residentAgentId: null,
        referralAgreementCreated: false,
        fullCommission: false,
      };
    }

    // Idempotent: already tethered, nothing to do.
    if (buyer.tether_status === "tethered" && buyer.tethered_resident_agent_id) {
      return {
        status: "tethered",
        residentAgentId: buyer.tethered_resident_agent_id,
        referralAgreementCreated: false,
        fullCommission: false,
      };
    }

    const market = (buyer.primary_target_market ?? "").trim();

    const { data: residents } = await db
      .from("agents")
      .select("id, auth_user_id, full_name, service_area, created_at")
      .eq("role", "resident")
      .order("created_at", { ascending: true });

    const match = market
      ? (residents ?? []).find((a: any) => marketMatches(a.service_area ?? "", market))
      : undefined;

    if (!match) {
      // No Resident Agent covers this market yet — the buyer may designate one.
      await db
        .from("buyer_accounts")
        .update({ tether_status: "awaiting_designation" })
        .eq("id", buyer.id);
      return {
        status: "awaiting_designation",
        residentAgentId: null,
        referralAgreementCreated: false,
        fullCommission: false,
      };
    }

    // Referral context: only a Non-Resident referrer triggers the agreement.
    let referringNonResidentId: string | null = null;
    if (buyer.referring_agent_id) {
      const { data: referrer } = await db
        .from("agents")
        .select("id, role")
        .eq("id", buyer.referring_agent_id)
        .maybeSingle();
      if (referrer?.role === "non_resident") referringNonResidentId = referrer.id;
    }

    const fullCommission = referringNonResidentId === null;
    const now = new Date().toISOString();

    await db
      .from("buyer_accounts")
      .update({
        tethered_resident_agent_id: match.id,
        tether_status: "tethered",
        tethered_at: now,
        resident_agent_full_commission: fullCommission,
      })
      .eq("id", buyer.id);

    let referralAgreementCreated = false;
    if (referringNonResidentId) {
      const { error } = await db.from("pending_referral_agreements").insert({
        buyer_account_id: buyer.id,
        non_resident_agent_id: referringNonResidentId,
        resident_agent_id: match.id,
        status: "pending_generation",
      });
      referralAgreementCreated = !error;
    }

    // Notify the tethered Resident Agent (notifications are keyed by user id).
    if (match.auth_user_id) {
      await db.from("notifications").insert({
        seller_id: match.auth_user_id,
        message: "You've been tethered to a new buyer.",
        type: "tethering",
      });
    }

    await db.from("audit_log").insert({
      actor_id: context.userId,
      action_type: "buyer.resident_agent_tethered",
      entity_type: "buyer_account",
      entity_id: buyer.id,
      metadata: {
        resident_agent_id: match.id,
        market,
        referring_non_resident_agent_id: referringNonResidentId,
        referral_agreement: referralAgreementCreated,
        full_buyer_side_commission: fullCommission,
      },
    });

    return {
      status: "tethered",
      residentAgentId: match.id,
      referralAgreementCreated,
      fullCommission,
    };
  });
