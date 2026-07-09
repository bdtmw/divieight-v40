import { cn } from "@/lib/utils";

const STEPS = ["Intent", "Identity", "Property", "Listing", "Agreement"] as const;

export function OnboardingStepper({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <ol className="mx-auto flex w-full max-w-3xl items-center gap-2">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isActive && "border-accent bg-accent text-accent-foreground",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isDone && "border-border bg-background text-muted-foreground",
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium uppercase tracking-wider sm:inline",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                className={cn(
                  "h-px flex-1",
                  isDone ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
