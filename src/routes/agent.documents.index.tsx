import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature } from "lucide-react";
import {
  listAgentReferralDocuments,
  type ReferralDocument,
} from "@/lib/nar-referral.functions";

export const Route = createFileRoute("/agent/documents/")({
  head: () => ({
    meta: [
      { title: "Referral agreements — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Review and electronically sign your Standard NAR Referral Agreements on divieight.",
      },
      { property: "og:title", content: "Referral agreements — divieight" },
      {
        property: "og:description",
        content: "Standard NAR Referral Agreements awaiting your signature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentDocumentsPage,
});

function AgentDocumentsPage() {
  const load = useServerFn(listAgentReferralDocuments);
  const [docs, setDocs] = useState<ReferralDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    load({}).then((rows) => {
      if (cancelled) return;
      setDocs(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Professional Portal
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        Referral agreements
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The Standard NAR Referral Agreement fixes the 25%/75% buyer-side commission split
        paid at closing by title/escrow through each Broker of Record.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            You have no referral agreements yet.
          </p>
        ) : (
          docs.map((d) => {
            const pending = d.parties.filter((p) => !p.signed);
            return (
              <Link
                key={d.id}
                to="/agent/documents/$id"
                params={{ id: d.id }}
                className="flex items-start gap-3 border-b border-border/60 px-5 py-4 last:border-0 hover:bg-secondary/60"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileSignature className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Standard NAR Referral Agreement · {d.version}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {d.status === "executed"
                      ? `Fully executed ${d.executedAt ? new Date(d.executedAt).toLocaleDateString() : ""}`
                      : pending.length
                        ? `Awaiting ${pending.map((p) => p.name).join(" and ")}'s signature`
                        : "Awaiting signatures"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
