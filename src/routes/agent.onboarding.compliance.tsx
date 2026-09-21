import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { ComplianceAckForm } from "@/components/credentialing/ComplianceAckForm";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";

export const Route = createFileRoute("/agent/onboarding/compliance")({
  head: () => ({
    meta: [
      { title: "FinCEN & ethics — divieight Professional Portal" },
      {
        name: "description",
        content: "Step 3 of divieight agent credentialing: FinCEN/AML and ethics acknowledgments.",
      },
      { property: "og:title", content: "FinCEN & ethics — divieight" },
      {
        property: "og:description",
        content: "Complete FinCEN/AML and ethics acknowledgments for the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      <CredentialStepper entityType="agent" current={3} />

      {!agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">FinCEN &amp; ethics acknowledgments</h1>
        <p className="text-sm text-muted-foreground">
          Each acknowledgment below is recorded individually with its own timestamp.
        </p>
      </header>

      <ComplianceAckForm
        entityType="agent"
        entity={agent}
        submitLabel="Continue to Broker of Record"
        onDone={() => navigate({ to: "/agent/onboarding/broker" })}
      />
    </div>
  );
}
