import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_ESCALATION_SETTINGS,
  ESCALATION_SETTINGS_KEY,
  type EscalationSettings,
  type StalledApprovalItem,
} from "@/lib/approval-escalation";

/**
 * Gate 1 escalation — what happens when NOTHING happens.
 *
 * This module never changes a disposition. Approve / approve-with-modification
 * / reject stay entirely in `listing-approval.functions.ts`. Here we only
 * count elapsed time since the item entered the queue and nudge people:
 *   stage 1 — reminder to the Listing Agent
 *   stage 2 — second reminder + notify their Broker of Record (who may already
 *             act in the agent's stead via the existing unavailable-agent path)
 *   stage 3 — flag the item "stalled" for the platform operator
 *
 * The intervals live in `platform_settings` so platform compliance can change
 * them without a deploy.
 */

type Db = { from: (t: string) => any };

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  return supabaseAdmin as unknown as Db;
}

async function audit(
  db: Db,
  row: {
    actorId: string | null;
    actorType: "seller" | "agent" | "buyer" | "broker";
    actionType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.from("audit_log").insert({
    actor_id: row.actorId,
    actor_type: row.actorType,
    action_type: row.actionType,
    entity_type: "property",
    entity_id: row.entityId ?? null,
    metadata: row.metadata ?? {},
  });
}

async function notifyUser(db: Db, authUserId: string, message: string, type: string) {
  if (!authUserId) return;
  await db.from("notifications").insert({ seller_id: authUserId, message, type });
}

export async function readEscalationSettings(db: Db): Promise<EscalationSettings> {
  const { data } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", ESCALATION_SETTINGS_KEY)
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<EscalationSettings>;
  return {
    first_reminder_hours:
      Number(v.first_reminder_hours) || DEFAULT_ESCALATION_SETTINGS.first_reminder_hours,
    second_reminder_hours:
      Number(v.second_reminder_hours) || DEFAULT_ESCALATION_SETTINGS.second_reminder_hours,
    stalled_hours: Number(v.stalled_hours) || DEFAULT_ESCALATION_SETTINGS.stalled_hours,
  };
}

const HOUR = 1000 * 60 * 60;

/** Bounded sweep: one pass over pending queue items, idempotent per stage. */
export async function runApprovalEscalationSweep(db: Db, limit = 200) {
  const settings = await readEscalationSettings(db);
  const now = Date.now();

  const { data: items } = await db
    .from("listing_content_items")
    .select(
      "id, property_id, item_type, label, queued_at, created_at, reminder_first_sent_at, reminder_second_sent_at, stalled_at",
    )
    .eq("disposition", "pending")
    .order("queued_at", { ascending: true })
    .limit(limit);

  const rows = (items ?? []) as any[];
  if (rows.length === 0) {
    return { scanned: 0, firstReminders: 0, secondReminders: 0, stalled: 0 };
  }

  const propertyIds = Array.from(new Set(rows.map((r) => r.property_id)));
  const { data: props } = await db
    .from("properties")
    .select("id, address, seller_id, listing_agent_id")
    .in("id", propertyIds);
  const propById = new Map(((props ?? []) as any[]).map((p) => [p.id, p]));

  const agentIds = Array.from(
    new Set(
      ((props ?? []) as any[]).map((p) => p.listing_agent_id).filter(Boolean) as string[],
    ),
  );
  const { data: agents } = agentIds.length
    ? await db
        .from("agents")
        .select("id, full_name, auth_user_id, broker_id")
        .in("id", agentIds)
    : { data: [] };
  const agentById = new Map(((agents ?? []) as any[]).map((a) => [a.id, a]));

  const brokerIds = Array.from(
    new Set(((agents ?? []) as any[]).map((a) => a.broker_id).filter(Boolean) as string[]),
  );
  const { data: brokers } = brokerIds.length
    ? await db
        .from("brokers")
        .select("id, brokerage_name, auth_user_id")
        .in("id", brokerIds)
    : { data: [] };
  const brokerById = new Map(((brokers ?? []) as any[]).map((b) => [b.id, b]));

  let firstReminders = 0;
  let secondReminders = 0;
  let stalled = 0;

  for (const item of rows) {
    const property = propById.get(item.property_id);
    if (!property || !property.listing_agent_id) continue;
    const agent = agentById.get(property.listing_agent_id);
    const broker = agent?.broker_id ? brokerById.get(agent.broker_id) : null;

    const queuedAt = new Date(item.queued_at ?? item.created_at).getTime();
    const hours = (now - queuedAt) / HOUR;
    const label = item.label ?? item.item_type;
    const base = {
      content_item_id: item.id,
      item_type: item.item_type,
      label,
      queued_at: new Date(queuedAt).toISOString(),
      hours_waiting: Math.floor(hours),
      listing_agent_id: property.listing_agent_id,
    };

    if (hours >= settings.stalled_hours && !item.stalled_at) {
      await db
        .from("listing_content_items")
        .update({ stalled_at: new Date().toISOString() })
        .eq("id", item.id);
      await audit(db, {
        actorId: agent?.auth_user_id ?? null,
        actorType: "agent",
        actionType: "listing.approval_stalled_flagged",
        entityId: property.id,
        metadata: {
          ...base,
          threshold_hours: settings.stalled_hours,
          seller_id: property.seller_id,
          flagged_for: "platform_operator",
        },
      });
      stalled += 1;
    }

    if (hours >= settings.second_reminder_hours && !item.reminder_second_sent_at) {
      const sentAt = new Date().toISOString();
      await db
        .from("listing_content_items")
        .update({ reminder_second_sent_at: sentAt, reminder_first_sent_at: item.reminder_first_sent_at ?? sentAt })
        .eq("id", item.id);
      if (agent?.auth_user_id) {
        await notifyUser(
          db,
          agent.auth_user_id,
          `Second reminder: listing content for ${property.address} has been awaiting your review for ${Math.floor(hours)} hours. Your Broker of Record has been notified and may review in your place.`,
          "listing_approval",
        );
      }
      if (broker?.auth_user_id) {
        await notifyUser(
          db,
          broker.auth_user_id,
          `Listing content for ${property.address} has been awaiting ${agent?.full_name ?? "your agent"}'s review for ${Math.floor(hours)} hours. You may review it in their place.`,
          "listing_approval",
        );
      }
      await audit(db, {
        actorId: agent?.auth_user_id ?? null,
        actorType: "agent",
        actionType: "listing.approval_reminder_escalated",
        entityId: property.id,
        metadata: {
          ...base,
          threshold_hours: settings.second_reminder_hours,
          notified_agent: Boolean(agent?.auth_user_id),
          notified_broker: Boolean(broker?.auth_user_id),
          broker_id: broker?.id ?? null,
        },
      });
      secondReminders += 1;
      continue;
    }

    if (hours >= settings.first_reminder_hours && !item.reminder_first_sent_at) {
      await db
        .from("listing_content_items")
        .update({ reminder_first_sent_at: new Date().toISOString() })
        .eq("id", item.id);
      if (agent?.auth_user_id) {
        await notifyUser(
          db,
          agent.auth_user_id,
          `Reminder: listing content for ${property.address} has been awaiting your review for ${Math.floor(hours)} hours.`,
          "listing_approval",
        );
      }
      await audit(db, {
        actorId: agent?.auth_user_id ?? null,
        actorType: "agent",
        actionType: "listing.approval_reminder_sent",
        entityId: property.id,
        metadata: { ...base, threshold_hours: settings.first_reminder_hours },
      });
      firstReminders += 1;
    }
  }

  return { scanned: rows.length, firstReminders, secondReminders, stalled };
}

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Not authorized.");
}

