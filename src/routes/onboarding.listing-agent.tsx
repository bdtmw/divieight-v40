import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { ListingAgentTagger } from "@/components/ListingAgentTagger";
import { Button } from "@/components/ui/button";
import { markListingStep } from "@/lib/listing-progress";
import { getListingAgentTagState } from "@/lib/listing-approval.functions";

export const Route = createFileRoute("/onboarding/listing-agent")({
  validateSearch: (search: Record<string, unknown>) => ({
    property: typeof search.property === "string" ? search.property : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Choose your Listing Agent — divieight" },
      {
        name: "description",
        content:
          "Tag or invite the licensed Listing Agent who will review and approve your listing content.",
      },
      { property: "og:title", content: "Choose your Listing Agent — divieight" },
      {
        property: "og:description",
        content: "Tag or invite the Listing Agent who approves your listing content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListingAgentScreen,
});

function ListingAgentScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { property: propertyParam } = Route.useSearch();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      let query = supabase.from("properties").select("id").eq("seller_id", user.id);
      query = propertyParam
        ? query.eq("id", propertyParam)
        : query.order("created_at", { ascending: false }).limit(1);
      const { data } = await query.maybeSingle();
      if (!data?.id) {
        navigate({ to: "/onboarding/property" });
        return;
      }
      setPropertyId(data.id);
      setLoadingProperty(false);
    })();
  }, [user, loading, propertyParam, navigate]);

  const [checking, setChecking] = useState(false);

  async function goNext() {
    if (!propertyId) return;
    setChecking(true);
    try {
      const state = await getListingAgentTagState({ data: { propertyId } });
      if (!state.agentName && !state.invitedEmail) {
        toast.error("Tag a Listing Agent or invite one by email before continuing.");
        return;
      }
    } catch {
      toast.error("Could not confirm your Listing Agent. Please try again.");
      return;
    } finally {
      setChecking(false);
    }
    await markListingStep(propertyId, "listing_agent");
    navigate({ to: "/onboarding/agreement", search: { property: propertyId } });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={6} />

      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 6 · Listing Agent
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Choose your Listing Agent
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Search for a licensed Listing Agent, or invite yours by email. They review and
          approve your listing content before it goes live.
        </p>
      </div>

      {loadingProperty || !propertyId ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading your listing…
        </div>
      ) : (
        <>
          <div className="mt-8">
            <ListingAgentTagger propertyId={propertyId} />
          </div>

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Button
              variant="outline"
              onClick={() =>
                navigate({ to: "/onboarding/media", search: { property: propertyId } })
              }
            >
              Back
            </Button>
            <Button onClick={goNext} disabled={checking}>Continue to agreement</Button>
          </div>
        </>
      )}
    </div>
  );
}
