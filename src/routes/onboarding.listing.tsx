import { createFileRoute } from "@tanstack/react-router";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export const Route = createFileRoute("/onboarding/listing")({
  head: () => ({
    meta: [
      { title: "Create your listing — divieight" },
      { name: "description", content: "Set price, photos, and details for your fractional listing." },
    ],
  }),
  component: ListingScreen,
});

function ListingScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={4} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 4 · Listing
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Create your listing
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Listing creation will be added in the next step.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Coming soon.
      </div>
    </div>
  );
}
