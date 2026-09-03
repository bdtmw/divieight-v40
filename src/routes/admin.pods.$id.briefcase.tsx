import { ClosingHoldBanner } from "@/components/ClosingHoldBanner";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase as BriefcaseIcon } from "lucide-react";
import { getBriefcase, postBriefcaseMessage } from "@/lib/hla.functions";

/** Manager-side view of the Master Briefcase thread (Manager <-> Heavy Lifting Agent). */
export const Route = createFileRoute("/admin/pods/$id/briefcase")({
  component: AdminBriefcase,
});

function AdminBriefcase() {
  const { id } = useParams({ from: "/admin/pods/$id/briefcase" });
  const load = useServerFn(getBriefcase);
  const send = useServerFn(postBriefcaseMessage);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-briefcase", id],
    queryFn: () => load({ data: { podId: id } }),
  });

  async function post() {
    setBusy(true);
    const res = await send({ data: { podId: id, body } });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setBody("");
    refetch();
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading briefcase…</p>;
  if (!data || "error" in data)
    return (
      <p className="text-sm text-muted-foreground">
        {data && "error" in data ? data.error : "Unavailable."}
      </p>
    );

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        <BriefcaseIcon className="h-4 w-4" /> Master Briefcase
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground">{data.address}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.city}, {data.state} {data.zip}
      </p>

      <div className="mt-4">
        <ClosingHoldBanner hold={data.closingHold} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Pod members</h2>
        <ul className="mt-3 space-y-2">
          {data.buyers.map((b) => (
            <li
              key={b.buyerAccountId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <span className="font-medium text-foreground">{b.displayLabel}</span>
              <span className="text-xs text-muted-foreground">
                {b.sharesReserved} share{b.sharesReserved === 1 ? "" : "s"}
                {b.tetheredAgentName ? ` · ${b.tetheredAgentName}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Message &amp; document routing
        </h2>
        <p className="text-xs text-muted-foreground">
          Internal Manager ↔ Heavy Lifting Agent thread. Buyers never see it.
        </p>
        <div className="mt-3 space-y-2">
          {data.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            data.messages.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">
                  {m.authorLabel} · {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {m.body}
                </p>
              </div>
            ))
          )}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Reply to the Heavy Lifting Agent…"
          className="mt-3 w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        <button
          type="button"
          disabled={busy || !body.trim()}
          onClick={post}
          className="mt-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {busy ? "Sending…" : "Post to thread"}
        </button>
      </section>
    </div>
  );
}
