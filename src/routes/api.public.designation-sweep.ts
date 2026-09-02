import { createFileRoute } from "@tanstack/react-router";
import { runDesignationSweep } from "@/lib/designation.functions";

/**
 * 3-calendar-day Buyer-Designated Agent acceptance window sweep.
 *
 * TODO(cron): schedule a daily POST here (pg_cron + pg_net) with the project's
 * publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/designation-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
        const result = await runDesignationSweep(
          supabaseAdmin as unknown as { from: (t: string) => any },
        );
        return Response.json(result);
      },
    },
  },
});
