import { AlertOctagon } from "lucide-react";
import type { ClosingHoldState } from "@/lib/closing-hold";

/**
 * Shown to everyone involved in a pod (buyers, Resident Agents, the Heavy
 * Lifting Agent and the Manager) while a Broker Closing Hold is active.
 * MONTH 4: the closing engine must block the Closing Ping Saga while this
 * hold is active.
 */
export function ClosingHoldBanner({ hold }: { hold: ClosingHoldState | null | undefined }) {
  if (!hold?.active) return null;
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">
      <div className="flex items-start gap-3">
        <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Closing hold active — this transaction is halted
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed by {hold.placedByBrokerName ?? "the Broker of Record"}
            {hold.placedAt ? ` on ${new Date(hold.placedAt).toLocaleString()}` : ""}. Closing steps
            cannot proceed until the hold is lifted.
          </p>
          {hold.reason ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-sans text-xs text-foreground [overflow-wrap:anywhere]">
              {hold.reason}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
