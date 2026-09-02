import { supabase } from "@/integrations/supabase/client";

/**
 * Ongoing Agent-to-Broker relationship verification.
 *
 * A licensed agent must remain affiliated with the Broker of Record on file —
 * ARELLO is the authority for that affiliation. When the registry no longer
 * matches (agent not found, or hanging their license with a different
 * brokerage) the relationship lapses and Month 4's transaction engine reads
 * `agents.transactions_held` to hold in-flight transactions.
 *
 * TODO(SourceRE integration): replace `pingBrokerRelationship()` with the real
 * affiliation lookup, called from a server function so the JWT never reaches
 * the browser:
 *   POST https://api.sourcere.arello.com/v1/licensee/search
 *   Authorization: Bearer <SOURCERE_JWT>   (JWT Bearer Token auth)
 *   Body: { licenseNumber, state, searchMode: "test" }  // sandbox
 *   Compare the returned affiliated-brokerage identity with `agents.broker_id`.
 *   Rate limit: 5,000 requests/hour — chunk the sweep and back off on HTTP 429.
 */

const db = supabase as unknown as { from: (table: string) => any };

export type RelationshipStatus = "active" | "lapsed" | "transferred";

export type RelationshipOutcome = "verified" | "not_found" | "error" | "transferred";

export interface RelationshipCheck {
  outcome: RelationshipOutcome;
  /** Broker id the registry reports, when it differs from the one on file. */
  registryBrokerId?: string | null;
  checkedAt: string;
  message: string;
}

export const RELATIONSHIP_LAPSED_MESSAGE = "Agent-Broker relationship needs re-verification.";

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  active: "Verified with Broker of Record",
  lapsed: "Needs re-verification",
  transferred: "Moved to a different brokerage",
};

/** Simulated ARELLO affiliation ping — mirrors the Prompt 2 outcome set. */
export async function pingBrokerRelationship(
  brokerIdOnFile: string | null,
): Promise<RelationshipCheck> {
  await new Promise((r) => setTimeout(r, 1200));
  const checkedAt = new Date().toISOString();
  const roll = Math.random();

  if (roll < 0.8) {
    return {
      outcome: "verified",
      registryBrokerId: brokerIdOnFile,
      checkedAt,
      message: "ARELLO confirms your affiliation with the Broker of Record on file.",
    };
  }
  if (roll < 0.9) {
    return {
      outcome: "not_found",
      checkedAt,
      message:
        "ARELLO shows no active affiliation between your license and the broker on file.",
    };
  }
  return {
    outcome: "error",
    checkedAt,
    message: "The ARELLO registry did not respond. Try the re-verification again shortly.",
  };
}

/** Mark a relationship verified and release any transaction hold. */
export async function markRelationshipActive(
  agentId: string,
  brokerId: string,
): Promise<{ error?: string }> {
  const { error } = await db
    .from("agents")
    .update({
      broker_id: brokerId,
      relationship_status: "active",
      relationship_verified_at: new Date().toISOString(),
      transactions_held: false,
    })
    .eq("id", agentId);
  if (error) return { error: error.message };
  return {};
}

/** Flag a lapsed relationship and set the Month 4 transaction hold flag. */
export async function markRelationshipLapsed(
  agentId: string,
  status: Exclude<RelationshipStatus, "active"> = "lapsed",
): Promise<{ error?: string }> {
  const { error } = await db
    .from("agents")
    .update({ relationship_status: status, transactions_held: true })
    .eq("id", agentId);
  if (error) return { error: error.message };
  return {};
}

export interface LapsedAgentRow {
  id: string;
  full_name: string;
  role: string;
  relationship_status: RelationshipStatus;
  relationship_verified_at: string | null;
}

/** Agents linked to a broker whose relationship is no longer verified. */
export async function listLapsedAgentsForBroker(brokerId: string): Promise<LapsedAgentRow[]> {
  const { data, error } = await db
    .from("agents")
    .select("id, full_name, role, relationship_status, relationship_verified_at")
    .eq("broker_id", brokerId)
    .neq("relationship_status", "active");
  if (error) return [];
  return (data as LapsedAgentRow[]) ?? [];
}
