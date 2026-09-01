import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";

export const Route = createFileRoute("/agent/onboarding/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance & certification — divieight Professional Portal" },
      {
        name: "description",
        content: "Step 2 of divieight agent credentialing: E&O insurance and certification.",
      },
      { property: "og:title", content: "Insurance & certification — divieight" },
      {
        property: "og:description",
        content: "Upload E&O insurance and certification for the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsurancePage,
});

function InsurancePage() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (!cancelled) setAgent(row);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-8">
      <AgentOnboardingStepper current={2} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Insurance &amp; certification
        </h1>
        <p className="text-sm text-muted-foreground">
          E&amp;O insurance and certification uploads open in the next release. You can continue
          building out your profile in the meantime.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 text-sm">
          <FileCheck2 className="mt-0.5 h-5 w-5 text-accent" />
          <p className="text-muted-foreground">
            Current status: <span className="font-medium text-foreground">
              {agent?.onboarding_status ?? "insurance_pending"}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
