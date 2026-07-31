import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBuyerAccount } from "@/lib/buyer";
import { logAudit } from "@/lib/audit";
import { signPropertyPhotos } from "@/lib/media.functions";


export const Route = createFileRoute("/buyer/wishlist")({
  head: () => ({
    meta: [
      { title: "Saved properties — divieight" },
      {
        name: "description",
        content: "Review the 1/8th share homes you've saved to your divieight buyer wishlist.",
      },
      { property: "og:title", content: "Saved properties — divieight" },
      {
        property: "og:description",
        content: "Review the 1/8th share homes you've saved to your divieight buyer wishlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyerWishlistPage,
});

interface SavedRow {
  id: string;
  created_at: string;
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listing_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  image: string | null;
}

function BuyerWishlistPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        navigate({ to: "/buyer/login" });
        return;
      }
      const account = await getBuyerAccount(auth.user.id);
      if (cancelled) return;
      if (!account) {
        navigate({ to: "/buyer/register" });
        return;
      }
      setAuthUserId(auth.user.id);

      const { data } = await supabase
        .from("wishlist")
        .select(
          "id, created_at, property_id, properties(address, city, state, zip, listing_price, bedrooms, bathrooms)",
        )
        .eq("buyer_account_id", account.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;

      const list = (data ?? []).filter((r) => r.properties) as unknown as Array<{
        id: string;
        created_at: string;
        property_id: string;
        properties: {
          address: string;
          city: string;
          state: string;
          zip: string;
          listing_price: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
        };
      }>;

      let mediaByProperty: Record<string, string> = {};
      if (list.length > 0) {
        const { data: media } = await supabase
          .from("property_media")
          .select("property_id, url, display_order")
          .in(
            "property_id",
            list.map((r) => r.property_id),
          )
          .eq("media_type", "photo")
          .order("display_order", { ascending: true });
        const pathByProperty: Record<string, string> = {};
        for (const m of media ?? []) {
          if (m.url && !pathByProperty[m.property_id]) pathByProperty[m.property_id] = m.url;
        }
        const paths = Object.values(pathByProperty);
        if (paths.length > 0) {
          const signed = await signPropertyPhotos({ data: { paths } });
          if (cancelled) return;
          mediaByProperty = Object.fromEntries(
            Object.entries(pathByProperty)
              .map(([pid, path]) => [pid, signed[path]] as const)
              .filter(([, url]) => Boolean(url)),
          ) as Record<string, string>;
        }
      }


      setRows(
        list.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          property_id: r.property_id,
          address: r.properties.address,
          city: r.properties.city,
          state: r.properties.state,
          zip: r.properties.zip,
          listing_price: r.properties.listing_price,
          bedrooms: r.properties.bedrooms,
          bathrooms: r.properties.bathrooms,
          image: mediaByProperty[r.property_id] ?? null,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function remove(row: SavedRow) {
    const { error } = await supabase.from("wishlist").delete().eq("id", row.id);
    if (error) {
      toast.error("Couldn't remove this property. Please try again.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Removed from your saved properties.");
    if (authUserId) {
      void logAudit({
        actorId: authUserId,
        actorType: "buyer",
        actionType: "buyer.wishlist_removed",
        entityType: "wishlist",
        entityId: row.property_id,
      });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading your saved properties…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Buyer Account
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Saved properties
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} home{rows.length === 1 ? "" : "s"} on your wishlist.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            You haven&apos;t saved any homes yet. Tap the heart on any listing to keep it here.
          </p>
          <Link
            to="/properties"
            className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <Link to="/properties/$id" params={{ id: r.property_id }}>
                {r.image ? (
                  <img
                    src={r.image}
                    alt={`${r.address}, ${r.city}`}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    No photo yet
                  </div>
                )}
              </Link>
              <div className="p-4">
                <Link
                  to="/properties/$id"
                  params={{ id: r.property_id }}
                  className="font-display text-base font-semibold text-foreground hover:underline"
                >
                  {r.address}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.city}, {r.state} {r.zip}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    {r.listing_price != null ? (
                      <p className="text-sm font-semibold text-foreground">
                        ${Math.round(r.listing_price / 8).toLocaleString()}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          per 1/8th share
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Price coming soon</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {r.bedrooms ?? "—"} bd · {r.bathrooms ?? "—"} ba
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    aria-label="Remove from saved properties"
                    className="rounded-md border border-destructive/40 p-2 text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
