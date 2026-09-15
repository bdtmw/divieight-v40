import { useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { restoreEoCoverage, uploadEoInsurance } from "@/lib/agent-compliance";
import { EO_LAPSED_MESSAGE } from "@/lib/eo-expiry";

/**
 * Persistent banner for agents whose E&O coverage has lapsed. Restoration is
 * immediate — a new upload or a broker affirmation clears the lapse and
 * releases the transaction hold with no waiting period.
 */
export function AgentEoLapsedBanner({
  agent,
  onUpdated,
}: {
  agent: AgentRow;
  onUpdated?: (agent: AgentRow) => void;
}) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!agent.eo_lapsed) return null;

  async function restore(opts: { file?: File; brokerAffirmed?: boolean }) {
    setBusy(true);
    let path: string | null = null;
    if (opts.file) {
      const uploaded = await uploadEoInsurance(agent.auth_user_id, opts.file);
      if (uploaded.error) {
        toast.error(uploaded.error);
        setBusy(false);
        return;
      }
      path = uploaded.path ?? null;
    }
    const { error } = await restoreEoCoverage({
      entityId: agent.id,
      authUserId: agent.auth_user_id,
      eoInsurancePath: path,
      brokerAffirmed: Boolean(opts.brokerAffirmed),
    });
    if (error) {
      toast.error(error);
    } else {
      const refreshed = await getAgentProfile(agent.auth_user_id);
      if (refreshed) onUpdated?.(refreshed);
      toast.success("Coverage restored — your hold is released.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <p className="min-w-0 flex-1 text-foreground">{EO_LAPSED_MESSAGE}</p>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void restore({ file });
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Upload renewed proof
      </button>
      <button
        type="button"
        onClick={() => void restore({ brokerAffirmed: true })}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground disabled:opacity-60"
      >
        Broker affirms coverage
      </button>
    </div>
  );
}
