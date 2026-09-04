import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EightSlicesTracker } from "@/components/EightSlicesTracker";
import { ListingContentApprovalQueue } from "@/components/ListingContentApprovalQueue";
import { listMyListingProperties } from "@/lib/listing-approval.functions";
import {
  APPROVAL_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  type ListingAgentProperty,
} from "@/lib/listing-approval";

export const Route = createFileRoute("/agent/listings/")({
  head: () => ({
    meta: [
      { title: "Listing Agent Dashboard — divieight" },
      {
        name: "description",
        content:
          "Review seller listing content, track share fill, and monitor pod and closing status for your tagged listings.",
      },
      { property: "og:title", content: "Listing Agent Dashboard — divieight" },
      {
        property: "og:description",
        content: "Approve listing content and monitor your tagged divieight listings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListingAgentDashboard,
});

function ListingAgentDashboard() {
  const [rows, setRows] = useState<ListingAgentProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyListingProperties()
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load listings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">My listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listings where you are the tagged Listing Agent. Public content must clear your
          approval and a compliance review before the listing goes live.
        </p>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No sellers have tagged you yet.</p>
      )}

      {rows.map((p) => (
        <section key={p.id} className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words font-display text-lg font-semibold text-foreground">
                {p.address}
              </h2>
              <p className="text-sm text-muted-foreground">
                {p.city}, {p.state} {p.zip} · Seller: {p.seller_name ?? "—"}
              </p>
            </div>
            <Link
              to="/properties/$id"
              params={{ id: p.id }}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Marketplace preview
            </Link>
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Exit type</dt>
              <dd className="text-sm text-foreground">{p.exit_type ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Retention election
              </dt>
              <dd className="text-sm text-foreground">
                {p.retained_shares ? `${p.retained_shares}/8 retained` : "Full exit"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pod status</dt>
              <dd className="text-sm text-foreground">
                {p.pod_status ?? p.listing_status}
                {p.hla_status ? ` · HLA ${p.hla_status}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Closing stage
              </dt>
              <dd className="text-sm text-foreground">
                {p.closing_hold_active ? "Closing hold active" : p.listing_status}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <EightSlicesTracker propertyId={p.id} compact />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Gate 1:{" "}
              <span className="font-medium text-foreground">
                {APPROVAL_STATUS_LABELS[p.content_approval_status] ?? p.content_approval_status}
              </span>
            </span>
            <span className="text-muted-foreground">
              Gate 2:{" "}
              <span className="font-medium text-foreground">
                {COMPLIANCE_STATUS_LABELS[p.compliance_status] ?? p.compliance_status}
              </span>
            </span>
            <Link
              to="/listings/$id"
              params={{ id: p.id }}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Listing agreement &amp; documents
            </Link>
          </div>

          {p.pending_items > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">
                Content awaiting your approval ({p.pending_items})
              </h3>
              <div className="mt-3">
                <ListingContentApprovalQueue propertyId={p.id} />
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
