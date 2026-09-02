import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";

export const Route = createFileRoute("/agent/onboarding/compliance")({
  head: () => ({
    meta: [
      { title: "FinCEN & ethics — divieight Professional Portal" },
      {
        name: "description",
        content: "Step 3 of divieight agent credentialing: FinCEN and ethics compliance.",
      },
      { property: "og:title", content: "FinCEN & ethics — divieight" },
      {
        property: "og:description",
        content: "Complete FinCEN and ethics compliance for the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
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
      <AgentOnboardingStepper current={3} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          FinCEN &amp; ethics compliance
        </h1>
        <p className="text-sm text-muted-foreground">
          Your E&amp;O insurance and NAR settlement certification are recorded. FinCEN reporting
          and ethics attestations open in the next release.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 text-sm">
          <ScrollText className="mt-0.5 h-5 w-5 text-accent" />
          <p className="text-muted-foreground">
            Current status:{" "}
            <span className="font-medium text-foreground">
              {agent?.onboarding_status ?? "compliance_pending"}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
