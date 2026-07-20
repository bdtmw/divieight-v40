import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { EightSlicesTracker } from "@/components/EightSlicesTracker";
import {
  ListingStatusTimeline,
  type ListingStatus,
} from "@/components/ListingStatusTimeline";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "Listing detail — divieight" },
      { name: "description", content: "Manage a fractional property listing." },
    ],
  }),
  component: ListingDetail,
});

type Property = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  listing_status: ListingStatus;
  listing_price: number | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  description: string | null;
};

function ListingDetail() {
  const { id } = Route.useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select(
          "id, address, city, state, zip, status, listing_status, listing_price, property_type, bedrooms, bathrooms, square_footage, description",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setNotFound(true);
      setProperty((data as Property) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Listing not found
        </h1>
        <Link
          to="/dashboard"
          className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const perShare = property.listing_price ? property.listing_price / 8 : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/dashboard"
        className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        ← Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Listing
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            {property.address}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {property.city}, {property.state} {property.zip}
            {property.property_type ? ` · ${property.property_type}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium capitalize text-foreground">
          {property.status.replace(/_/g, " ")}
        </span>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Property Status
        </h2>
        <div className="mt-4">
          <ListingStatusTimeline status={property.listing_status ?? "forming"} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Share Availability
        </h2>
        <div className="mt-4">
          <EightSlicesTracker propertyId={property.id} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Listing price" value={fmt(property.listing_price)} />
        <Stat label="Per 1/8th share" value={fmt(perShare)} />
        <Stat
          label="Beds · Baths · Sqft"
          value={`${property.bedrooms ?? "—"} · ${property.bathrooms ?? "—"} · ${
            property.square_footage?.toLocaleString() ?? "—"
          }`}
        />
      </section>

      {property.description ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {property.description}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}
