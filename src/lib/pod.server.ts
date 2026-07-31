import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PodComposition } from "@/lib/pod";

/** Publishable-key client for public (anon-RLS) reads inside server handlers. */
export function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
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
}

export function buildSlots(retained: number, reserved: number): PodComposition["slots"] {
  const r = Math.max(0, Math.min(8, retained));
  const v = Math.max(0, Math.min(8 - r, reserved));
  return [
    ...Array<"retained">(r).fill("retained"),
    ...Array<"reserved">(v).fill("reserved"),
    ...Array<"available">(8 - r - v).fill("available"),
  ];
}

/** Shared pod math used by both the public read and the reservation writer. */
export async function fetchPodComposition(propertyId: string): Promise<PodComposition | null> {
  const supabase = publicClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, exit_type, retained_shares, listing_status, hard_locked")
    .eq("id", propertyId)
    .eq("status", "listed")
    .maybeSingle();

  if (!property) return null;

  const { data: rows } = await supabase
    .from("pod_reservations")
    .select("shares_reserved")
    .eq("property_id", propertyId)
    .eq("status", "reserved");

  const retained = property.exit_type === "hybrid_exit" ? (property.retained_shares ?? 0) : 0;
  const reserved = (rows ?? []).reduce((sum, r) => sum + (r.shares_reserved ?? 0), 0);
  const slots = buildSlots(retained, reserved);

  return {
    propertyId: property.id,
    totalShares: 8,
    retainedShares: Math.max(0, Math.min(8, retained)),
    reservedShares: slots.filter((s) => s === "reserved").length,
    availableShares: slots.filter((s) => s === "available").length,
    hardLocked: !!property.hard_locked,
    listingStatus: property.listing_status,
    slots,
  };
}
