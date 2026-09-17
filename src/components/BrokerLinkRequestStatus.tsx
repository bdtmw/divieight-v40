import { Clock, XCircle } from "lucide-react";
import {
  PENDING_APPROVAL_LABEL,
  type AgentLinkRequestState,
} from "@/lib/broker-link-requests";

/**
 * Agent-side status for a broker link that is awaiting the Broker of
 * Record's decision, or that the broker declined. Shown wherever the agent
 * would otherwise see their broker info.
 */
export function BrokerLinkRequestStatus({
  state,
  className = "",
}: {
  state: AgentLinkRequestState | null;
  className?: string;
}) {
  if (!state) return null;
  const brokerage = state.brokerageName ?? "the brokerage";

  if (state.pending) {
    return (
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm ${className}`}
      >
        <Clock className="h-5 w-5 shrink-0 text-accent" />
        <p className="min-w-0 flex-1 text-foreground">
          <span className="font-semibold">{PENDING_APPROVAL_LABEL}</span> — {brokerage} has been
          notified of your request. You are not linked to a Broker of Record until they accept.
        </p>
      </div>
    );
  }

  if (state.rejected) {
    return (
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm ${className}`}
      >
        <XCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="min-w-0 flex-1 text-foreground">
          Your request was declined by {brokerage}. Select a different brokerage below, or send an
          onboarding invitation to a new Broker of Record.
        </p>
      </div>
    );
  }

  return null;
}
