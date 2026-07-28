import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BuyerOnboardingStepper } from "@/components/BuyerOnboardingStepper";

export const Route = createFileRoute("/buyer/onboarding/vetting")({
  head: () => ({
    meta: [
      { title: "Buyer vetting — divieight" },
      {
        name: "description",
        content:
          "Final buyer vetting review: background, funds verification, and co-ownership readiness.",
      },
      { property: "og:title", content: "Buyer vetting — divieight" },
      {
        property: "og:description",
        content: "Final buyer vetting review before reservations unlock.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VettingScreen,
});

function VettingScreen() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BuyerOnboardingStepper current={4} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 4 · Vetting
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Vetting in review
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your Priority Reservation Agreement is executed and your priority rank is locked
          in. Final vetting review arrives in the next build.
        </p>
      </div>
      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={() => navigate({ to: "/buyer/dashboard" })}
          className="inline-flex h-11 items-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Go to buyer dashboard
        </button>
      </div>
    </div>
  );
}
