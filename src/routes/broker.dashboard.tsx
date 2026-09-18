import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Banknote, Building2, FileText, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getBrokerProfile, type BrokerRow } from "@/lib/broker";
import { CredentialStepper } from "@/components/credentialing/CredentialStepper";
import { AgentBrokerLapsedBanner } from "@/components/AgentBrokerLapsedBanner";
import { TaxFormGateBanner } from "@/components/TaxFormGateBanner";
import { formatMarkets } from "@/lib/markets";
import {
  acceptLinkRequest,
  listPendingRequestsForBroker,
  rejectLinkRequest,
  type PendingRequestWithAgent,
} from "@/lib/broker-link-requests";
import { toast } from "sonner";

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
  const [requests, setRequests] = useState<PendingRequestWithAgent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

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
      if (cancelled) return;
      setAgents((data as LinkedAgent[]) ?? []);
      setRequests(await listPendingRequestsForBroker(row.id));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isActive = broker?.onboarding_status === "active";

  async function refresh(brokerId: string) {
    const db = supabase as unknown as { from: (t: string) => any };
    const { data } = await db
      .from("agents")
      .select("id, full_name, role, onboarding_status, relationship_status")
      .eq("broker_id", brokerId);
    setAgents((data as LinkedAgent[]) ?? []);
    setRequests(await listPendingRequestsForBroker(brokerId));
  }

  async function onDecide(req: PendingRequestWithAgent, accept: boolean) {
    if (!broker) return;
    setBusy(req.id);
    const target = {
      id: broker.id,
      auth_user_id: broker.auth_user_id,
      brokerage_name: broker.brokerage_name,
    };
    const res = accept
      ? await acceptLinkRequest(req, target)
      : await rejectLinkRequest(req, target);
    setBusy(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      accept
        ? `${req.agent?.full_name ?? "Agent"} is now one of your sponsored agents.`
        : "Request declined.",
    );
    await refresh(broker.id);
  }

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
          <UserPlus className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">Pending requests</h2>
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents are waiting on your approval right now.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-foreground [overflow-wrap:anywhere]">
                    {r.agent?.full_name ?? "Agent"}
                  </span>
                  <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    License {r.agent?.license_number ?? "—"} ({r.agent?.license_state ?? "—"})
                    {r.agent?.email ? ` · ${r.agent.email}` : ""}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {r.reason === "broker_change"
                      ? "Moving from another brokerage"
                      : "New agent registration"}{" "}
                    · requested {new Date(r.requested_at).toLocaleDateString()}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDecide(r, true)}
                    disabled={busy !== null}
                    className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecide(r, false)}
                    disabled={busy !== null}
                    className="inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground disabled:opacity-60"
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
