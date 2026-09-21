import { cn } from "@/lib/utils";

// TODO (Month 2 — Buyer Module): transitions beyond 'forming' are triggered by
// buyer commitment logic. When enough buyers reserve slices, flip to
// 'system_lock'; on escrow readiness → 'closing_ready'; on close → 'active'.

export type ListingStatus =
  | "forming"
  | "system_lock"
  | "closing_ready"
  | "active";

const STAGES: {
  key: ListingStatus;
  label: string;
  description: string;
}[] = [
  {
    key: "forming",
    label: "Forming",
    description: "Recruiting buyers for this property.",
  },
  {
    key: "system_lock",
    label: "System-Lock",
    description: "All 8 shares reserved. Buyer paperwork in progress.",
  },
  {
    key: "closing_ready",
    label: "Closing-Ready",
    description: "Escrow funded. Preparing final close.",
  },
  {
    key: "active",
    label: "Active",
    description: "Co-ownership live. Property is being enjoyed by owners.",
  },
];

/** Canonical labels for a property's pod status — reuse, don't invent new ones. */
export function listingStatusLabel(status: string): string {
  return STAGES.find((s) => s.key === status)?.label ?? "Forming";
}

interface Props {
  status: ListingStatus;
  className?: string;
  showDescription?: boolean;
}

export function ListingStatusTimeline({
  status,
  className,
  showDescription = true,
}: Props) {
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  const current = STAGES[currentIndex] ?? STAGES[0];

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex w-full items-center gap-2">
        {STAGES.map((stage, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <li key={stage.key} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                    isActive && "border-accent bg-accent text-accent-foreground",
                    isDone && "border-primary bg-primary text-primary-foreground",
                    !isActive &&
                      !isDone &&
                      "border-border bg-background text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[11px] font-medium uppercase tracking-wider",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 ? (
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
      {showDescription ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{current.label}:</span>{" "}
          {current.description}
        </p>
      ) : null}
    </div>
  );
}
