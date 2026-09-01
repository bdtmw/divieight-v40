import { createFileRoute } from "@tanstack/react-router";
import { runArelloRetrySweep } from "@/lib/arello-retry.functions";

/**
 * Cron entry point for the ARELLO pending-retry sweep.
 *
 * TODO(cron): schedule an hourly POST here (pg_cron + pg_net) with the
 * project's publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/arello-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runArelloRetrySweep();
        return Response.json(result);
      },
    },
  },
});
