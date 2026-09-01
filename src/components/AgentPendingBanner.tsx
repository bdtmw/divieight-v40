import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { pendingHoursLeft } from "@/lib/arello";
import { retryMyArelloCheck } from "@/lib/arello-retry.functions";

/**
 * Persistent banner shown while an agent sits in the 24-hour ARELLO
 * pending-retry window. Onboarding continues; only final activation is held.
 */
export function AgentPendingBanner({
  agent,
  onUpdated,
}: {
  agent: AgentRow;
  onUpdated?: (agent: AgentRow) => void;
}) {
  const retry = useServerFn(retryMyArelloCheck);
  const [busy, setBusy] = useState(false);

  if (agent.onboarding_status !== "arello_pending_retry") return null;

  async function onRetry() {
    setBusy(true);
    try {
      const result = await retry({ data: { agentId: agent.id } });
      const refreshed = await getAgentProfile(agent.auth_user_id);
      if (refreshed) onUpdated?.(refreshed);
      toast[result.verified > 0 ? "success" : "info"](
        result.verified > 0
          ? "License verified — full activation unlocked."
          : "The registry is still unavailable. We'll keep retrying.",
      );
    } catch {
      toast.error("Retry failed. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <Clock className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="min-w-0 flex-1 text-foreground">
        License verification in progress — some features are limited until this completes.{" "}
        <span className="text-muted-foreground">
          About {pendingHoursLeft(agent.arello_pending_since)}h left in the retry window.
        </span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Retry now
      </button>
    </div>
  );
}
