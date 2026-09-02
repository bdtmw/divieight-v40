import { createFileRoute } from "@tanstack/react-router";
import { runNarCertSweep } from "@/lib/nar-cert.functions";

/**
 * Entry point for the NAR re-certification sweep.
 *
 * TODO(cron): schedule a daily POST here (pg_cron + pg_net) with the project's
 * publishable key in the `apikey` header. Manual POSTs work today.
 */
export const Route = createFileRoute("/api/public/nar-cert-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runNarCertSweep();
        return Response.json(result);
      },
    },
  },
});
