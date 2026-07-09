import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Seller onboarding — divieight" },
      { name: "description", content: "Complete your seller profile on divieight." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Onboarding"
      title="Set up your seller profile"
      description="KYC and payout onboarding steps will appear here."
    />
  ),
});