export const getEscalationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EscalationSettings> => {
    await requireAdmin(context.supabase, context.userId);
    return readEscalationSettings(await admin());
  });

export const updateEscalationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: EscalationSettings) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const value: EscalationSettings = {
      first_reminder_hours: Math.max(1, Math.round(Number(data.first_reminder_hours))),
      second_reminder_hours: Math.max(1, Math.round(Number(data.second_reminder_hours))),
      stalled_hours: Math.max(1, Math.round(Number(data.stalled_hours))),
    };
    if (
      !(value.first_reminder_hours < value.second_reminder_hours &&
        value.second_reminder_hours < value.stalled_hours)
    ) {
      throw new Error("Intervals must increase: first < second < stalled.");
    }
    const db = await admin();
    await db.from("platform_settings").upsert({
      key: ESCALATION_SETTINGS_KEY,
      value,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    });
    await audit(db, {
      actorId: context.userId,
      actorType: "broker",
      actionType: "listing.approval_escalation_settings_updated",
      entityId: null,
      metadata: value as unknown as Record<string, unknown>,
    });
    return value;
  });

export const listStalledApprovalItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StalledApprovalItem[]> => {
    await requireAdmin(context.supabase, context.userId);
    const db = await admin();
    const settings = await readEscalationSettings(db);
    const cutoff = new Date(Date.now() - settings.stalled_hours * HOUR).toISOString();

    const { data: items } = await db
      .from("listing_content_items")
      .select(
        "id, property_id, item_type, label, queued_at, created_at, stalled_at, reminder_first_sent_at, reminder_second_sent_at",
      )
      .eq("disposition", "pending")
      .or(`stalled_at.not.is.null,queued_at.lte.${cutoff}`)
      .order("queued_at", { ascending: true });

    const rows = (items ?? []) as any[];
    if (rows.length === 0) return [];

    const propertyIds = Array.from(new Set(rows.map((r) => r.property_id)));
    const { data: props } = await db
      .from("properties")
      .select("id, address, seller_id, listing_agent_id")
      .in("id", propertyIds);
    const propById = new Map(((props ?? []) as any[]).map((p) => [p.id, p]));

    const sellerIds = Array.from(
      new Set(((props ?? []) as any[]).map((p) => p.seller_id).filter(Boolean)),
    );
    const { data: sellers } = sellerIds.length
      ? await db
          .from("sellers")
          .select("id, full_name, email, phone, onboarding_status")
          .in("id", sellerIds)
      : { data: [] };
    const sellerById = new Map(((sellers ?? []) as any[]).map((s) => [s.id, s]));

    const agentIds = Array.from(
      new Set(((props ?? []) as any[]).map((p) => p.listing_agent_id).filter(Boolean)),
    );
    const { data: agents } = agentIds.length
      ? await db.from("agents").select("id, full_name, broker_id").in("id", agentIds)
      : { data: [] };
    const agentById = new Map(((agents ?? []) as any[]).map((a) => [a.id, a]));

    const brokerIds = Array.from(
      new Set(((agents ?? []) as any[]).map((a) => a.broker_id).filter(Boolean)),
    );
    const { data: brokers } = brokerIds.length
      ? await db.from("brokers").select("id, brokerage_name").in("id", brokerIds)
      : { data: [] };
    const brokerById = new Map(((brokers ?? []) as any[]).map((b) => [b.id, b]));

    return rows.flatMap((r) => {
      const p = propById.get(r.property_id);
      if (!p) return [];
      const agent = p.listing_agent_id ? agentById.get(p.listing_agent_id) : null;
      const broker = agent?.broker_id ? brokerById.get(agent.broker_id) : null;
      const seller = sellerById.get(p.seller_id);
      const queuedAt = r.queued_at ?? r.created_at;
      return [
        {
          id: r.id,
          property_id: p.id,
          address: p.address,
          item_type: r.item_type,
          label: r.label,
          queued_at: queuedAt,
          stalled_at: r.stalled_at,
          hours_waiting: Math.floor((Date.now() - new Date(queuedAt).getTime()) / HOUR),
          reminder_first_sent_at: r.reminder_first_sent_at,
          reminder_second_sent_at: r.reminder_second_sent_at,
          listing_agent_name: agent?.full_name ?? null,
          broker_name: broker?.brokerage_name ?? null,
          seller_id: p.seller_id,
          seller_name: seller?.full_name ?? null,
          seller_email: seller?.email ?? null,
          seller_phone: seller?.phone ?? null,
          seller_onboarding_status: seller?.onboarding_status ?? null,
        } satisfies StalledApprovalItem,
      ];
    });
  });

/** Admin-triggered run of the same sweep the scheduled endpoint performs. */
export const runApprovalEscalationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return runApprovalEscalationSweep(await admin());
  });
