import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled sweep: expire lapsed substitution invitations and cascade the
 * offer to the next compatible candidate by Priority Rank.
 *
 * Caller must present the shared secret; the endpoint is bounded and
 * idempotent, so repeated calls are safe.
 */
export const Route = createFileRoute("/api/public/substitution-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ESCALATION_SWEEP_SECRET"];
        const provided =
          request.headers.get("x-sweep-secret") ??
          new URL(request.url).searchParams.get("secret");
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
        const { runSubstitutionExpirySweep } = await import("@/lib/substitution-invite.server");
        const result = await runSubstitutionExpirySweep(supabaseAdmin as never);

        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
