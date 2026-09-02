import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  listDesignationRequests,
  listReferOnlyElections,
  respondToDesignation,
  respondToReferOnly,
  type DesignationRequest,
  type ReferOnlyElection,
} from "@/lib/designation.functions";

/**
 * Action-required queue: buyer designations awaiting a 3-day response, and
 * Refer-Only elections for buyers this agent referred into their own market.
 *
 * Either way the agent is paid only from the buyer-side commission cascade at
 * closing (full amount if tethered, 25% referral split if refer-only) — the
 * Platform never pays a referral fee.
 */
export function AgentActionItems() {
  const loadDesignations = useServerFn(listDesignationRequests);
  const loadElections = useServerFn(listReferOnlyElections);
  const respondDesignation = useServerFn(respondToDesignation);
  const respondElection = useServerFn(respondToReferOnly);

  const [designations, setDesignations] = useState<DesignationRequest[]>([]);
  const [elections, setElections] = useState<ReferOnlyElection[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, e] = await Promise.all([loadDesignations({}), loadElections({})]);
    setDesignations(d);
    setElections(e);
  }, [loadDesignations, loadElections]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (designations.length === 0 && elections.length === 0) return null;

  return (
    <section className="rounded-xl border border-accent/40 bg-accent/5 p-6">
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg font-semibold text-foreground">Action required</h2>
      </div>

      <ul className="mt-4 space-y-4">
        {designations.map((d) => (
          <li key={d.buyerAccountId} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              A buyer designated you as their agent
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {d.buyerEmail ?? "Vetted buyer"} · Target market {d.market ?? "—"}
              {d.deadlineAt
                ? ` · respond by ${new Date(d.deadlineAt).toLocaleDateString()}`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await respondDesignation({
                    data: { buyerAccountId: d.buyerAccountId, accept: true },
                  });
                  setBusy(false);
                  if (r.error) toast.error(r.error);
                  else toast.success("You're now tethered to this buyer.");
                  void refresh();
                }}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Accept tethering
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await respondDesignation({
                    data: { buyerAccountId: d.buyerAccountId, accept: false },
                  });
                  setBusy(false);
                  toast.success("Declined.");
                  void refresh();
                }}
                className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                Decline
              </button>
            </div>
          </li>
        ))}

        {elections.map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              A buyer you referred is now vetted — choose how to proceed
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {e.buyerEmail ?? "Vetted buyer"} · Target market {e.market ?? "—"}. Refer-Only hands
              the buyer to another Resident Agent; your compensation is then the 25% referral split
              of the buyer-side commission at closing.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await respondElection({
                    data: { electionId: e.id, choice: "accept_tether" },
                  });
                  setBusy(false);
                  if (r.error) toast.error(r.error);
                  else toast.success("You're now tethered to this buyer.");
                  void refresh();
                }}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Accept Tethering for This Buyer
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await respondElection({
                    data: { electionId: e.id, choice: "refer_only" },
                  });
                  setBusy(false);
                  if (r.error) toast.error(r.error);
                  else toast.success("Refer-Only elected — another Resident Agent will be tethered.");
                  void refresh();
                }}
                className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                Refer-Only
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
