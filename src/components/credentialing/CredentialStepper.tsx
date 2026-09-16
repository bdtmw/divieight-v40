import { cn } from "@/lib/utils";
import { ENTITY_CONFIG, type EntityType } from "@/lib/credentialing";
import { useAgentOnboardingStatus } from "@/hooks/use-agent-onboarding";

export type CredentialStep = 1 | 2 | 3 | 4 | 5;

/** Five-step progress indicator shared by agent and broker onboarding. */
export function CredentialStepper({
  entityType,
  current,
}: {
  entityType: EntityType;
  current: CredentialStep;
}) {
  const steps = ENTITY_CONFIG[entityType].steps;
  // For agents, completion comes from the one source of truth
  // (`getAgentOnboardingStatus`), never from the current step number.
  const status = useAgentOnboardingStatus();
  const agentStatus = entityType === "agent" ? status : null;
  return (
    <ol className="mx-auto flex w-full max-w-3xl items-center gap-1.5 sm:gap-2">
      {steps.map((label, i) => {
        const step = (i + 1) as CredentialStep;
        const isActive = step === current;
        const agentStep = agentStatus?.steps.find((s) => s.step === step);
        const isDone = agentStatus
          ? // Step 5 ("Complete") is done only when all four are on file.
            (agentStep ? agentStep.complete : agentStatus.complete) && !isActive
          : step < current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors sm:h-8 sm:w-8 sm:text-xs",
                  isActive && "border-accent bg-accent text-accent-foreground",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isDone && "border-border bg-background text-muted-foreground",
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs font-medium uppercase tracking-wider md:inline",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className={cn("h-px flex-1", isDone ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
