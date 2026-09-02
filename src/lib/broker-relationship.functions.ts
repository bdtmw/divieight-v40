import { createServerFn } from "@tanstack/react-start";

/**
 * Ongoing Agent-to-Broker relationship re-verification sweep.
 *
 * Same pattern as the ARELLO retry and NAR re-certification sweeps: manually
 * triggerable today, cron-ready later.
 *
 * TODO(SourceRE integration): replace `simulateCheck()` with the real
 * affiliation lookup (JWT Bearer auth, sandbox `searchMode: "test"`,
 * 5,000 req/hour limit — chunk the sweep and back off on HTTP 429).
 *
 * TODO(cron): once pg_cron + pg_net are enabled, schedule a weekly POST to
 * /api/public/broker-relationship-sweep with the project's publishable key in
 * the `apikey` header.
 */

export type SweepOutcome = "verified" | "not_found" | "error" | "transferred";

export interface RelationshipSweepRow {
  agentId: string;
  email: string;
  outcome: SweepOutcome;
  lapsed: boolean;
}

export interface RelationshipSweepResult {
  scanned: number;
  verified: number;
  lapsed: number;
  rows: RelationshipSweepRow[];
}

/** Simulated registry outcome, mirroring the Prompt 2 outcome set. */
function simulateCheck(): SweepOutcome {
  const roll = Math.random();
  if (roll < 0.75) return "verified";
  if (roll < 0.85) return "not_found";
  if (roll < 0.95) return "transferred";
  return "error";
}

export async function runBrokerRelationshipSweep(
  onlyAgentId?: string,
): Promise<RelationshipSweepResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };

  let query = db
    .from("agents")
    .select("id, auth_user_id, email, broker_id, relationship_status")
    .not("broker_id", "is", null);
  if (onlyAgentId) query = query.eq("id", onlyAgentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const agents = (data ?? []) as Array<{
    id: string;
    auth_user_id: string;
    email: string;
    broker_id: string | null;
  }>;

  const rows: RelationshipSweepRow[] = [];
  let verified = 0;
  let lapsed = 0;

  for (const agent of agents) {
    const outcome = simulateCheck();

    if (outcome === "verified") {
      await db
        .from("agents")
        .update({
          relationship_status: "active",
          relationship_verified_at: new Date().toISOString(),
          transactions_held: false,
        })
        .eq("id", agent.id);
      verified += 1;
      rows.push({ agentId: agent.id, email: agent.email, outcome, lapsed: false });
      continue;
    }

    // A registry error is transient — leave the current state untouched.
    if (outcome === "error") {
      rows.push({ agentId: agent.id, email: agent.email, outcome, lapsed: false });
      continue;
    }

    // not_found, or the agent now hangs their license with another brokerage.
    await db
      .from("agents")
      .update({
        relationship_status: outcome === "transferred" ? "transferred" : "lapsed",
        transactions_held: true,
      })
      .eq("id", agent.id);
    await db.from("audit_log").insert({
      actor_id: agent.auth_user_id,
      actor_type: "system",
      action_type: "agent.broker_relationship_lapsed",
      entity_type: "agent",
      entity_id: agent.id,
      metadata: {
        reason: outcome,
        broker_id_on_file: agent.broker_id,
        source: "broker_relationship_sweep",
      },
    });
    lapsed += 1;
    rows.push({ agentId: agent.id, email: agent.email, outcome, lapsed: true });
  }

  return { scanned: agents.length, verified, lapsed, rows };
}

/** Manual trigger (admin/dev button or direct call). */
export const triggerBrokerRelationshipSweep = createServerFn({ method: "POST" })
  .inputValidator((input: { agentId?: string } | undefined) => input ?? {})
  .handler(async ({ data }) => runBrokerRelationshipSweep(data.agentId));
