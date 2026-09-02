import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getBrokerProfile, type BrokerRow } from "@/lib/broker";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { LicenseCheckPanel } from "@/components/credentialing/LicenseCheckPanel";
import type { CredentialEntity } from "@/lib/credentialing";

export const Route = createFileRoute("/broker/onboarding/license-check")({
  head: () => ({
    meta: [
      { title: "Broker license verification — divieight" },
      {
        name: "description",
        content: "Step 1 of divieight broker credentialing: ARELLO license verification.",
      },
      { property: "og:title", content: "Broker license verification — divieight" },
      {
        property: "og:description",
        content: "Verify your broker license against the ARELLO national registry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerLicenseCheckPage,
});

function BrokerLicenseCheckPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [broker, setBroker] = useState<BrokerRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getBrokerProfile(user.id).then((row) => {
      if (!cancelled) setBroker(row);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-8">
      <CredentialStepper entityType="broker" current={1} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Broker license verification
        </h1>
        <p className="text-sm text-muted-foreground">
          We verify the Broker of Record license in real time against the ARELLO national registry.
        </p>
      </header>

      <LicenseCheckPanel
        entityType="broker"
        entity={broker}
        onEntityChange={(e) => setBroker(e as BrokerRow)}
        reload={async () =>
          user ? ((await getBrokerProfile(user.id)) as CredentialEntity | null) : null
        }
        onContinue={() => navigate({ to: "/broker/onboarding/insurance" })}
        onReenterDetails={() => navigate({ to: "/broker/onboarding/license-check" })}
      />
    </div>
  );
}
