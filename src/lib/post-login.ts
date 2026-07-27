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

  if (error || !data) return "/onboarding";

  switch (data.onboarding_status) {
    case "not_started":
      return "/onboarding";
    case "enrollment_fee_pending":
      return "/onboarding/fee";
    case "identity_pending":
      return "/onboarding/identity";
    case "property_verification_pending":
      return "/onboarding/property";
    case "listing_creation_pending":
      return "/onboarding/listing";
    case "media_pending":
      return "/onboarding/media";
    case "agreement_pending":
      return "/onboarding/agreement";
    default:
      return "/dashboard";
  }
}
