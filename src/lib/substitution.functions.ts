import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Vacancy } from "@/lib/substitution";
import type { MySubstitutionInvitation } from "@/lib/substitution-invite";

/**
 * Admin-only oversight of open vacancies and the ranked candidate pipeline.
 *
 * Deliberately NOT exposed to agents or brokers: no role outside platform
 * administration may search the candidate pipeline or request a specific
 * candidate. Invitations are dispatched by the platform, one at a time.
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

    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
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

/** The invitations addressed to the signed-in buyer. */
export const getMySubstitutionInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubstitutionInvitation[]> => {
    const { supabase, userId } = context;
    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const { invitationsForBuyer } = await import("@/lib/substitution-invite.server");
    return invitationsForBuyer(supabaseAdmin as never, buyer.id);
  });

/** Accept or decline a substitution invitation. Declining has no consequence. */
export const respondToSubstitutionInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invitationId: string; response: "accepted" | "declined" }) => ({
    invitationId: String(data.invitationId),
    response: data.response === "accepted" ? ("accepted" as const) : ("declined" as const),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason: string }> => {
    const { supabase, userId } = context;
    const { data: buyer } = await supabase
      .from("buyer_accounts")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (!buyer) return { ok: false, reason: "no_buyer_account" };

    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const { respondToInvitation } = await import("@/lib/substitution-invite.server");
    const result = await respondToInvitation(supabaseAdmin as never, {
      invitationId: data.invitationId,
      buyerAccountId: buyer.id,
      authUserId: userId,
      response: data.response,
    });
    return { ok: result.ok, reason: result.reason };
  });
