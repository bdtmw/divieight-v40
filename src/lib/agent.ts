import { supabase } from "@/integrations/supabase/client";

/**
 * The `agents` / `brokers` tables live outside the generated Supabase types
 * (external project — types are regenerated separately), so agent queries go
 * through this loosely typed handle.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
};

/** Roles an agent may self-select at registration. */
export const SELECTABLE_AGENT_ROLES = ["non_resident", "resident", "listing"] as const;
export type SelectableAgentRole = (typeof SELECTABLE_AGENT_ROLES)[number];

/** All roles, including `heavy_lifting`, which the platform assigns per pod. */
export type AgentRole = SelectableAgentRole | "heavy_lifting";

export const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  non_resident: "Non-Resident Agent",
  resident: "Resident Agent",
  listing: "Listing Agent",
  heavy_lifting: "Heavy-Lifting Agent",
};

export const AGENT_ROLE_DESCRIPTIONS: Record<SelectableAgentRole, string> = {
  non_resident:
    "You represent buyers who live outside the market and are purchasing a share remotely.",
  resident: "You are licensed and active in the market where the property sits.",
  listing: "You represent sellers bringing whole properties into 1/8th share ownership.",
};

export interface AgentRow {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AgentRole;
  license_number: string;
  license_state: string;
  service_area: string;
  broker_id: string | null;
  onboarding_status: string;
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
  role: SelectableAgentRole;
  licenseNumber: string;
  licenseState: string;
  serviceArea: string;
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
      role: input.role,
      license_number: input.licenseNumber,
      license_state: input.licenseState,
      service_area: input.serviceArea,
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
    case "insurance_pending":
      return "/agent/onboarding/insurance";
    case "fincen_pending":
      return "/agent/onboarding/fincen";
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
  role: SelectableAgentRole;
  licenseNumber: string;
  licenseState: string;
  serviceArea: string;
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
