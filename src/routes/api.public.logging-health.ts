import { createFileRoute } from "@tanstack/react-router";
import { runLoggingHealthCheck } from "@/lib/logging-health.functions";

/**
 * Logging-integrity check entry point.
 *
 * TODO(cron): schedule an hourly POST here (pg_cron + pg_net) with the
 * project's publishable key in the `apikey` header. Manual POSTs work today,
 * as does the panel on /admin.
 */
export const Route = createFileRoute("/api/public/logging-health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runLoggingHealthCheck();
        return Response.json(result);
      },
    },
  },
});
