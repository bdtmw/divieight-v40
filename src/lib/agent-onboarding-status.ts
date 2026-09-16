import { supabase } from "@/integrations/supabase/client";
import { getAgentAcknowledgments, hasAllAcknowledgments } from "@/lib/agent-acknowledgments";

/**
 * THE single source of truth for "how far is this agent's onboarding".
 *
 * Every consumer — the /agent/* route guard, the progress stepper and the
 * dashboard banners — reads from here. Completion is derived ONLY from
 * persisted database fields, never from navigation history, local component
 * state or a step counter.
 */

const db = supabase as unknown as { from: (table: string) => any };

export type AgentOnboardingStepKey = "license" | "insurance" | "compliance" | "broker";

export interface AgentOnboardingStepState {
  key: AgentOnboardingStepKey;
  /** 1-based position in the stepper. */
  step: 1 | 2 | 3 | 4;
  label: string;
  path: string;
  complete: boolean;
}

export interface AgentOnboardingStatus {
  agentId: string;
  steps: AgentOnboardingStepState[];
  /** First step whose data is not on file, or null when everything is done. */
  firstIncomplete: AgentOnboardingStepState | null;
  complete: boolean;
}

export const AGENT_ONBOARDING_PATHS: Record<AgentOnboardingStepKey, string> = {
  license: "/agent/onboarding/license-check",
  insurance: "/agent/onboarding/insurance",
  compliance: "/agent/onboarding/compliance",
  broker: "/agent/onboarding/broker",
};

/** Extra paths that belong to a step but aren't the step's canonical URL. */
const STEP_ALIASES: Record<AgentOnboardingStepKey, string[]> = {
  license: ["/agent/onboarding/license-details"],
  insurance: [],
  compliance: [],
  broker: ["/agent/broker-relationship"],
};

export function isAgentOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/agent/onboarding");
}

/** True when `pathname` is part of the given step (canonical URL or alias). */
export function pathBelongsToStep(pathname: string, step: AgentOnboardingStepState): boolean {
  if (pathname === step.path || pathname.startsWith(`${step.path}/`)) return true;
  return STEP_ALIASES[step.key].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Reads the agent's actual rows and reports which steps are genuinely done.
 * Returns null when no agent row exists for the id.
 */
export async function getAgentOnboardingStatus(
  agentId: string,
): Promise<AgentOnboardingStatus | null> {
  const { data: agent, error } = await db.from("agents").select("*").eq("id", agentId).maybeSingle();
  if (error || !agent) return null;

  // Step 1 — ARELLO license verification.
  const licenseDone = agent.license_verified === true;

  // Step 2 — E&O proof (uploaded file OR broker affirmation) AND NAR cert.
  const eoOnFile = !!agent.eo_insurance_url || agent.eo_broker_affirmed === true;
  const insuranceDone = eoOnFile && !!agent.nar_cert_signed_at;

  // Step 3 — all four FinCEN/Ethics acknowledgments recorded.
  const acks = await getAgentAcknowledgments(agentId, "agent");
  const complianceDone = hasAllAcknowledgments(acks);

  // Step 4 — linked to a Broker of Record whose own onboarding is active.
  let brokerDone = false;
  if (agent.broker_id) {
    const { data: broker } = await db
      .from("brokers")
      .select("id, onboarding_status")
      .eq("id", agent.broker_id)
      .maybeSingle();
    brokerDone = broker?.onboarding_status === "active";
  }

  const steps: AgentOnboardingStepState[] = [
    {
      key: "license",
      step: 1,
      label: "License",
      path: AGENT_ONBOARDING_PATHS.license,
      complete: licenseDone,
    },
    {
      key: "insurance",
      step: 2,
      label: "Insurance/Cert",
      path: AGENT_ONBOARDING_PATHS.insurance,
      complete: insuranceDone,
    },
    {
      key: "compliance",
      step: 3,
      label: "FinCEN/Ethics",
      path: AGENT_ONBOARDING_PATHS.compliance,
      complete: complianceDone,
    },
    {
      key: "broker",
      step: 4,
      label: "Broker Link",
      path: AGENT_ONBOARDING_PATHS.broker,
      complete: brokerDone,
    },
  ];

  const firstIncomplete = steps.find((s) => !s.complete) ?? null;

  return { agentId, steps, firstIncomplete, complete: firstIncomplete === null };
}

/**
 * Where an agent standing on `pathname` should be sent, or null when the page
 * is allowed. Incomplete onboarding pins the agent to the first incomplete
 * step; completed onboarding closes the wizard.
 */
export function agentGuardRedirect(
  status: AgentOnboardingStatus,
  pathname: string,
): string | null {
  if (status.complete) {
    return isAgentOnboardingPath(pathname) ? "/agent/dashboard" : null;
  }
  const target = status.firstIncomplete!;
  if (pathBelongsToStep(pathname, target)) return null;
  return target.path;
}
