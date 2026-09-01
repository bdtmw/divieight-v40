import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";

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
      <AgentOnboardingStepper current={1} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          License verification
        </h1>
        <p className="text-sm text-muted-foreground">
          We verify your license against the ARELLO national registry before you can be tethered
          to a buyer pod.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              Status: {agent?.onboarding_status ?? "arello_pending"}
            </p>
            <p className="text-muted-foreground">
              License on file: {agent ? `${agent.license_number} (${agent.license_state})` : "—"}
            </p>
            <p className="text-muted-foreground">
              The ARELLO verification workflow is enabled in the next release. Nothing is required
              from you right now.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
