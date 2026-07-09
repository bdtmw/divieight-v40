import { createFileRoute } from "@tanstack/react-router";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export const Route = createFileRoute("/onboarding/identity")({
  head: () => ({
    meta: [
      { title: "Identity verification — divieight" },
      { name: "description", content: "Verify your identity to continue onboarding." },
    ],
  }),
  component: IdentityScreen,
});

function IdentityScreen() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={2} />
      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 2 · Identity
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verify your identity
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Identity verification will be added in the next step.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Coming soon.
      </div>
    </div>
  );
}
