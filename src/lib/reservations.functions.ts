import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BuyerPodDetails,
  MyReservation,
  PodComposition,
  ReservationEligibility,
  ReservationResult,
} from "@/lib/pod";

/** Public read: how many of the eight shares are taken. No buyer PII is exposed. */
export const getPodComposition = createServerFn({ method: "GET" })
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data }): Promise<PodComposition | null> => {
    const { fetchPodComposition } = await import("@/lib/pod.server");
    return fetchPodComposition(data.propertyId);
  });

/** Mini Liquidity Gate + availability check for a specific property. */
export const checkReservationEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data, context }): Promise<ReservationEligibility> => {
    const { fetchPodComposition } = await import("@/lib/pod.server");
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

    const composition = await fetchPodComposition(data.propertyId);
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

    if (!buyer.liquidity_verified) return { ok: false, reason: "not_liquidity_verified", ...info };
    if (info.existingShares > 0) return { ok: false, reason: "already_reserved", ...info };
    if (composition.availableShares < 1) return { ok: false, reason: "sold_out", ...info };

    return { ok: true, reason: "ok", ...info };
  });

/**
 * Creates the reservation, applies the Hard-Lock on first reservation
 * (freezing price-per-share / commission fields) and flips the listing to
 * `system_lock` when all eight shares are accounted for.
 */
export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data, context }): Promise<ReservationResult> => {
    const { fetchPodComposition } = await import("@/lib/pod.server");
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

    const before = await fetchPodComposition(data.propertyId);
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

    const after = await fetchPodComposition(data.propertyId);
    const systemLocked = (after?.availableShares ?? 1) === 0;

    // Hard-Lock + System Lock need to bypass seller-scoped RLS on properties.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");

      const applyHardLock = !before.hardLocked;
      const applySystemLock = systemLocked && before.listingStatus !== "system_lock";
      if (applyHardLock || applySystemLock) {
        await supabaseAdmin
          .from("properties")
          .update({
            ...(applyHardLock
              ? { hard_locked: true, hard_locked_at: new Date().toISOString() }
              : {}),
            ...(applySystemLock ? { listing_status: "system_lock" as const } : {}),
          })
          .eq("id", data.propertyId);
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

/**
 * Withdraw a reservation before closing. Frees the slice on the Eight-Slices
 * Tracker, releases System Lock if the pod was full, and opens the Member
 * Substitution Pipeline (candidate identification is logged for the ops team).
 */
export const withdrawReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reservationId: string }) => ({
    reservationId: String(data.reservationId),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason: string }> => {
    const { supabase, userId } = context;

    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return { ok: false, reason: "no_buyer_account" };

    const { data: reservation } = await supabase
      .from("pod_reservations")
      .select("id, property_id, status, shares_reserved")
      .eq("id", data.reservationId)
      .eq("buyer_account_id", buyer.id)
      .maybeSingle();
    if (!reservation) return { ok: false, reason: "not_found" };
    if (reservation.status !== "reserved") return { ok: false, reason: "not_active" };

    // Once the pod reaches System Lock the slice can no longer be self-released;
    // exits run through the Member Substitution Pipeline instead.
    {
      const { fetchPodComposition } = await import("@/lib/pod.server");
      const comp = await fetchPodComposition(reservation.property_id);
      if (comp && comp.listingStatus !== "forming") {
        return { ok: false, reason: "pod_locked" };
      }
    }

    const { error } = await supabase
      .from("pod_reservations")
      .update({ status: "withdrawn" })
      .eq("id", reservation.id)
      .eq("buyer_account_id", buyer.id);
    if (error) return { ok: false, reason: "error" };

    // Releasing System Lock needs to bypass seller-scoped RLS on properties.
    let candidateCount = 0;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
      const { data: property } = await supabaseAdmin
        .from("properties")
        .select(
          "id, address, city, state, zip, usage_tag, listing_price, listing_status, exit_type, retained_shares",
        )
        .eq("id", reservation.property_id)
        .maybeSingle();

      if (property?.listing_status === "system_lock") {
        await supabaseAdmin
          .from("properties")
          .update({ listing_status: "forming" as const })
          .eq("id", property.id);
      }

      if (property) {
        const { findCandidates } = await import("@/lib/substitution.server");
        const { data: active } = await supabaseAdmin
          .from("pod_reservations")
          .select("buyer_account_id")
          .eq("property_id", property.id)
          .eq("status", "reserved");
        const candidates = await findCandidates(
          supabaseAdmin,
          property,
          [buyer.id, ...(active ?? []).map((a) => a.buyer_account_id)],
          5,
        );
        candidateCount = candidates.length;

        // TODO: automated invitation dispatch to the top-ranked candidate
        // once buyer notification infrastructure lands. For now the ops team
        // works the ranked list from /admin/substitutions.
        await supabase.from("audit_log").insert({
          actor_id: userId,
          actor_type: "buyer",
          action_type: "substitution.pipeline_opened",
          entity_type: "property",
          entity_id: property.id,
          metadata: {
            reservation_id: reservation.id,
            candidates_identified: candidateCount,
            top_candidates: candidates.map((c) => ({
              buyer_account_id: c.buyerAccountId,
              priority_rank: c.priorityRank,
              priority_rank_timestamp: c.priorityRankTimestamp,
              matched_on: c.matchedOn,
            })),
          } as never,
        });
      }
    } catch {
      // withdrawal stands even if lock release / candidate scan fails
    }

    await supabase.from("audit_log").insert({
      actor_id: userId,
      actor_type: "buyer",
      action_type: "buyer.reservation_withdrawn",
      entity_type: "property",
      entity_id: reservation.property_id,
      metadata: {
        reservation_id: reservation.id,
        shares_released: reservation.shares_reserved,
        candidates_identified: candidateCount,
      } as never,
    });

    return { ok: true, reason: "ok" };
  });

