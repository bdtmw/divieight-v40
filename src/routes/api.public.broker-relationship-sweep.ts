import { createFileRoute } from "@tanstack/react-router";
import { runBrokerRelationshipSweep } from "@/lib/broker-relationship.functions";

/**
 * Entry point for the Agent-to-Broker relationship re-verification sweep.
 *
 * TODO(cron): schedule a weekly POST here (pg_cron + pg_net) with the
 * project's publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/broker-relationship-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runBrokerRelationshipSweep();
        return Response.json(result);
      },
    },
  },
});
