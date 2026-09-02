import { createServerFn } from "@tanstack/react-start";

/**
 * NAR settlement re-certification scheduler.
 *
 * Checks every agent whose certification has passed its one-year expiry and
 * flags `nar_cert_lapsed = true`. Lapsed agents see a dashboard banner and any
 * in-flight transaction they touch shows a "Hold" indicator.
 *
 * TODO(cron): no scheduler is wired yet. Once pg_cron + pg_net are enabled,
 * schedule a daily POST to /api/public/nar-cert-sweep with the project's
 * publishable key in the `apikey` header. Manual triggering works today.
 */

export interface NarSweepRow {
  agentId: string;
  email: string;
  expiredAt: string;
}

export interface NarSweepResult {
  scanned: number;
  lapsed: number;
  rows: NarSweepRow[];
}

export async function runNarCertSweep(): Promise<NarSweepResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
  const db = supabaseAdmin as unknown as { from: (t: string) => any };
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("agents")
    .select("id, auth_user_id, email, nar_cert_expires_at")
    .eq("nar_cert_lapsed", false)
    .not("nar_cert_expires_at", "is", null)
    .lte("nar_cert_expires_at", now);
  if (error) throw new Error(error.message);

  const agents = (data ?? []) as Array<{
    id: string;
    auth_user_id: string;
    email: string;
    nar_cert_expires_at: string;
  }>;

  const rows: NarSweepRow[] = [];
  for (const agent of agents) {
    await db.from("agents").update({ nar_cert_lapsed: true }).eq("id", agent.id);
    await db.from("audit_log").insert({
      actor_id: agent.auth_user_id,
      actor_type: "system",
      action_type: "agent.nar_cert_lapsed",
      entity_type: "agent",
      entity_id: agent.id,
      metadata: { expired_at: agent.nar_cert_expires_at, source: "nar_cert_sweep" },
    });
    rows.push({
      agentId: agent.id,
      email: agent.email,
      expiredAt: agent.nar_cert_expires_at,
    });
  }

  return { scanned: agents.length, lapsed: rows.length, rows };
}

/** Manually triggerable sweep (admin/dev button or direct call). */
export const triggerNarCertSweep = createServerFn({ method: "POST" }).handler(async () =>
  runNarCertSweep(),
);
