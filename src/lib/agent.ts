import { supabase } from "@/integrations/supabase/client";
import { parseMarkets } from "@/lib/markets";

/**
 * The `agents` / `brokers` tables live outside the generated Supabase types
 * (external project — types are regenerated separately), so agent queries go
 * through this loosely typed handle.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
};

/**
 * Agents no longer carry a stored role. Resident vs Non-Resident is derived
 * per transaction from `markets` (see `@/lib/markets`), Listing Agent is
 * `properties.listing_agent_id`, and Heavy Lifting Agent is
 * `pods.heavy_lifting_agent_id`.
 */

export interface AgentRow {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  /** Markets this agent is licensed and active in. */
  markets: string[] | null;
  license_number: string;
  license_state: string;
  broker_id: string | null;
  onboarding_status: string;
  license_verified: boolean | null;
  license_verified_at: string | null;
  arello_pending_since: string | null;
  eo_insurance_url: string | null;
  eo_insurance_uploaded_at: string | null;
  eo_broker_affirmed: boolean | null;
  eo_broker_affirmed_at: string | null;
  /** E&O coverage end date, captured at onboarding. */
  eo_expires_at: string | null;
  /** True once coverage expired without renewed evidence. */
  eo_lapsed: boolean | null;
  eo_lapsed_at: string | null;
  eo_restored_at: string | null;
  nar_cert_signed_at: string | null;
  nar_cert_expires_at: string | null;
  nar_cert_lapsed: boolean | null;
  /** Standing with the linked Broker of Record. */
  relationship_status: "active" | "lapsed" | "transferred" | null;
  relationship_verified_at: string | null;
  /** Read by Month 4's transaction engine to hold in-flight transactions. */
  transactions_held: boolean | null;
  created_at: string;
}

/** Returns the agent profile for an auth user, or null if they aren't an agent. */
export async function getAgentProfile(userId: string): Promise<AgentRow | null> {
  const { data, error } = await db
    .from("agents")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as AgentRow) ?? null;
}

export interface CreateAgentInput {
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  markets: string[];
  licenseNumber: string;
  licenseState: string;
}

/** Create the agent profile. New agents start at ARELLO license verification. */
export async function createAgentProfile(input: CreateAgentInput): Promise<{
  agent?: AgentRow;
  error?: string;
}> {
  const existing = await getAgentProfile(input.userId);
  if (existing) return { agent: existing };

  const { data, error } = await db
    .from("agents")
    .insert({
      auth_user_id: input.userId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      markets: parseMarkets(input.markets),
      license_number: input.licenseNumber,
      license_state: input.licenseState,
      onboarding_status: "arello_pending",
    })
    .select("*")
    .maybeSingle();

  if (error) return { error: error.message };
  return { agent: (data as AgentRow) ?? undefined };
}

/** Where an agent should land based on how far onboarding has progressed. */
export function agentRedirect(onboardingStatus: string): string {
  switch (onboardingStatus) {
    case "not_started":
    case "arello_pending":
      return "/agent/onboarding/license-check";
    // Registry unavailable: the agent keeps moving through onboarding while
    // the background retry runs; only final activation is blocked.
    case "arello_pending_retry":
    case "insurance_pending":
      return "/agent/onboarding/insurance";
    case "compliance_pending":
    case "fincen_pending":
      return "/agent/onboarding/compliance";
    case "broker_link_pending":
      return "/agent/onboarding/broker";
    default:
      return "/agent/dashboard";
  }
}

const DRAFT_KEY = "divieight.agent_registration_draft";

export interface AgentRegistrationDraft {
  fullName: string;
  phone: string;
  markets: string[];
  licenseNumber: string;
  licenseState: string;
}

/** OAuth signups can't carry profile fields, so stash them across the redirect. */
export function saveAgentDraft(draft: AgentRegistrationDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — the callback falls back to the registration form */
  }
}

export function consumeAgentDraft(): AgentRegistrationDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as AgentRegistrationDraft) : null;
  } catch {
    return null;
  }
}
