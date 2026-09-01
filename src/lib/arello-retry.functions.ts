import { createServerFn } from "@tanstack/react-start";

/**
 * Background retry for agents stuck in the 24-hour ARELLO pending window.
 *
 * TODO(SourceRE integration): replace `attempt()` with the real vendor call:
 *   POST https://api.sourcere.arello.com/v1/licensee/search
 *   Authorization: Bearer <SOURCERE_JWT>  (JWT Bearer Token auth)
 *   Body: { licenseNumber, state, searchMode: "test" }  // sandbox
 *   Rate limit: 5,000 req/hour — chunk the sweep and back off on HTTP 429.
 *
 * TODO(cron): no scheduler is wired yet. Once pg_cron + pg_net are enabled,
 * schedule an hourly POST to /api/public/arello-retry with the project's
 * publishable key in the `apikey` header. Until then it is triggered manually
 * (agent dashboard "Retry now" button, or a direct POST).
 */

export interface ArelloRetryRow {
  agentId: string;
  email: string;
  outcome: "verified" | "still_pending" | "expired_window";
}

export interface ArelloRetryResult {
  scanned: number;
  verified: number;
  stillPending: number;
  rows: ArelloRetryRow[];
}

/** Simulated registry attempt: 60% of retries succeed. */
function attempt(): boolean {
  return Math.random() < 0.6;
}

const PENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function runArelloRetrySweep(
  onlyAgentId?: string,
): Promise<ArelloRetryResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };

  let query = db
    .from("agents")
    .select("id, auth_user_id, email, license_number, license_state, arello_pending_since")
    .eq("onboarding_status", "arello_pending_retry");
  if (onlyAgentId) query = query.eq("id", onlyAgentId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const agents = (data ?? []) as Array<{
    id: string;
    auth_user_id: string;
    email: string;
    arello_pending_since: string | null;
  }>;

  const rows: ArelloRetryRow[] = [];
  let verified = 0;
  let stillPending = 0;

  for (const agent of agents) {
    const ok = attempt();
    if (ok) {
      const now = new Date().toISOString();
      await db
        .from("agents")
        .update({
          license_verified: true,
          license_verified_at: now,
          arello_pending_since: null,
          onboarding_status: "insurance_pending",
        })
        .eq("id", agent.id);
      await db.from("audit_log").insert({
        actor_id: agent.auth_user_id,
        actor_type: "agent",
        action_type: "agent.arello_retry_verified",
        entity_type: "agent",
        entity_id: agent.id,
        metadata: { source: "background_retry" },
      });
      verified += 1;
      rows.push({ agentId: agent.id, email: agent.email, outcome: "verified" });
      continue;
    }

    const expired =
      agent.arello_pending_since != null &&
      Date.now() - new Date(agent.arello_pending_since).getTime() > PENDING_WINDOW_MS;

    stillPending += 1;
    rows.push({
      agentId: agent.id,
      email: agent.email,
      outcome: expired ? "expired_window" : "still_pending",
    });
  }

  return { scanned: agents.length, verified, stillPending, rows };
}

/** Manual trigger used by the agent dashboard banner. */
export const retryMyArelloCheck = createServerFn({ method: "POST" })
  .inputValidator((input: { agentId: string }) => input)
  .handler(async ({ data }) => runArelloRetrySweep(data.agentId));
