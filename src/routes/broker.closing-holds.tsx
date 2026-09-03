import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertOctagon, ShieldCheck } from "lucide-react";
import {
  listBrokerHoldPods,
  placeClosingHold,
  liftClosingHold,
} from "@/lib/closing-hold.functions";
import type { BrokerHoldPod } from "@/lib/closing-hold";
import { ClosingHoldBanner } from "@/components/ClosingHoldBanner";

/**
 * Broker Closing Hold console.
 * MONTH 4 INTEGRATION POINT: a pod with an active hold must be refused by the
 * closing engine before the Closing Ping Saga starts.
 */
export const Route = createFileRoute("/broker/closing-holds")({
  head: () => ({
    meta: [
      { title: "Closing holds — divieight Broker Portal" },
      {
        name: "description",
        content:
          "Place or lift a closing hold on divieight pods where your brokerage supervises the Heavy Lifting Agent.",
      },
      { property: "og:title", content: "Closing holds — divieight Broker Portal" },
      {
        property: "og:description",
        content: "Broker of Record authority to halt a divieight pod's closing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClosingHoldsPage,
});

function ClosingHoldsPage() {
  const load = useServerFn(listBrokerHoldPods);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["broker-hold-pods"],
    queryFn: () => load({}),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          <ShieldCheck className="h-4 w-4" /> Broker authority
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Closing holds</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          As the Broker of Record for an accepted Heavy Lifting Agent, you may halt a pod's closing
          while an issue is documented and resolved. A hold requires contemporaneous documentation
          of the issue, the affected parties and a proposed resolution path.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pods…</p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No pods yet. A pod appears here once one of your supervised agents has accepted the Heavy
          Lifting Agent role for it.
        </p>
      ) : (
        <div className="space-y-6">
          {data.map((pod) => (
            <PodHoldCard key={pod.podId} pod={pod} onChanged={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}

function PodHoldCard({ pod, onChanged }: { pod: BrokerHoldPod; onChanged: () => void }) {
  const place = useServerFn(placeClosingHold);
  const lift = useServerFn(liftClosingHold);
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [resolution, setResolution] = useState("");
  const [parties, setParties] = useState<string[]>([]);
  const [liftNote, setLiftNote] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleParty(id: string) {
    setParties((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function submitHold() {
    setBusy(true);
    const res = await place({
      data: {
        podId: pod.podId,
        issueDescription: issue,
        affectedParties: parties,
        proposedResolution: resolution,
      },
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Closing hold placed — all pod parties have been notified.");
    setOpen(false);
    setIssue("");
    setResolution("");
    setParties([]);
    onChanged();
  }

  async function submitLift() {
    setBusy(true);
    const res = await lift({ data: { podId: pod.podId, resolutionNote: liftNote } });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Closing hold lifted.");
    setLiftNote("");
    onChanged();
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-foreground [overflow-wrap:anywhere]">
            {pod.address}
          </h2>
          <p className="text-sm text-muted-foreground">
            {pod.city}, {pod.state} {pod.zip}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Heavy Lifting Agent: {pod.heavyLifterName}
            {pod.acceptedAt ? ` · accepted ${new Date(pod.acceptedAt).toLocaleDateString()}` : ""}
          </p>
        </div>
        {!pod.hold.active ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
          >
            <AlertOctagon className="h-4 w-4" />
            Place Closing Hold
          </button>
        ) : null}
      </div>

      <ClosingHoldBanner hold={pod.hold} />

      {pod.hold.active ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <label className="text-sm font-medium text-foreground" htmlFor={`lift-${pod.podId}`}>
            Resolution record (required to lift)
          </label>
          <textarea
            id={`lift-${pod.podId}`}
            value={liftNote}
            onChange={(e) => setLiftNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background p-3 text-sm"
            placeholder="How the issue was resolved."
          />
          <button
            type="button"
            disabled={busy}
            onClick={submitLift}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Working…" : "Lift Hold"}
          </button>
        </div>
      ) : open ? (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor={`issue-${pod.podId}`}>
              Issue description
            </label>
            <textarea
              id={`issue-${pod.podId}`}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="What is preventing this closing from proceeding?"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Affected parties</p>
            <div className="flex flex-wrap gap-2">
              {pod.parties.map((p) => {
                const on = parties.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParty(p.id)}
                    className={
                      on
                        ? "rounded-full border border-accent bg-accent/10 px-3 py-1 text-xs font-medium text-foreground"
                        : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
              {pod.parties.length === 0 ? (
                <span className="text-xs text-muted-foreground">No pod parties found.</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor={`res-${pod.podId}`}>
              Proposed resolution path
            </label>
            <textarea
              id={`res-${pod.podId}`}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="What must happen for the hold to be lifted?"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={submitHold}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {busy ? "Placing…" : "Confirm hold"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
