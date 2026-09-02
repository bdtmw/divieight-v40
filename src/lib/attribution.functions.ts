import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ResolvedToken {
  found: boolean;
  agentId?: string;
  token?: string;
}

/**
 * Resolve a /r/{token} visit: look up the token, increment its click count and
 * write the click to the audit log. Runs with the service role because
 * anonymous visitors cannot update the counter under RLS.
 */
export const resolveAttributionToken = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().min(3).max(64) }).parse(data))
  .handler(async ({ data }): Promise<ResolvedToken> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const { data: row, error } = await db
      .from("attribution_tokens")
      .select("id, agent_id, token, click_count")
      .eq("token", data.token)
      .maybeSingle();

    if (error || !row) return { found: false };

    await db
      .from("attribution_tokens")
      .update({ click_count: (row.click_count ?? 0) + 1 })
      .eq("id", row.id);

    await db.from("audit_log").insert({
      actor_id: row.agent_id,
      actor_type: "agent",
      action_type: "agent.attribution_token_clicked",
      entity_type: "attribution_token",
      entity_id: row.id,
      metadata: { token: row.token, click_count: (row.click_count ?? 0) + 1 },
    });

    return { found: true, agentId: row.agent_id as string, token: row.token as string };
  });
