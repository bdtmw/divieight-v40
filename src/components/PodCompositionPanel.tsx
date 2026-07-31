import { Lock } from "lucide-react";
import type { PodComposition } from "@/lib/pod";
import { cn } from "@/lib/utils";

const SLOT_COPY: Record<PodComposition["slots"][number], { label: string; className: string }> = {
  retained: { label: "Seller retained", className: "bg-primary/10 text-primary" },
  reserved: { label: "Reserved", className: "bg-accent/15 text-accent" },
  available: { label: "Available", className: "bg-muted text-muted-foreground" },
};

/**
 * Buyer Group Formation view. Shows how the eight slices are allocated
 * without exposing any buyer identity.
 */
export function PodCompositionPanel({
  composition,
  className,
}: {
  composition: PodComposition;
  className?: string;
}) {
  const taken = composition.reservedShares + composition.retainedShares;

  return (
    <section className={cn("rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-foreground">Pod composition</h2>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground">
          {taken} of 8 shares committed
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {composition.reservedShares} share{composition.reservedShares === 1 ? "" : "s"} reserved by
        vetted buyers · {composition.availableShares} still available.
      </p>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {composition.slots.map((slot, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <span className="text-sm font-medium text-foreground">Share {i + 1}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                SLOT_COPY[slot].className,
              )}
            >
              {SLOT_COPY[slot].label}
            </span>
          </li>
        ))}
      </ol>

      {composition.hardLocked ? (
        <p className="mt-4 inline-flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Hard-Lock applied — price per 1/8th share and commission terms are frozen for this pod.
        </p>
      ) : null}

      {composition.listingStatus === "system_lock" ? (
        <p className="mt-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-foreground">
          This pod is full and has entered <span className="font-semibold">System Lock</span> while
          closing documents are prepared.
        </p>
      ) : null}
    </section>
  );
}
