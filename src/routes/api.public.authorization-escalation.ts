import { createFileRoute } from "@tanstack/react-router";
import { runAuthorizationEscalationSweep } from "@/lib/authorization.server";

/**
 * Entry point for the Buyer-Authorization time-out escalation sweep.
 * Schedule a frequent POST here with the project's publishable key in `apikey`.
 * This sweep never grants authorization — it only escalates non-response.
 */
export const Route = createFileRoute("/api/public/authorization-escalation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json(await runAuthorizationEscalationSweep());
      },
    },
  },
});
