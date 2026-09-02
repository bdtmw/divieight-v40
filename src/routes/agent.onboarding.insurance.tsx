import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { InsuranceCertForm } from "@/components/credentialing/InsuranceCertForm";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";

export const Route = createFileRoute("/agent/onboarding/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance & certification — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Step 2 of divieight agent credentialing: E&O insurance proof and NAR settlement certification.",
      },
      { property: "og:title", content: "Insurance & certification — divieight" },
      {
        property: "og:description",
        content: "Submit E&O insurance proof and certify NAR August 2024 settlement compliance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsurancePage,
});

function InsurancePage() {
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
      <CredentialStepper entityType="agent" current={2} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Insurance &amp; certification
        </h1>
        <p className="text-sm text-muted-foreground">
          Provide proof of Errors &amp; Omissions coverage and certify compliance with the NAR
          August 2024 settlement rules.
        </p>
      </header>

      <InsuranceCertForm
        entityType="agent"
        entity={agent}
        onDone={() => navigate({ to: "/agent/onboarding/compliance" })}
      />
    </div>
  );
}
