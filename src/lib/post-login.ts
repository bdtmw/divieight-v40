import { supabase } from "@/integrations/supabase/client";
import { buyerRedirect, getBuyerAccount } from "@/lib/buyer";

/**
 * After a successful sign-in, work out which side of the marketplace the
 * account belongs to (buyer_accounts vs sellers) and return the landing route.
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const buyer = await getBuyerAccount(userId);
  if (buyer) return buyerRedirect(buyer.onboarding_status);

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
