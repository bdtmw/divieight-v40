import { supabase } from "@/integrations/supabase/client";

export type ListingStep =
  | "property_authority"
  | "listing_creation"
  | "media_upload"
  | "listing_agent"
  | "agreement";

/**
 * Records how far a seller got in the property creation flow so the dashboard
 * can resume a draft exactly where they left off. Failures are non-fatal: the
 * dashboard falls back to inferring the step from the row's own data.
 */
export async function markListingStep(propertyId: string, step: ListingStep) {
  try {
    await supabase
      .from("properties")
      .update({ last_completed_step: step } as never)
      .eq("id", propertyId);
  } catch {
    /* column not present yet — ignore */
  }
}

const ROUTES: Record<ListingStep, string> = {
  property_authority: "/onboarding/listing",
  listing_creation: "/onboarding/media",
  media_upload: "/onboarding/listing-agent",
  listing_agent: "/onboarding/agreement",
  agreement: "/onboarding/agreement",
};

/** Next route to resume at, given the last completed step. */
export function resumeRouteForStep(step: string | null | undefined): string | null {
  if (!step) return null;
  return ROUTES[step as ListingStep] ?? null;
}
