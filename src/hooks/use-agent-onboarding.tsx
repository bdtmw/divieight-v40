import { createContext, useContext, type ReactNode } from "react";
import type { AgentOnboardingStatus } from "@/lib/agent-onboarding-status";

/**
 * Shares the one computed onboarding status (from `getAgentOnboardingStatus`)
 * with everything rendered inside the agent portal, so the stepper and the
 * route guard can never disagree.
 */
const AgentOnboardingContext = createContext<AgentOnboardingStatus | null>(null);

export function AgentOnboardingProvider({
  status,
  children,
}: {
  status: AgentOnboardingStatus | null;
  children: ReactNode;
}) {
  return (
    <AgentOnboardingContext.Provider value={status}>{children}</AgentOnboardingContext.Provider>
  );
}

/** Null outside the agent portal (e.g. broker onboarding). */
export function useAgentOnboardingStatus(): AgentOnboardingStatus | null {
  return useContext(AgentOnboardingContext);
}
