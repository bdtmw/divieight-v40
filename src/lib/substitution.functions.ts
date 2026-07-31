import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Vacancy } from "@/lib/substitution";

/**
 * Admin-only: open vacancies with their top-5 ranked compatible candidates.
 *
 * TODO (Month 3+): automated invitation dispatch. Once notification
 * infrastructure supports buyer-facing transactional email + in-app
 * notifications, invite the top-ranked candidate automatically with a
 * time-boxed acceptance window and cascade down the ranked list on expiry.
 */
export const getSubstitutionVacancies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Vacancy[]> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildVacancies } = await import("@/lib/substitution.server");
    const vacancies = await buildVacancies(supabaseAdmin);

    await supabase.from("audit_log").insert({
      actor_id: userId,
      actor_type: "admin",
      action_type: "substitution.pipeline_viewed",
      entity_type: "property",
      entity_id: null,
      metadata: {
        vacancies: vacancies.length,
        candidates_surfaced: vacancies.reduce((s, v) => s + v.candidates.length, 0),
      } as never,
    });

    return vacancies;
  });
