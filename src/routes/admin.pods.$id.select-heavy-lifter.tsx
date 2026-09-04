import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getPodSelection, selectHeavyLifter } from "@/lib/hla.functions";
import { HLA_STATUS_LABELS } from "@/lib/hla";
import { when } from "@/lib/admin";

/**
 * Phase 1 — Manager Selection. Only the pod's tethered Resident Agents are
 * offered; tenure and past closings are shown for judgement, not scored.
 * (Phase 2's automated weighting is documented in src/lib/hla.functions.ts.)
 */
export const Route = createFileRoute("/admin/pods/$id/select-heavy-lifter")({
  component: SelectHeavyLifter,
});

function SelectHeavyLifter() {
  const { id } = useParams({ from: "/admin/pods/$id/select-heavy-lifter" });
  const load = useServerFn(getPodSelection);
  const submit = useServerFn(selectHeavyLifter);
  const [chosen, setChosen] = useState<string | null>(null);
  const [basis, setBasis] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: pod, isLoading, refetch } = useQuery({
    queryKey: ["admin-pod", id],
    queryFn: () => load({ data: { podId: id } }),
  });

  async function confirm() {
    if (!chosen) return;
    setSaving(true);
    const res = await submit({ data: { podId: id, agentId: chosen, basis } });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Heavy Lifting Agent selected — awaiting their acceptance.");
    setChosen(null);
    setBasis("");
    refetch();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading pod…</p>;
  if (!pod) return <p className="text-sm text-muted-foreground">Pod not found.</p>;

  const locked = pod.hlaStatus === "pending_acceptance" || pod.hlaStatus === "accepted";

  return (
    <div className="max-w-3xl">
      <Link to="/admin/pods" className="text-xs text-muted-foreground hover:text-foreground">
        ← All pods
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-foreground">
        Select a Heavy Lifting Agent
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pod.address}, {pod.city}, {pod.state} {pod.zip} · {HLA_STATUS_LABELS[pod.hlaStatus]}
      </p>
      <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
        The Heavy Lifting Agent must come exclusively from the Resident Agents already tethered
        to buyers inside this pod. Tenure and past closings below are informational only — no
        commercial relationship with the Platform plays any part in this decision.
      </p>

      {/* Decline / 3-day timeout returns the pod to the manager for a new cycle. */}
      {!locked && pod.hlaStatus === "declined" ? (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
          The previous Heavy Lifting Agent declined or let the 3-day acceptance window lapse.
          Select an alternate Resident Agent below — this starts a new selection cycle, logged
          separately in the history.
        </div>
      ) : null}

      {locked ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-foreground">
          {pod.heavyLifterName} is currently the selected Heavy Lifting Agent (
          {HLA_STATUS_LABELS[pod.hlaStatus]}
          {pod.acceptanceDeadlineAt ? ` · responds by ${when(pod.acceptanceDeadlineAt)}` : ""}).
        </div>
      ) : pod.eligible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No tethered Resident Agents exist in this pod yet.
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {pod.eligible.map((a) => (
              <li key={a.agentId}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    chosen === a.agentId
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card hover:bg-secondary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="hla"
                    className="mt-1"
                    checked={chosen === a.agentId}
                    onChange={() => setChosen(a.agentId)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      Licensed in {a.licenseState} · {a.serviceArea}
                      {a.brokerageName ? ` · ${a.brokerageName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Platform tenure {a.tenureDays} days · {a.closedTransactions} past pod
                      assignment{a.closedTransactions === 1 ? "" : "s"} · tethered to{" "}
                      {a.buyersInPod} buyer{a.buyersInPod === 1 ? "" : "s"} in this pod
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <label className="mt-5 block text-sm font-medium text-foreground">
            Basis for this selection (optional, recorded in the audit trail)
            <textarea
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
              placeholder="e.g. Deepest local market experience and represents three buyers in this pod."
            />
          </label>

          <button
            type="button"
            disabled={!chosen || saving}
            onClick={confirm}
            className="mt-4 inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Confirming…" : "Confirm selection"}
          </button>
        </>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">Selection history</h2>
        {pod.history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No selection cycles yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {pod.history.map((h) => (
              <li key={h.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <p className="font-medium text-foreground">
                  Cycle #{h.cycle} · {h.agentName}
                  {h.brokerageName ? ` (${h.brokerageName})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.selectionMethod} selection {when(h.selectedAt)} · outcome {h.outcome}
                  {h.outcomeAt ? ` ${when(h.outcomeAt)}` : ""}
                </p>
                {h.selectionBasis ? (
                  <p className="mt-1 text-xs text-muted-foreground">Basis: {h.selectionBasis}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
