import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getHlaInvitation, respondToHlaInvitation } from "@/lib/hla.functions";

export const Route = createFileRoute("/agent/pods/$id/hla-invitation")({
  head: () => ({
    meta: [
      { title: "Heavy Lifting Agent invitation — divieight" },
      {
        name: "description",
        content:
          "Accept or decline the Heavy Lifting Agent role for a divieight co-ownership pod.",
      },
      { property: "og:title", content: "Heavy Lifting Agent invitation — divieight" },
      {
        property: "og:description",
        content: "Formally accept or decline coordination of a divieight buyer pod.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HlaInvitationPage,
});

function HlaInvitationPage() {
  const { id } = useParams({ from: "/agent/pods/$id/hla-invitation" });
  const load = useServerFn(getHlaInvitation);
  const respond = useServerFn(respondToHlaInvitation);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: inv, isLoading, refetch } = useQuery({
    queryKey: ["hla-invitation", id],
    queryFn: () => load({ data: { podId: id } }),
  });

  async function send(choice: "accept" | "decline") {
    setBusy(true);
    const res = await respond({ data: { podId: id, choice, note } });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      choice === "accept"
        ? "Accepted — the Master Briefcase is now unlocked."
        : "Declined. The Manager will select an alternate.",
    );
    refetch();
  }

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading invitation…</p>;
  if (!inv)
    return (
      <p className="p-8 text-sm text-muted-foreground">
        This Heavy Lifting Agent invitation isn’t available to you.
      </p>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Professional Portal
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        Heavy Lifting Agent invitation
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {inv.address}, {inv.city}, {inv.state} {inv.zip} · {inv.buyersInPod} reserved share
        {inv.buyersInPod === 1 ? "" : "s"}
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-foreground">
        <p>
          You have been selected to coordinate this pod as the Heavy Lifting Agent. The role
          covers transaction coordination for all eight shares; the other tethered Resident
          Agents remain passive on this pod. Compensation is only the buyer-side commission
          cascade paid at closing by title/escrow through each Broker of Record.
        </p>
        {inv.selectionBasis ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Manager’s basis: {inv.selectionBasis}
          </p>
        ) : null}
        {inv.acceptanceDeadlineAt ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Respond by {new Date(inv.acceptanceDeadlineAt).toLocaleString()} (3 calendar days).
            No response is recorded as a declination and the Manager selects an alternate.
          </p>
        ) : null}
      </div>

      {inv.status === "accepted" ? (
        <Link
          to="/agent/pods/$id/briefcase"
          params={{ id }}
          className="mt-6 inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
        >
          Open the Master Briefcase
        </Link>
      ) : inv.status !== "pending_acceptance" ? (
        <p className="mt-6 text-sm text-muted-foreground">
          This invitation is closed. The Manager is selecting an alternate agent.
        </p>
      ) : (
        <>
          <label className="mt-6 block text-sm font-medium text-foreground">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => send("accept")}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              Accept the role
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => send("decline")}
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
  );
}
