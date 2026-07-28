import { createFileRoute } from "@tanstack/react-router";
import { BuyerOnboardingStepper } from "@/components/BuyerOnboardingStepper";

export const Route = createFileRoute("/buyer/onboarding/lifestyle")({
  head: () => ({
    meta: [
      { title: "Lifestyle survey — divieight" },
      {
        name: "description",
        content: "Tell us how you'll use the home so we can match you to the right listings.",
      },
      { property: "og:title", content: "Lifestyle survey — divieight" },
      {
        property: "og:description",
        content: "Tell us how you'll use the home so we can match you to the right listings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LifestyleScreen,
});

function LifestyleScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BuyerOnboardingStepper current={2} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 2 · Lifestyle
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Lifestyle survey
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your identity, intent, and budget are saved. The lifestyle survey arrives in the next
          build.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Lifestyle survey questions will be added here.
      </div>
    </div>
  );
}
