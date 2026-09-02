import { supabase } from "@/integrations/supabase/client";

/**
 * Agent onboarding step 3 — FinCEN/AML acknowledgment plus the three
 * Ethics & Interoperability acknowledgments. Each is stored as its own
 * queryable row in `agent_acknowledgments`, with a mirrored timestamp on
 * `agents` for fast gating.
 */

const db = supabase as unknown as { from: (table: string) => any };

export const ACKNOWLEDGMENT_TYPES = [
  "fincen_aml",
  "ethics_data_accuracy",
  "ethics_non_solicitation",
  "ethics_designated_agent_responsiveness",
] as const;

export type AcknowledgmentType = (typeof ACKNOWLEDGMENT_TYPES)[number];

export const ACKNOWLEDGMENT_TEXT: Record<AcknowledgmentType, string> = {
  fincen_aml:
    "I acknowledge the federal requirements regarding all-cash fractional real estate transactions and my duty to report suspicious activity.",
  ethics_data_accuracy:
    "I agree that all information I provide on the platform is accurate and true.",
  ethics_non_solicitation:
    "I agree not to use the platform to solicit clients or agents away from the platform for side-deals outside the platform's referral system.",
  ethics_designated_agent_responsiveness:
    "I acknowledge that if a buyer designates me by name, I must accept or decline the tethering invitation within 3 calendar days, or the buyer may be reassigned to a different agent.",
};

const AGENT_TIMESTAMP_COLUMN: Record<AcknowledgmentType, string> = {
  fincen_aml: "fincen_ack_at",
  ethics_data_accuracy: "ethics_data_accuracy_ack_at",
  ethics_non_solicitation: "ethics_non_solicitation_ack_at",
  ethics_designated_agent_responsiveness: "ethics_responsiveness_ack_at",
};

export interface AgentAcknowledgmentRow {
  id: string;
  agent_id: string;
  acknowledgment_type: AcknowledgmentType;
  accepted: boolean;
  accepted_at: string | null;
}

/** All acknowledgment rows recorded for an agent. */
export async function getAgentAcknowledgments(
  agentId: string,
): Promise<AgentAcknowledgmentRow[]> {
  const { data, error } = await db
    .from("agent_acknowledgments")
    .select("*")
    .eq("agent_id", agentId);
  if (error) return [];
  return (data as AgentAcknowledgmentRow[]) ?? [];
}

/** True when all four acknowledgments are on file. */
export function hasAllAcknowledgments(rows: AgentAcknowledgmentRow[]): boolean {
  return ACKNOWLEDGMENT_TYPES.every((t) =>
    rows.some((r) => r.acknowledgment_type === t && r.accepted),
  );
}

/**
 * Persist all four acknowledgments (each independently required) and move the
 * agent on to broker linking.
 */
export async function submitComplianceAcknowledgments(
  agentId: string,
): Promise<{ error?: string; acceptedAt?: string }> {
  const now = new Date().toISOString();

  const rows = ACKNOWLEDGMENT_TYPES.map((type) => ({
    agent_id: agentId,
    acknowledgment_type: type,
    accepted: true,
    accepted_at: now,
    acknowledgment_text: ACKNOWLEDGMENT_TEXT[type],
  }));

  const { error } = await db
    .from("agent_acknowledgments")
    .upsert(rows, { onConflict: "agent_id,acknowledgment_type" });
  if (error) return { error: error.message };

  const patch: Record<string, unknown> = { onboarding_status: "broker_link_pending" };
  for (const type of ACKNOWLEDGMENT_TYPES) patch[AGENT_TIMESTAMP_COLUMN[type]] = now;

  const { error: agentError } = await db.from("agents").update(patch).eq("id", agentId);
  if (agentError) return { error: agentError.message };

  return { acceptedAt: now };
}
