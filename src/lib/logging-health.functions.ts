import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_LOGGING_HEALTH_SETTINGS,
  LOGGING_HEALTH_SETTINGS_KEY,
  LOGGING_SOURCES,
  alertMessage,
  evaluateSource,
  type LoggingHealthReport,
  type LoggingHealthSettings,
  type LoggingSourceHealth,
} from "@/lib/logging-health";

/**
 * Manually triggerable logging-integrity check, same shape as the other
 * time-based sweeps in this build (NAR cert, E&O expiry, Gate 1 escalation).
 *
 * It reads only the newest timestamp per source — never the content of a log
 * entry — and raises an admin alert for any source that has gone quiet longer
 * than its configured cadence.
 *
 * TODO(cron): schedule an hourly POST to /api/public/logging-health once
 * pg_cron + pg_net are enabled. Manual runs work today from /admin.
 */

type Db = { from: (t: string) => any };

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  return supabaseAdmin as unknown as Db;
}

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Not authorized.");
}

export async function readLoggingHealthSettings(db: Db): Promise<LoggingHealthSettings> {
  const { data } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", LOGGING_HEALTH_SETTINGS_KEY)
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<LoggingHealthSettings>;
  return {
    audit_log: Number(v.audit_log) || DEFAULT_LOGGING_HEALTH_SETTINGS.audit_log,
    notifications: Number(v.notifications) || DEFAULT_LOGGING_HEALTH_SETTINGS.notifications,
    signed_documents:
      Number(v.signed_documents) || DEFAULT_LOGGING_HEALTH_SETTINGS.signed_documents,
  };
}

async function countRows(db: Db, table: string): Promise<number> {
  const { count } = await db.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function runLoggingHealthCheck(): Promise<LoggingHealthReport> {
  const db = await admin();
  const now = new Date();
  const settings = await readLoggingHealthSettings(db);

  const [sellers, buyers, agents] = await Promise.all([
    countRows(db, "sellers"),
    countRows(db, "buyer_accounts"),
    countRows(db, "agents").catch(() => 0),
  ]);
  const affectedBy = {
    audit_log: sellers + buyers + agents,
    notifications: sellers + buyers,
    signed_documents: sellers + buyers,
  } as const;

  const sources: LoggingSourceHealth[] = [];
  for (const spec of LOGGING_SOURCES) {
    let q = db.from(spec.table).select(spec.column).order(spec.column, { ascending: false }).limit(1);
    // Monitoring writes its own audit rows; ignore them so the vault can't
    // look healthy purely because this check ran.
    if (spec.id === "audit_log") q = q.not("action_type", "like", "monitoring.%");
    const { data } = await q;
    const lastSeenAt = (data?.[0]?.[spec.column] as string | undefined) ?? null;
    sources.push(
      evaluateSource({
        spec,
        expectedHours: settings[spec.id],
        lastSeenAt,
        affectedParticipants: affectedBy[spec.id],
        now,
      }),
    );
  }

  const alerts = sources.filter((s) => s.status !== "ok");

  if (alerts.length > 0) {
    const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = ((admins ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
    for (const alert of alerts) {
      const message = alertMessage(alert);
      for (const userId of adminIds) {
        await db
          .from("notifications")
          .insert({ seller_id: userId, message, type: "monitoring" });
      }
      await db.from("audit_log").insert({
        actor_id: null,
        actor_type: "admin",
        action_type: "monitoring.logging_gap_detected",
        entity_type: "logging_source",
        entity_id: null,
        metadata: {
          source: alert.id,
          expected_hours: alert.expectedHours,
          silent_hours: alert.silentHours,
          last_seen_at: alert.lastSeenAt,
          affected_participants: alert.affectedParticipants,
          message,
        },
      });
    }
  }

  return { checkedAt: now.toISOString(), settings, sources, alerts };
}

/** Admin-only manual trigger, used by the /admin dashboard panel. */
export const triggerLoggingHealthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoggingHealthReport> => {
    await requireAdmin(context.supabase, context.userId);
    return runLoggingHealthCheck();
  });
