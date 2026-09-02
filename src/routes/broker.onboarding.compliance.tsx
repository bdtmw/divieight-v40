import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getBrokerProfile, type BrokerRow } from "@/lib/broker";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { ComplianceAckForm } from "@/components/credentialing/ComplianceAckForm";

export const Route = createFileRoute("/broker/onboarding/compliance")({
  head: () => ({
    meta: [
      { title: "Broker FinCEN & ethics — divieight" },
      {
        name: "description",
        content: "Step 3 of divieight broker credentialing: FinCEN/AML and ethics acknowledgments.",
      },
      { property: "og:title", content: "Broker FinCEN & ethics — divieight" },
      {
        property: "og:description",
        content: "Complete FinCEN/AML and ethics acknowledgments for your brokerage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerCompliancePage,
});

function BrokerCompliancePage() {
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
      <CredentialStepper entityType="broker" current={3} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          FinCEN &amp; ethics acknowledgments
        </h1>
        <p className="text-sm text-muted-foreground">
          Each acknowledgment is recorded individually with its own timestamp.
        </p>
      </header>

      <ComplianceAckForm
        entityType="broker"
        entity={broker}
        submitLabel="Continue to banking &amp; tax"
        onDone={() => navigate({ to: "/broker/onboarding/banking" })}
      />
    </div>
  );
}
