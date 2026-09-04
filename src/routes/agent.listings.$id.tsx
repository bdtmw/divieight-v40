import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getListingAgentPropertyDetail } from "@/lib/listing-approval.functions";
import {
  APPROVAL_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
} from "@/lib/listing-approval";

export const Route = createFileRoute("/agent/listings/$id")({
  head: () => ({
    meta: [
      { title: "Listing preview & documents — divieight" },
      {
        name: "description",
        content:
          "Preview how a tagged listing will appear on the marketplace and review its agreement documents.",
      },
      { property: "og:title", content: "Listing preview & documents — divieight" },
      {
        property: "og:description",
        content: "Marketplace preview and document review for your tagged divieight listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentListingDetail,
});

type Detail = Awaited<ReturnType<typeof getListingAgentPropertyDetail>>;

function AgentListingDetail() {
  const { id } = Route.useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getListingAgentPropertyDetail({ data: { propertyId: id } })
      .then((d) => !cancelled && setDetail(d))
      .catch(
        (e) =>
          !cancelled &&
          setError(e instanceof Error ? e.message : "Could not load this listing."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading listing…</p>;

  if (error || !detail) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Listing unavailable
        </h1>
        <p className="text-sm text-muted-foreground">{error ?? "Listing not found."}</p>
        <Link to="/agent/listings" className="text-sm text-accent underline-offset-4 hover:underline">
          ← Back to my listings
        </Link>
      </div>
    );
  }

  const p = detail.property;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/agent/listings" className="text-sm text-accent underline-offset-4 hover:underline">
          ← Back to my listings
        </Link>
        <h1 className="mt-2 break-words font-display text-2xl font-semibold text-foreground">
          {p.address}
        </h1>
        <p className="text-sm text-muted-foreground">
          {p.city}, {p.state} {p.zip} · Seller: {detail.seller?.full_name ?? "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Gate 1: {APPROVAL_STATUS_LABELS[p.content_approval_status] ?? p.content_approval_status} ·
          Gate 2: {COMPLIANCE_STATUS_LABELS[p.compliance_status] ?? p.compliance_status}
        </p>
      </div>

      <section id="preview" className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Marketplace preview
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how buyers will see the listing once both gates clear.
        </p>

        {detail.photos.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.photos.map((photo, i) => (
              <img
                key={`${photo.url}-${i}`}
                src={photo.url}
                alt={photo.caption ?? `${p.address} photo ${i + 1}`}
                loading="lazy"
                className="h-40 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="List price" value={p.listing_price ? `$${p.listing_price.toLocaleString()}` : "—"} />
          <Fact label="Property type" value={p.property_type ?? "—"} />
          <Fact label="Bedrooms" value={p.bedrooms != null ? String(p.bedrooms) : "—"} />
          <Fact label="Bathrooms" value={p.bathrooms != null ? String(p.bathrooms) : "—"} />
          <Fact
            label="Square footage"
            value={p.square_footage != null ? p.square_footage.toLocaleString() : "—"}
          />
          <Fact label="Exit type" value={detail.seller?.exit_type ?? "—"} />
          <Fact
            label="Retention election"
            value={
              detail.seller?.retained_shares
                ? `${detail.seller.retained_shares}/8 retained`
                : "Full exit"
            }
          />
          <Fact label="Publication status" value={p.status} />
        </dl>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {p.description?.trim() || "No description submitted yet."}
          </p>
        </div>
      </section>

      <section id="documents" className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Listing agreement &amp; documents
        </h2>
        {detail.documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            The seller has not uploaded any documents for this property yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {detail.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.type ?? "document"}
                    {doc.uploadedAt
                      ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}
