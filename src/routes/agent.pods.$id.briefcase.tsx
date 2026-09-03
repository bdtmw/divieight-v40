import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase as BriefcaseIcon } from "lucide-react";
import { getBriefcase, postBriefcaseMessage } from "@/lib/hla.functions";

/** Master Briefcase — unlocked only after the agent formally accepts. */
export const Route = createFileRoute("/agent/pods/$id/briefcase")({
  head: () => ({
    meta: [
      { title: "Master Briefcase — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Coordinate an eight-share divieight pod: buyers, passive Resident Agents and the routing thread.",
      },
      { property: "og:title", content: "Master Briefcase — divieight" },
      {
        property: "og:description",
        content: "Heavy Lifting Agent coordination view for a divieight buyer pod.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BriefcasePage,
});

function BriefcasePage() {
  const { id } = useParams({ from: "/agent/pods/$id/briefcase" });
  const load = useServerFn(getBriefcase);
  const send = useServerFn(postBriefcaseMessage);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["briefcase", id],
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

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Loading briefcase…</p>;
  if (!data || "error" in data)
    return (
      <p className="p-8 text-sm text-muted-foreground">
        {data && "error" in data ? data.error : "Unavailable."}
      </p>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        <BriefcaseIcon className="h-4 w-4" /> Master Briefcase
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        {data.address}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {data.city}, {data.state} {data.zip}
      </p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">Pod members</h2>
        <p className="text-xs text-muted-foreground">
          Buyers tethered to other Resident Agents are shown de-identified.
        </p>
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
          Passive Resident Agents
        </h2>
        <p className="text-xs text-muted-foreground">
          Passive for this pod only — their global agent role is unchanged.
        </p>
        {data.passiveAgents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.passiveAgents.map((a) => (
              <li
                key={a.agentId}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground"
              >
                {a.fullName}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Message &amp; document routing
        </h2>
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
          placeholder="Route an update or a document reference to the pod…"
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
