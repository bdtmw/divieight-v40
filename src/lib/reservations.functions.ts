import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export interface PodComposition {
  propertyId: string;
  totalShares: number;
  retainedShares: number;
  reservedShares: number;
  availableShares: number;
  hardLocked: boolean;
  listingStatus: string;
  /** Ordered slot map, 8 entries: seller-retained first, then reserved, then available. */
  slots: ("retained" | "reserved" | "available")[];
}

function publicClient() {
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

function buildSlots(retained: number, reserved: number): PodComposition["slots"] {
  const r = Math.max(0, Math.min(8, retained));
  const v = Math.max(0, Math.min(8 - r, reserved));
  return [
    ...Array<"retained">(r).fill("retained"),
    ...Array<"reserved">(v).fill("reserved"),
    ...Array<"available">(8 - r - v).fill("available"),
  ];
}

/** Public read: how many of the eight shares are taken. No buyer PII is exposed. */
export const getPodComposition = createServerFn({ method: "GET" })
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data }): Promise<PodComposition | null> => {
    const supabase = publicClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id, exit_type, retained_shares, listing_status, hard_locked")
      .eq("id", data.propertyId)
      .eq("status", "listed")
      .maybeSingle();

    if (!property) return null;

    const { data: rows } = await supabase
      .from("pod_reservations")
      .select("shares_reserved")
      .eq("property_id", data.propertyId)
      .eq("status", "reserved");

    const retained =
      property.exit_type === "hybrid_exit" ? (property.retained_shares ?? 0) : 0;
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
  });

export interface ReservationEligibility {
  ok: boolean;
  reason:
    | "ok"
    | "no_buyer_account"
    | "not_liquidity_verified"
    | "not_found"
    | "sold_out"
    | "already_reserved";
  liquidityStatus: string | null;
  targetBudget: number | null;
  existingShares: number;
  composition: PodComposition | null;
}

/** Mini Liquidity Gate + availability check for a specific property. */
export const checkReservationEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data, context }): Promise<ReservationEligibility> => {
    const { supabase, userId } = context;
    const base = {
      liquidityStatus: null as string | null,
      targetBudget: null as number | null,
      existingShares: 0,
      composition: null as PodComposition | null,
    };

    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id, liquidity_verified, liquidity_status, target_budget")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!buyer) return { ok: false, reason: "no_buyer_account", ...base };

    const composition = await getPodComposition({ data: { propertyId: data.propertyId } });
    const info = {
      liquidityStatus: buyer.liquidity_status ?? null,
      targetBudget: buyer.target_budget ?? null,
      existingShares: 0,
      composition,
    };

    if (!composition) return { ok: false, reason: "not_found", ...info };

    const { data: mine } = await supabase
      .from("pod_reservations")
      .select("shares_reserved")
      .eq("property_id", data.propertyId)
      .eq("buyer_account_id", buyer.id)
      .eq("status", "reserved");

    info.existingShares = (mine ?? []).reduce((s, r) => s + (r.shares_reserved ?? 0), 0);

    if (!buyer.liquidity_verified)
      return { ok: false, reason: "not_liquidity_verified", ...info };
    if (info.existingShares > 0) return { ok: false, reason: "already_reserved", ...info };
    if (composition.availableShares < 1) return { ok: false, reason: "sold_out", ...info };

    return { ok: true, reason: "ok", ...info };
  });

export interface ReservationResult {
  ok: boolean;
  reason: ReservationEligibility["reason"] | "error";
  reservationId: string | null;
  composition: PodComposition | null;
  systemLocked: boolean;
}

/**
 * Creates the reservation, applies the Hard-Lock on first reservation
 * (freezing price-per-share / commission fields) and flips the listing to
 * `system_lock` when all eight shares are accounted for.
 */
export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data, context }): Promise<ReservationResult> => {
    const { supabase, userId } = context;
    const fail = (reason: ReservationResult["reason"]): ReservationResult => ({
      ok: false,
      reason,
      reservationId: null,
      composition: null,
      systemLocked: false,
    });

    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id, liquidity_verified")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return fail("no_buyer_account");
    if (!buyer.liquidity_verified) return fail("not_liquidity_verified");

    const before = await getPodComposition({ data: { propertyId: data.propertyId } });
    if (!before) return fail("not_found");
    if (before.availableShares < 1) return fail("sold_out");

    const { data: mine } = await supabase
      .from("pod_reservations")
      .select("id")
      .eq("property_id", data.propertyId)
      .eq("buyer_account_id", buyer.id)
      .eq("status", "reserved")
      .limit(1);
    if ((mine?.length ?? 0) > 0) return fail("already_reserved");

    const { data: inserted, error } = await supabase
      .from("pod_reservations")
      .insert({
        property_id: data.propertyId,
        buyer_account_id: buyer.id,
        shares_reserved: 1,
        status: "reserved",
      })
      .select("id")
      .maybeSingle();

    if (error || !inserted) return fail("error");

    const after = await getPodComposition({ data: { propertyId: data.propertyId } });
    const systemLocked = (after?.availableShares ?? 1) === 0;

    // Hard-Lock + System Lock need to bypass seller-scoped RLS on properties.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const patch: Record<string, unknown> = {};
      if (!before.hardLocked) {
        patch.hard_locked = true;
        patch.hard_locked_at = new Date().toISOString();
      }
      if (systemLocked && before.listingStatus !== "system_lock") {
        patch.listing_status = "system_lock";
      }
      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from("properties").update(patch).eq("id", data.propertyId);
      }
    } catch {
      // reservation stands even if the lock write fails; maintenance can retry
    }

    await supabase.from("audit_log").insert({
      actor_id: userId,
      actor_type: "buyer",
      action_type: "buyer.share_reserved",
      entity_type: "property",
      entity_id: data.propertyId,
      metadata: {
        reservation_id: inserted.id,
        shares_reserved: 1,
        hard_lock_applied: !before.hardLocked,
        system_lock: systemLocked,
      } as never,
    });

    return {
      ok: true,
      reason: "ok",
      reservationId: inserted.id,
      composition: after,
      systemLocked,
    };
  });

export interface MyReservation {
  id: string;
  property_id: string;
  shares_reserved: number;
  status: string;
  reserved_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listing_price: number | null;
  listing_status: string;
}

/** "My Reservations" for the buyer dashboard. */
export const getMyReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyReservation[]> => {
    const { supabase, userId } = context;

    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return [];

    const { data: rows } = await supabase
      .from("pod_reservations")
      .select(
        "id, property_id, shares_reserved, status, reserved_at, properties ( address, city, state, zip, listing_price, listing_status )",
      )
      .eq("buyer_account_id", buyer.id)
      .order("reserved_at", { ascending: false });

    return (rows ?? []).map((r) => {
      const p = (r as unknown as { properties: Record<string, unknown> | null }).properties;
      return {
        id: r.id,
        property_id: r.property_id,
        shares_reserved: r.shares_reserved,
        status: r.status,
        reserved_at: r.reserved_at,
        address: (p?.address as string) ?? "Property",
        city: (p?.city as string) ?? "",
        state: (p?.state as string) ?? "",
        zip: (p?.zip as string) ?? "",
        listing_price: (p?.listing_price as number | null) ?? null,
        listing_status: (p?.listing_status as string) ?? "forming",
      };
    });
  });
