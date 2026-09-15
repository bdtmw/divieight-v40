import { createFileRoute } from "@tanstack/react-router";
import { runApprovalEscalationSweep } from "@/lib/approval-escalation.functions";

/**
 * Gate 1 approval-queue escalation sweep (reminders at the first/second
 * thresholds, "stalled" flag at the third). Bounded to 200 items per run and
 * idempotent — each stage stamps the row it acted on.
 *
 * TODO(cron): schedule an hourly POST here (pg_cron + pg_net) with the
 * project's publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/listing-approval-escalation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
        const result = await runApprovalEscalationSweep(
          supabaseAdmin as unknown as { from: (t: string) => any },
        );
        return Response.json(result);
      },
    },
  },
});
