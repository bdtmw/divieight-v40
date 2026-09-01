import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, agentRedirect, AGENT_ROLE_LABELS, type AgentRow } from "@/lib/agent";

export const Route = createFileRoute("/agent/dashboard")({
  head: () => ({
    meta: [
      { title: "Agent overview — divieight Professional Portal" },
      {
        name: "description",
        content: "Your licensed-agent overview inside the divieight Professional Portal.",
      },
      { property: "og:title", content: "Agent overview — divieight" },
      {
        property: "og:description",
        content: "Track your credentialing progress in the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentDashboard,
});

function AgentDashboard() {
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

  if (!agent) return <p className="text-sm text-muted-foreground">Loading your profile…</p>;

  const onboardingComplete = agent.onboarding_status === "complete";

  return (
    <div className="space-y-8">
      <AgentPendingBanner agent={agent} onUpdated={setAgent} />


      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          {AGENT_ROLE_LABELS[agent.role]}
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Welcome, {agent.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Service area: {agent.service_area} · License {agent.license_number} (
          {agent.license_state})
        </p>
      </header>

      {!onboardingComplete ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Finish your credentialing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your profile is at status <span className="font-medium">{agent.onboarding_status}</span>
            . Complete every step before you can be tethered to a buyer pod.
          </p>
          <Link
            to={agentRedirect(agent.onboarding_status)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Continue onboarding
          </Link>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Credentialing complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You are eligible to be matched to buyer pods in {agent.service_area}.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Pod assignments, tethered buyers, and closing coordination tools arrive in the next
        release.
      </section>
    </div>
  );
}
