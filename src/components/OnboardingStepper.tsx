import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const STEPS = ["Intent", "Identity", "Property", "Listing", "Media", "Agreement"] as const;
const IDENTITY_STEP = 2;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Identity is a one-time check. Once the seller has completed it, we hide the
 * Identity step from the stepper on every later listing so the flow reads
 * Intent → Property → Listing → Media → Agreement.
 */
export function useIdentityDone() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sellers")
        .select("full_name, address, date_of_birth")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setDone(
        !!data?.full_name?.trim() && !!data?.address?.trim() && !!data?.date_of_birth,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return done;
}

export function OnboardingStepper({ current }: { current: OnboardingStep }) {
  const identityDone = useIdentityDone();
  // Never hide the step the user is currently standing on.
  const hideIdentity = identityDone && current !== IDENTITY_STEP;

  const visible = STEPS.map((label, i) => ({ label, step: (i + 1) as OnboardingStep })).filter(
    (s) => !(hideIdentity && s.step === IDENTITY_STEP),
  );

  return (
    <ol className="mx-auto flex w-full max-w-3xl items-center gap-1.5 sm:gap-2">
      {visible.map(({ label, step }, i) => {
        const isActive = step === current;
        const isDone = step < current;
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
                {i + 1}
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
            {i < visible.length - 1 ? (
              <span className={cn("h-px flex-1", isDone ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
