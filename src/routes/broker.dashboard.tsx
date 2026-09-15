import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Banknote, Building2, FileText, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getBrokerProfile, type BrokerRow } from "@/lib/broker";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { AgentBrokerLapsedBanner } from "@/components/AgentBrokerLapsedBanner";
import { TaxFormGateBanner } from "@/components/TaxFormGateBanner";
import { formatMarkets } from "@/lib/markets";

export const Route = createFileRoute("/broker/dashboard")({
  head: () => ({
    meta: [
      { title: "Broker dashboard — divieight" },
      {
        name: "description",
        content: "Broker of Record overview: credentials, supervised agents, banking and tax.",
      },
      { property: "og:title", content: "Broker dashboard — divieight" },
      {
        property: "og:description",
        content: "Manage your brokerage credentials and supervised agents on divieight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerDashboard,
});

interface LinkedAgent {
  id: string;
  full_name: string;
  role: string;
  onboarding_status: string;
  relationship_status: string | null;
}

function BrokerDashboard() {
  const { user } = useAuth();
  const [broker, setBroker] = useState<BrokerRow | null>(null);
  const [agents, setAgents] = useState<LinkedAgent[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getBrokerProfile(user.id).then(async (row) => {
      if (cancelled || !row) return;
      setBroker(row);
      const db = supabase as unknown as { from: (t: string) => any };
      const { data } = await db
        .from("agents")
        .select("id, full_name, role, onboarding_status, relationship_status")
        .eq("broker_id", row.id);
      if (!cancelled) setAgents((data as LinkedAgent[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isActive = broker?.onboarding_status === "active";

  const lapsedAgents = agents.filter(
    (a) => a.relationship_status && a.relationship_status !== "active",
  );

  return (
    <div className="space-y-8">
      {broker && !broker.tax_form_verified ? <TaxFormGateBanner /> : null}

      {lapsedAgents.map((a) => (
        <AgentBrokerLapsedBanner
          key={a.id}
          status={a.relationship_status}
          agentName={a.full_name}
          actionable={false}
        />
      ))}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {broker?.brokerage_name ?? "Broker of Record"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Commission for supervised agents is paid to this brokerage at closing by the title/escrow
          company from sale proceeds.
        </p>
      </header>

      {!isActive ? <CredentialStepper entityType="broker" current={4} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={BadgeCheck}
          label="License"
          value={broker?.license_verified ? "Verified" : "Pending"}
        />
        <Card
          icon={Building2}
          label="Status"
          value={broker?.onboarding_status ?? "—"}
        />
        <Card
          icon={Banknote}
          label="Payout account"
          value={
            broker?.bank_account_last4 ? `•••• ${broker.bank_account_last4}` : "Not provided"
          }
        />
        <Card
          icon={FileText}
          label="Tax form"
          value={
            broker?.tax_form_verified
              ? (broker?.w9_or_w8_type ?? "On file")
              : "Payout blocked"
          }
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">Supervised agents</h2>
        </div>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents are linked to this brokerage yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span className="font-medium text-foreground [overflow-wrap:anywhere]">
                  {a.full_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatMarkets((a as { markets?: unknown }).markets)} · {a.onboarding_status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-accent" />
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}
