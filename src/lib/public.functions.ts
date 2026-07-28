import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface FeaturedProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  listing_price: number | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  retained_shares: number | null;
  exit_type: string | null;
  photo: string | null;
}

/**
 * Public marketing read: the most recent listed properties.
 * Uses the publishable key (anon RLS: only `status = 'listed'` rows are visible).
 * Photo signing needs the service role because the media bucket is private.
 */
export const getFeaturedProperties = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedProperty[]> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

    const supabasePublic = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data, error } = await supabasePublic
      .from("properties")
      .select(
        "id, address, city, state, listing_price, property_type, bedrooms, bathrooms, square_footage, retained_shares, exit_type",
      )
      .eq("status", "listed")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error || !data) return [];

    const rows: FeaturedProperty[] = data.map((p) => ({ ...p, photo: null }) as FeaturedProperty);
    if (rows.length === 0) return rows;

    const { data: media } = await supabasePublic
      .from("property_media")
      .select("property_id, url, display_order")
      .in(
        "property_id",
        rows.map((r) => r.id),
      )
      .eq("media_type", "photo")
      .order("display_order", { ascending: true });

    const firstByProp = new Map<string, string>();
    (media ?? []).forEach((m) => {
      if (m.url && !firstByProp.has(m.property_id)) firstByProp.set(m.property_id, m.url);
    });

    const paths = Array.from(firstByProp.values());
    if (paths.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed } = await supabaseAdmin.storage
          .from("property-media")
          .createSignedUrls(paths, 60 * 60);
        const byPath = new Map<string, string>();
        (signed ?? []).forEach((s) => {
          if (s.path && s.signedUrl) byPath.set(s.path, s.signedUrl);
        });
        rows.forEach((r) => {
          const path = firstByProp.get(r.id);
          r.photo = path ? (byPath.get(path) ?? null) : null;
        });
      } catch {
        // photos are optional on the marketing page
      }
    }

    return rows;
  },
);
