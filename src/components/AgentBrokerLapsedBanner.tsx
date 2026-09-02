import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { RELATIONSHIP_LAPSED_MESSAGE } from "@/lib/broker-relationship";

/**
 * Shown on the agent's dashboard (and, in read-only form, on the linked
 * broker's dashboard) whenever the agent-broker relationship is no longer
 * verified with ARELLO. While lapsed, `agents.transactions_held` is true and
 * Month 4's transaction engine holds in-flight transactions.
 */
export function AgentBrokerLapsedBanner({
  status,
  agentName,
  actionable = true,
}: {
  status: string | null | undefined;
  agentName?: string;
  actionable?: boolean;
}) {
  if (!status || status === "active") return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 text-foreground">
        {RELATIONSHIP_LAPSED_MESSAGE}
        {agentName ? <span className="text-muted-foreground"> — {agentName}</span> : null}
        {status === "transferred" ? (
          <span className="text-muted-foreground">
            {" "}
            The registry shows a different brokerage on this license.
          </span>
        ) : null}
      </p>
      {actionable ? (
        <Link
          to="/agent/broker-relationship"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground"
        >
          Re-verify now
        </Link>
      ) : null}
    </div>
  );
}
