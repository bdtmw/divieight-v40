import { createFileRoute } from "@tanstack/react-router";
import { runDiligenceEscalationSweep } from "@/lib/due-diligence.server";

/**
 * Entry point for the 7-day Resident Agent acknowledgment escalation sweep.
 * Schedule a daily POST here with the project's publishable key in `apikey`.
 */
export const Route = createFileRoute("/api/public/diligence-escalation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runDiligenceEscalationSweep();
        return Response.json(result);
      },
    },
  },
});