/**
 * Buyer-facing pod detail. Only a buyer holding a reservation in this pod can
 * read it, and other members are de-identified. The Heavy Lifting Agent's
 * Master Briefcase thread is intentionally NOT exposed here (see
 * agent.pods.$id.briefcase.tsx).
 */
export const getMyPodDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { propertyId: string }) => ({ propertyId: String(data.propertyId) }))
  .handler(async ({ data, context }): Promise<BuyerPodDetails | { error: string }> => {
    const { fetchPodComposition } = await import("@/lib/pod.server");
    const { supabase, userId } = context;

    const { data: buyer } = await (supabase as any)
      .from("buyer_accounts")
      .select("id, priority_rank, priority_rank_timestamp, tethered_resident_agent_id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return { error: "Buyer account not found." };

    const { data: mine } = await supabase
      .from("pod_reservations")
      .select("id, shares_reserved, status, reserved_at")
      .eq("property_id", data.propertyId)
      .eq("buyer_account_id", buyer.id)
      .order("reserved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!mine) return { error: "You don't hold a reservation in this pod." };

    const composition = await fetchPodComposition(data.propertyId);
    const { supabaseAdmin: rawAdmin } = await import("@/integrations/supabase/admin.server");
    // Pod/agent tables post-date the generated types; use a loose client here.
    const supabaseAdmin = rawAdmin as unknown as {
      from: (t: string) => any;
      storage: (typeof rawAdmin)["storage"];
    };

    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("id, address, city, state, zip, listing_price, property_type, exit_type, retained_shares, listing_status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (!property) return { error: "Property not found." };

    let photoUrl: string | null = null;
    const { data: media } = await supabaseAdmin
      .from("property_media")
      .select("url")
      .eq("property_id", data.propertyId)
      .eq("media_type", "photo")
      .order("display_order", { ascending: true })
      .limit(1);
    const path = media?.[0]?.url ?? null;
    if (path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("property-media")
        .createSignedUrl(path, 60 * 60);
      photoUrl = signed?.signedUrl ?? null;
    }

    const { data: reservations } = await supabaseAdmin
      .from("pod_reservations")
      .select("buyer_account_id, shares_reserved, reserved_at")
      .eq("property_id", data.propertyId)
      .eq("status", "reserved")
      .order("reserved_at", { ascending: true });

    const members = (reservations ?? []).map((r: any, i: number) => ({
      label: r.buyer_account_id === buyer.id ? "You" : `Member ${i + 1}`,
      shares: r.shares_reserved ?? 1,
      reservedAt: r.reserved_at ?? null,
      isMine: r.buyer_account_id === buyer.id,
    }));

    const { data: pod } = await supabaseAdmin
      .from("pods")
      .select("*")
      .eq("property_id", data.propertyId)
      .maybeSingle();

    const agentIds = [buyer.tethered_resident_agent_id, pod?.heavy_lifting_agent_id].filter(
      Boolean,
    ) as string[];
    const names = new Map<string, string>();
    if (agentIds.length) {
      const { data: rows } = await supabaseAdmin
        .from("agents")
        .select("id, full_name")
        .in("id", agentIds);
      for (const a of rows ?? []) names.set(a.id, a.full_name);
    }

    const retained =
      property.exit_type === "hybrid_exit" ? (property.retained_shares ?? 0) : 0;

    return {
      propertyId: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip ?? "",
      listingPrice: property.listing_price ?? null,
      propertyType: property.property_type ?? null,
      photoUrl,
      composition:
        composition ?? {
          propertyId: property.id,
          totalShares: 8,
          retainedShares: retained,
          reservedShares: members.reduce((s: number, m: { shares: number }) => s + m.shares, 0),
          availableShares: Math.max(
            0,
            8 - retained - members.reduce((s: number, m: { shares: number }) => s + m.shares, 0),
          ),
          hardLocked: false,
          listingStatus: property.listing_status,
          slots: [],
        },
      myShares: mine.shares_reserved ?? 0,
      myStatus: mine.status,
      myReservedAt: mine.reserved_at ?? null,
      priorityRank: buyer.priority_rank ?? null,
      priorityRankTimestamp: buyer.priority_rank_timestamp ?? null,
      members,
      tetheredAgentName: buyer.tethered_resident_agent_id
        ? (names.get(buyer.tethered_resident_agent_id) ?? null)
        : null,
      heavyLiftingAgentName:
        pod?.hla_status === "accepted" && pod.heavy_lifting_agent_id
          ? (names.get(pod.heavy_lifting_agent_id) ?? null)
          : null,
      hlaStatus: pod?.hla_status ?? null,
    };
  });
