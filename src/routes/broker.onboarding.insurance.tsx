import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getBrokerProfile, type BrokerRow } from "@/lib/broker";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { InsuranceCertForm } from "@/components/credentialing/InsuranceCertForm";

export const Route = createFileRoute("/broker/onboarding/insurance")({
  head: () => ({
    meta: [
      { title: "Broker insurance & certification — divieight" },
      {
        name: "description",
        content:
          "Step 2 of divieight broker credentialing: E&O insurance and NAR settlement certification.",
      },
      { property: "og:title", content: "Broker insurance & certification — divieight" },
      {
        property: "og:description",
        content: "Submit firm E&O coverage proof and certify NAR settlement compliance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerInsurancePage,
});

function BrokerInsurancePage() {
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
      <CredentialStepper entityType="broker" current={2} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Insurance &amp; certification
        </h1>
        <p className="text-sm text-muted-foreground">
          Provide proof of Errors &amp; Omissions coverage for the brokerage and certify NAR
          August 2024 settlement compliance.
        </p>
      </header>

      <InsuranceCertForm
        entityType="broker"
        entity={broker}
        onDone={() => navigate({ to: "/broker/onboarding/compliance" })}
      />
    </div>
  );
}
