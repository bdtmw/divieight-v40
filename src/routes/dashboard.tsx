import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EightSlicesTracker } from "@/components/EightSlicesTracker";
import { ListingStatusTimeline, type ListingStatus } from "@/components/ListingStatusTimeline";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard — divieight" },
      {
        name: "description",
        content: "Manage your listings, shares, and offers from your seller dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

type Listing = {
  id: string;
  address: string;
  city: string;
  state: string;
  status: string;
  listing_status: ListingStatus;
  listing_price: number | null;
  property_type: string | null;
};

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("properties")
      .select("id, address, city, state, status, listing_status, listing_price, property_type")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setListings((data as Listing[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Seller Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            Your listings
          </h1>
        </div>
        <Link
          to="/onboarding"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          New listing
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {authLoading || loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don't have any listings yet.
            </p>
          </div>
        ) : (
          listings.map((l) => (
            <Link
              key={l.id}
              to="/listings/$id"
              params={{ id: l.id }}
              className="block rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-foreground/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {l.address}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {l.city}, {l.state}
                    {l.property_type ? ` · ${l.property_type}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium capitalize text-foreground">
                  {l.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-5">
                <EightSlicesTracker propertyId={l.id} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
