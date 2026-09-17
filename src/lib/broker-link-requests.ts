import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { AgentRow } from "@/lib/agent";
import { getBrokerById } from "@/lib/broker";

/**
 * Broker approval for agent-to-broker linking.
 *
 * An agent picking an existing brokerage (at registration, or when changing
 * brokers later) no longer sets `agents.broker_id` directly — it creates a
 * pending request the Broker of Record must accept. The separate
 * `broker_invitations` flow (email invite → broker registers) is unaffected:
 * registering through the invite link already is the broker's acceptance.
 */

const db = supabase as unknown as { from: (table: string) => any };

export type LinkRequestStatus = "pending" | "accepted" | "rejected";
export type LinkRequestReason = "initial_registration" | "broker_change";

export interface BrokerLinkRequestRow {
  id: string;
  agent_id: string;
  broker_id: string;
  status: LinkRequestStatus;
  reason: LinkRequestReason;
  requested_at: string;
  resolved_at: string | null;
}

export const PENDING_APPROVAL_LABEL = "Pending Broker Approval";

/** Create a pending link request. Does NOT touch `agents.broker_id`. */
export async function requestBrokerLink(input: {
  agent: AgentRow;
  brokerId: string;
  brokerageName?: string;
  reason: LinkRequestReason;
}): Promise<{ request?: BrokerLinkRequestRow; error?: string }> {
  const existing = await getPendingRequestForAgent(input.agent.id);
  if (existing) {
    return { error: "You already have a broker approval request pending." };
  }

  const { data, error } = await db
    .from("broker_link_requests")
    .insert({
      agent_id: input.agent.id,
      broker_id: input.brokerId,
      status: "pending",
      reason: input.reason,
    })
    .select("*")
    .maybeSingle();

  if (error) return { error: error.message };
  const request = (data as BrokerLinkRequestRow) ?? undefined;

  const broker = await getBrokerById(input.brokerId);
  if (broker?.auth_user_id) {
    await supabase.from("notifications").insert({
      seller_id: broker.auth_user_id,
      type: "broker_link_request",
      message: `${input.agent.full_name} has requested to link as one of your sponsored agents.`,
    });
  }

  await logAudit({
    actorId: input.agent.auth_user_id,
    actorType: "agent",
    actionType: "broker.link_requested",
    entityType: "broker",
    entityId: input.brokerId,
    metadata: {
      agent_id: input.agent.id,
      reason: input.reason,
      brokerage_name: input.brokerageName ?? broker?.brokerage_name ?? null,
      request_id: request?.id ?? null,
    },
  });

  return { request };
}

export async function getPendingRequestForAgent(
  agentId: string,
): Promise<BrokerLinkRequestRow | null> {
  const { data, error } = await db
    .from("broker_link_requests")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as BrokerLinkRequestRow) ?? null;
}

/** Most recent request of any status — used to surface a rejection. */
export async function getLatestRequestForAgent(
  agentId: string,
): Promise<BrokerLinkRequestRow | null> {
  const { data, error } = await db
    .from("broker_link_requests")
    .select("*")
    .eq("agent_id", agentId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as BrokerLinkRequestRow) ?? null;
}

export interface AgentLinkRequestState {
  pending: BrokerLinkRequestRow | null;
  /** Latest request, when it was rejected and nothing newer exists. */
  rejected: BrokerLinkRequestRow | null;
  brokerageName: string | null;
}

/** Everything the agent-side UI needs to describe their link state. */
export async function getAgentLinkRequestState(
  agentId: string,
): Promise<AgentLinkRequestState> {
  const latest = await getLatestRequestForAgent(agentId);
  if (!latest) return { pending: null, rejected: null, brokerageName: null };
  const broker = await getBrokerById(latest.broker_id);
  return {
    pending: latest.status === "pending" ? latest : null,
    rejected: latest.status === "rejected" ? latest : null,
    brokerageName: broker?.brokerage_name ?? null,
  };
}

export interface PendingRequestWithAgent extends BrokerLinkRequestRow {
  agent: Pick<
    AgentRow,
    "id" | "full_name" | "email" | "license_number" | "license_state" | "markets"
  > | null;
}

/** Pending requests addressed to a broker, with the requesting agent's details. */
export async function listPendingRequestsForBroker(
  brokerId: string,
): Promise<PendingRequestWithAgent[]> {
  const { data, error } = await db
    .from("broker_link_requests")
    .select("*")
    .eq("broker_id", brokerId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error || !data) return [];

  const rows = data as BrokerLinkRequestRow[];
  if (rows.length === 0) return [];

  const { data: agents } = await db
    .from("agents")
    .select("id, full_name, email, license_number, license_state, markets")
    .in(
      "id",
      rows.map((r) => r.agent_id),
    );

  const byId = new Map<string, PendingRequestWithAgent["agent"]>(
    ((agents as PendingRequestWithAgent["agent"][]) ?? []).map((a) => [a!.id, a]),
  );

  return rows.map((r) => ({ ...r, agent: byId.get(r.agent_id) ?? null }));
}

/**
 * Broker accepts: the agent is linked to this brokerage and the Prompt 6
 * relationship state is set active (a broker_change replaces the previous
 * broker_id at this moment, not before).
 */
export async function acceptLinkRequest(
  request: BrokerLinkRequestRow,
  broker: { id: string; auth_user_id: string; brokerage_name: string },
): Promise<{ error?: string }> {
  const now = new Date().toISOString();

  const { error: agentError } = await db
    .from("agents")
    .update({
      broker_id: broker.id,
      relationship_status: "active",
      relationship_verified_at: now,
      transactions_held: false,
    })
    .eq("id", request.agent_id);
  if (agentError) return { error: agentError.message };

  const { error } = await db
    .from("broker_link_requests")
    .update({ status: "accepted", resolved_at: now })
    .eq("id", request.id);
  if (error) return { error: error.message };

  const { data: agent } = await db
    .from("agents")
    .select("auth_user_id, full_name")
    .eq("id", request.agent_id)
    .maybeSingle();

  if (agent?.auth_user_id) {
    await supabase.from("notifications").insert({
      seller_id: agent.auth_user_id,
      type: "broker_link_request",
      message: `${broker.brokerage_name} accepted your request — they are now your Broker of Record.`,
    });
  }

  await logAudit({
    actorId: broker.auth_user_id,
    actorType: "broker",
    actionType: "broker.link_request_accepted",
    entityType: "broker",
    entityId: broker.id,
    metadata: {
      request_id: request.id,
      agent_id: request.agent_id,
      reason: request.reason,
    },
  });

  return {};
}

/** Broker rejects: nothing about the agent's current broker changes. */
export async function rejectLinkRequest(
  request: BrokerLinkRequestRow,
  broker: { id: string; auth_user_id: string; brokerage_name: string },
): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("broker_link_requests")
    .update({ status: "rejected", resolved_at: now })
    .eq("id", request.id);
  if (error) return { error: error.message };

  const { data: agent } = await db
    .from("agents")
    .select("auth_user_id")
    .eq("id", request.agent_id)
    .maybeSingle();

  if (agent?.auth_user_id) {
    await supabase.from("notifications").insert({
      seller_id: agent.auth_user_id,
      type: "broker_link_request",
      message: `Your request was declined by ${broker.brokerage_name}.`,
    });
  }

  await logAudit({
    actorId: broker.auth_user_id,
    actorType: "broker",
    actionType: "broker.link_request_rejected",
    entityType: "broker",
    entityId: broker.id,
    metadata: {
      request_id: request.id,
      agent_id: request.agent_id,
      reason: request.reason,
    },
  });

  return {};
}
