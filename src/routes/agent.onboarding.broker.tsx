import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";

export const Route = createFileRoute("/agent/onboarding/broker")({
  head: () => ({
    meta: [
      { title: "Broker of Record link — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Step 4 of divieight agent credentialing: link your Broker of Record for buyer-side commission routing.",
      },
      { property: "og:title", content: "Broker of Record link — divieight" },
      {
        property: "og:description",
        content: "Connect your Broker of Record to complete divieight agent credentialing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerLinkPage,
});

function BrokerLinkPage() {
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
      <AgentOnboardingStepper current={4} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Broker of Record link
        </h1>
        <p className="text-sm text-muted-foreground">
          Your FinCEN and ethics acknowledgments are recorded. Next you&apos;ll connect your
          Broker of Record, through whom any buyer-side commission is paid from sale proceeds.
          The platform does not pay agents directly.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 text-sm">
          <Building2 className="mt-0.5 h-5 w-5 text-accent" />
          <p className="text-muted-foreground">
            Current status:{" "}
            <span className="font-medium text-foreground">
              {agent?.onboarding_status ?? "broker_link_pending"}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
