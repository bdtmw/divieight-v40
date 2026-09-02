import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { recertifyNar } from "@/lib/agent-compliance";

/**
 * Persistent banner for agents whose NAR settlement certification has lapsed.
 * While lapsed, in-flight transactions involving the agent show a "Hold".
 */
export function AgentCertLapsedBanner({
  agent,
  onUpdated,
}: {
  agent: AgentRow;
  onUpdated?: (agent: AgentRow) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!agent.nar_cert_lapsed) return null;

  async function onRecertify() {
    setBusy(true);
    const { error } = await recertifyNar(agent.id);
    if (error) {
      toast.error(error);
    } else {
      const refreshed = await getAgentProfile(agent.auth_user_id);
      if (refreshed) onUpdated?.(refreshed);
      toast.success("Certification renewed for another year.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 text-foreground">
        Your NAR Settlement Certification has expired — recertify to continue transactions
      </p>
      <button
        type="button"
        onClick={onRecertify}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Recertify now
      </button>
    </div>
  );
}
