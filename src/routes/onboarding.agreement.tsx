import { createFileRoute } from "@tanstack/react-router";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export const Route = createFileRoute("/onboarding/agreement")({
  head: () => ({
    meta: [
      { title: "Seller agreement — divieight" },
      { name: "description", content: "Review and sign the divieight seller agreement." },
    ],
  }),
  component: AgreementScreen,
});

function AgreementScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={5} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 5 · Agreement
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Seller agreement
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your listing is in review. The seller agreement step will be added next.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Coming soon.
      </div>
    </div>
  );
}
