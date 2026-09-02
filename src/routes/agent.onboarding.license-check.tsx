import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { LicenseCheckPanel } from "@/components/credentialing/LicenseCheckPanel";
import type { CredentialEntity } from "@/lib/credentialing";

export const Route = createFileRoute("/agent/onboarding/license-check")({
  head: () => ({
    meta: [
      { title: "License verification — divieight Professional Portal" },
      {
        name: "description",
        content: "Step 1 of divieight agent credentialing: ARELLO license verification.",
      },
      { property: "og:title", content: "License verification — divieight" },
      {
        property: "og:description",
        content: "Verify your real estate license to join the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LicenseCheckPage,
});

function LicenseCheckPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (!cancelled && row) setAgent(row);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-8">
      <CredentialStepper entityType="agent" current={1} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          License verification
        </h1>
        <p className="text-sm text-muted-foreground">
          We check your license in real time against the ARELLO national registry before you can
          be tethered to a buyer pod.
        </p>
      </header>

      <LicenseCheckPanel
        entityType="agent"
        entity={agent}
        onEntityChange={(e) => setAgent(e as AgentRow)}
        reload={async () =>
          user ? ((await getAgentProfile(user.id)) as CredentialEntity | null) : null
        }
        onContinue={() => navigate({ to: "/agent/onboarding/insurance" })}
        onReenterDetails={() => navigate({ to: "/agent/onboarding/license-details" })}
      />
    </div>
  );
}
