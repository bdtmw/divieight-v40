import { createServerFn } from "@tanstack/react-start";
import {
  EO_BROKER_NOTICE_DAY,
  EO_LAPSED_MESSAGE,
  dueEoReminder,
  eoBrokerNoticeMessage,
  eoReminderMessage,
  type EoReminderDay,
} from "@/lib/eo-expiry";

/**
 * E&O coverage expiry sweep — mirrors the NAR re-certification sweep.
 *
 * Sends 60/30/7-day reminders to the agent (copying the Broker of Record at
 * the 30-day mark) and, once coverage has expired without renewed evidence,
 * marks the agent lapsed and holds their in-flight transactions through the
 * existing `agents.transactions_held` flag.
 *
 * TODO(cron): schedule a daily POST to /api/public/eo-expiry-sweep with the
 * project's publishable key in the `apikey` header. Manual triggering works.
 */

type Db = { from: (t: string) => any };

interface AgentRowLite {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  broker_id: string | null;
  eo_expires_at: string | null;
  eo_lapsed: boolean | null;
  eo_reminder_60_sent_at: string | null;
  eo_reminder_30_sent_at: string | null;
  eo_reminder_7_sent_at: string | null;
}

export interface EoSweepResult {
  scanned: number;
  reminded: number;
  brokersNotified: number;
  lapsed: number;
  rows: Array<{ agentId: string; email: string; event: string }>;
}

const REMINDER_COLUMN: Record<EoReminderDay, string> = {
  60: "eo_reminder_60_sent_at",
  30: "eo_reminder_30_sent_at",
  7: "eo_reminder_7_sent_at",
};

async function notify(db: Db, authUserId: string, message: string, type: string) {
  await db.from("notifications").insert({ seller_id: authUserId, message, type });
}

export async function runEoExpirySweep(): Promise<EoSweepResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  const db = supabaseAdmin as unknown as Db;
  const now = new Date();

  const { data, error } = await db
    .from("agents")
    .select(
      "id, auth_user_id, full_name, email, broker_id, eo_expires_at, eo_lapsed, eo_reminder_60_sent_at, eo_reminder_30_sent_at, eo_reminder_7_sent_at",
    )
    .not("eo_expires_at", "is", null);
  if (error) throw new Error(error.message);

  const agents = (data ?? []) as AgentRowLite[];
  const result: EoSweepResult = {
    scanned: agents.length,
    reminded: 0,
    brokersNotified: 0,
    lapsed: 0,
    rows: [],
  };

  for (const agent of agents) {
    const expired = new Date(agent.eo_expires_at as string).getTime() <= now.getTime();

    if (expired) {
      if (agent.eo_lapsed) continue;
      await db
        .from("agents")
        .update({
          eo_lapsed: true,
          eo_lapsed_at: now.toISOString(),
          transactions_held: true,
        })
        .eq("id", agent.id);
      await notify(db, agent.auth_user_id, EO_LAPSED_MESSAGE, "compliance");
      if (agent.broker_id) {
        const { data: broker } = await db
          .from("brokers")
          .select("auth_user_id")
          .eq("id", agent.broker_id)
          .maybeSingle();
        if (broker?.auth_user_id) {
          await notify(
            db,
            broker.auth_user_id,
            `${agent.full_name}'s E&O coverage has expired — their in-flight transactions are on hold until coverage is restored.`,
            "compliance",
          );
        }
      }
      await db.from("audit_log").insert({
        actor_id: agent.auth_user_id,
        actor_type: "system",
        action_type: "agent.eo_insurance_lapsed",
        entity_type: "agent",
        entity_id: agent.id,
        metadata: {
          expired_at: agent.eo_expires_at,
          source: "eo_expiry_sweep",
          transactions_held: true,
        },
      });
      result.lapsed += 1;
      result.rows.push({ agentId: agent.id, email: agent.email, event: "lapsed" });
      continue;
    }

    const due = dueEoReminder(
      {
        expiresAt: agent.eo_expires_at,
        reminder60SentAt: agent.eo_reminder_60_sent_at,
        reminder30SentAt: agent.eo_reminder_30_sent_at,
        reminder7SentAt: agent.eo_reminder_7_sent_at,
      },
      now,
    );
    if (!due) continue;

    await db
      .from("agents")
      .update({ [REMINDER_COLUMN[due]]: now.toISOString() })
      .eq("id", agent.id);
    await notify(db, agent.auth_user_id, eoReminderMessage(due), "compliance");
    result.reminded += 1;
    result.rows.push({ agentId: agent.id, email: agent.email, event: `reminder_${due}` });

    let brokerNotified = false;
    if (due === EO_BROKER_NOTICE_DAY && agent.broker_id) {
      const { data: broker } = await db
        .from("brokers")
        .select("auth_user_id")
        .eq("id", agent.broker_id)
        .maybeSingle();
      if (broker?.auth_user_id) {
        await notify(
          db,
          broker.auth_user_id,
          eoBrokerNoticeMessage(agent.full_name, due),
          "compliance",
        );
        brokerNotified = true;
        result.brokersNotified += 1;
      }
    }

    await db.from("audit_log").insert({
      actor_id: agent.auth_user_id,
      actor_type: "system",
      action_type: "agent.eo_insurance_reminder_sent",
      entity_type: "agent",
      entity_id: agent.id,
      metadata: {
        days_before_expiry: due,
        expires_at: agent.eo_expires_at,
        broker_notified: brokerNotified,
        source: "eo_expiry_sweep",
      },
    });
  }

  return result;
}

/** Manually triggerable sweep (admin/dev button or direct call). */
export const triggerEoExpirySweep = createServerFn({ method: "POST" }).handler(async () =>
  runEoExpirySweep(),
);
