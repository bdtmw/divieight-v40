import { createFileRoute } from "@tanstack/react-router";
import { runEoExpirySweep } from "@/lib/eo-expiry.functions";

/**
 * Entry point for the E&O coverage expiry sweep (60/30/7-day reminders and
 * the lapse on expiry). Mirrors the NAR re-certification sweep endpoint.
 *
 * TODO(cron): schedule a daily POST here (pg_cron + pg_net) with the project's
 * publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/eo-expiry-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runEoExpirySweep();
        return Response.json(result);
      },
    },
  },
});
