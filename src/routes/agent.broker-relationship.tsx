import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { searchBrokers, type BrokerRow } from "@/lib/broker";
import {
  markRelationshipActive,
  markRelationshipLapsed,
  pingBrokerRelationship,
  RELATIONSHIP_STATUS_LABELS,
  type RelationshipCheck,
  type RelationshipStatus,
} from "@/lib/broker-relationship";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/agent/broker-relationship")({
  head: () => ({
    meta: [
      { title: "Broker relationship verification — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Re-verify your standing with your Broker of Record to release held divieight transactions.",
      },
      { property: "og:title", content: "Broker relationship verification — divieight" },
      {
        property: "og:description",
        content: "Re-confirm or change your Broker of Record on divieight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerRelationshipPage,
});

function BrokerRelationshipPage() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<BrokerRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [check, setCheck] = useState<RelationshipCheck | null>(null);

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
    let cancelled = false;
    const t = setTimeout(async () => {
      const rows = await searchBrokers(term);
      if (!cancelled) setResults(rows.filter((b) => b.onboarding_status === "active"));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  async function verifyWith(brokerId: string, brokerName: string) {
    if (!agent) return;
    setBusy(brokerId);
    setCheck(null);
    const result = await pingBrokerRelationship(brokerId);
    setCheck(result);

    if (result.outcome === "verified") {
      const { error } = await markRelationshipActive(agent.id, brokerId);
      if (error) {
        toast.error(error);
      } else {
        await logAudit({
          actorId: agent.auth_user_id,
          actorType: "agent",
          actionType: "agent.broker_relationship_verified",
          entityType: "agent",
          entityId: agent.id,
          metadata: { broker_id: brokerId, brokerage_name: brokerName },
        });
        const refreshed = await getAgentProfile(agent.auth_user_id);
        if (refreshed) setAgent(refreshed);
        toast.success(`Relationship with ${brokerName} re-verified.`);
      }
    } else if (result.outcome === "error") {
      toast.error(result.message);
    } else {
      await markRelationshipLapsed(agent.id, "lapsed");
      await logAudit({
        actorId: agent.auth_user_id,
        actorType: "agent",
        actionType: "agent.broker_relationship_lapsed",
        entityType: "agent",
        entityId: agent.id,
        metadata: { broker_id: brokerId, reason: result.outcome, source: "agent_resolution" },
      });
      const refreshed = await getAgentProfile(agent.auth_user_id);
      if (refreshed) setAgent(refreshed);
      toast.error(result.message);
    }
    setBusy(null);
  }

  if (!agent) return <p className="text-sm text-muted-foreground">Loading your profile…</p>;

  const status = (agent.relationship_status ?? "active") as RelationshipStatus;
  const lapsed = status !== "active";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Broker of Record
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Relationship verification
        </h1>
        <p className="text-sm text-muted-foreground">
          Your standing with your Broker of Record is re-verified against the ARELLO registry.
          While it is unverified, in-flight transactions involving you are held.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          {lapsed ? (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-accent" />
          )}
          <span className="font-semibold text-foreground">
            {RELATIONSHIP_STATUS_LABELS[status]}
          </span>
          {agent.transactions_held ? (
            <span className="rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
              Transactions held
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-muted-foreground">
          {agent.relationship_verified_at
            ? `Last verified ${new Date(agent.relationship_verified_at).toLocaleString()}.`
            : "This relationship has not been verified yet."}
        </p>
        {check ? <p className="mt-2 text-muted-foreground">{check.message}</p> : null}
      </section>

      {agent.broker_id ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Re-confirm current broker</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Still with the brokerage on file? Re-run the registry check.
          </p>
          <button
            type="button"
            onClick={() => verifyWith(agent.broker_id!, "your Broker of Record")}
            disabled={busy !== null}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy === agent.broker_id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Re-verify with current broker
          </button>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Select a different broker</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you have hung your license with another brokerage, select it below. Commission is
          always paid at closing to your Broker of Record by the title/escrow company.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search brokerages"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="mt-4 space-y-2">
          {results.length === 0 ? (
            <li className="text-sm text-muted-foreground">No active brokerages matched.</li>
          ) : (
            results.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-foreground [overflow-wrap:anywhere]">
                  <Building2 className="h-4 w-4 text-accent" />
                  {b.brokerage_name}
                </span>
                <button
                  type="button"
                  onClick={() => verifyWith(b.id, b.brokerage_name)}
                  disabled={busy !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-xs font-semibold text-foreground disabled:opacity-60"
                >
                  {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Verify &amp; link
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
