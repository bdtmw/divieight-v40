import { supabase } from "@/integrations/supabase/client";

/**
 * After a successful sign-in, look up the seller's onboarding status
 * and return the route the user should land on.
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("sellers")
    .select("onboarding_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.onboarding_status === "not_started") {
    return "/onboarding";
  }
  return "/dashboard";
}
