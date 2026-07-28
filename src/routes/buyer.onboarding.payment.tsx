import { createFileRoute } from "@tanstack/react-router";
import { BuyerOnboardingStepper } from "@/components/BuyerOnboardingStepper";

export const Route = createFileRoute("/buyer/onboarding/payment")({
  head: () => ({
    meta: [
      { title: "Buyer payment setup — divieight" },
      {
        name: "description",
        content: "Set up your payment method to reserve shares in a divieight property.",
      },
      { property: "og:title", content: "Buyer payment setup — divieight" },
      {
        property: "og:description",
        content: "Set up your payment method to reserve shares in a divieight property.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentScreen,
});

function PaymentScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <BuyerOnboardingStepper current={3} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 3 · Payment
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Payment setup
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your locations and non-negotiables are saved. Payment setup arrives in the next build.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Payment method capture will be added here.
      </div>
    </div>
  );
}
