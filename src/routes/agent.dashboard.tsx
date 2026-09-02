import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, agentRedirect, AGENT_ROLE_LABELS, type AgentRow } from "@/lib/agent";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";
import { AgentBrokerLapsedBanner } from "@/components/AgentBrokerLapsedBanner";
import { getBrokerById, type BrokerRow } from "@/lib/broker";
import { Building2, PauseCircle, Share2 } from "lucide-react";

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
  const [broker, setBroker] = useState<BrokerRow | null>(null);

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

  useEffect(() => {
    if (!agent?.broker_id) {
      setBroker(null);
      return;
    }
    let cancelled = false;
    getBrokerById(agent.broker_id).then((row) => {
      if (!cancelled) setBroker(row);
    });
    return () => {
      cancelled = true;
    };
  }, [agent?.broker_id]);

  if (!agent) return <p className="text-sm text-muted-foreground">Loading your profile…</p>;

  const onboardingComplete =
    agent.onboarding_status === "complete" || agent.onboarding_status === "active";


  return (
    <div className="space-y-8">
      <AgentPendingBanner agent={agent} onUpdated={setAgent} />
      <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} />
      <AgentBrokerLapsedBanner status={agent.relationship_status} />

      <AgentActionItems />



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

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Broker of Record</h2>
        </div>
        {agent.broker_id ? (
          <>
            <p className="mt-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
              {broker?.brokerage_name ?? "Linked brokerage"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Standing: {agent.relationship_status ?? "active"}
              {agent.relationship_verified_at
                ? ` · verified ${new Date(agent.relationship_verified_at).toLocaleDateString()}`
                : ""}
            </p>
            <Link
              to="/agent/broker-relationship"
              className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground"
            >
              Manage relationship
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              No Broker of Record is linked to your profile yet.
            </p>
            <Link
              to="/agent/onboarding/broker"
              className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground"
            >
              Link a broker
            </Link>
          </>
        )}
      </section>


      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Share2 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Referral links & QR codes</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate shareable links and QR codes, then track clicks and how many buyers registered
          carrying your Lead Attribution Tag.
        </p>
        <Link
          to="/agent/attribution"
          className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground"
        >
          Manage attribution
        </Link>
      </section>

      <section className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          <span>In-flight transactions</span>
          {agent.nar_cert_lapsed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              <PauseCircle className="h-3.5 w-3.5" /> Hold — certification lapsed
            </span>
          ) : null}
          {agent.transactions_held ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              <PauseCircle className="h-3.5 w-3.5" /> Hold — broker relationship
            </span>
          ) : null}
        </div>
        <p className="mt-2">
          Pod assignments, tethered buyers, and closing coordination tools arrive in the next
          release.
        </p>
      </section>
    </div>
  );
}
