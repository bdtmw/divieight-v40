import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntityGenesisView } from "@/lib/entity-genesis";

/** Admin-only read of Stage 1 entity records and their live cap tables. */
export const listEntityGenesis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EntityGenesisView[]> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await (supabase as any).rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const db = supabaseAdmin as any;

    const { data: entities } = await db
      .from("entity_genesis")
      .select(
        "id, property_id, stage, llc_name, ein, draft_operating_agreement_url, cap_table_generated_at, created_at, properties ( address, city, state, zip )",
      )
      .order("created_at", { ascending: false });

    const list = (entities ?? []) as any[];
    if (list.length === 0) return [];

    const { data: capRows } = await db
      .from("cap_table_entries")
      .select(
        "property_id, share_number, holder_type, buyer_account_id, seller_id, account_member_names, acquisition_date, retention_lock_expires_at",
      )
      .in(
        "property_id",
        list.map((e) => e.property_id),
      )
      .order("share_number", { ascending: true });

    return list.map((e) => ({
      id: e.id,
      propertyId: e.property_id,
      stage: e.stage,
      llcName: e.llc_name,
      ein: e.ein ?? null,
      draftOperatingAgreementUrl: e.draft_operating_agreement_url ?? null,
      capTableGeneratedAt: e.cap_table_generated_at ?? null,
      createdAt: e.created_at,
      address: e.properties?.address ?? "Property",
      city: e.properties?.city ?? "",
      state: e.properties?.state ?? "",
      zip: e.properties?.zip ?? "",
      capTable: ((capRows ?? []) as any[])
        .filter((r) => r.property_id === e.property_id)
        .map((r) => ({
          shareNumber: r.share_number,
          holderType: r.holder_type,
          buyerAccountId: r.buyer_account_id,
          sellerId: r.seller_id,
          memberNames: (r.account_member_names ?? []) as string[],
          acquisitionDate: r.acquisition_date,
          retentionLockExpiresAt: r.retention_lock_expires_at,
        })),
    }));
  });
