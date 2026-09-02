import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Landmark, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";
import { logAudit } from "@/lib/audit";
import {
  ACKNOWLEDGMENT_TEXT,
  getAgentAcknowledgments,
  submitComplianceAcknowledgments,
  type AcknowledgmentType,
} from "@/lib/agent-acknowledgments";

export const Route = createFileRoute("/agent/onboarding/compliance")({
  head: () => ({
    meta: [
      { title: "FinCEN & ethics — divieight Professional Portal" },
      {
        name: "description",
        content: "Step 3 of divieight agent credentialing: FinCEN/AML and ethics acknowledgments.",
      },
      { property: "og:title", content: "FinCEN & ethics — divieight" },
      {
        property: "og:description",
        content: "Complete FinCEN/AML and ethics acknowledgments for the divieight Professional Portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

const ETHICS: { type: AcknowledgmentType; label: string }[] = [
  { type: "ethics_data_accuracy", label: "Data Accuracy" },
  { type: "ethics_non_solicitation", label: "Non-Solicitation" },
  { type: "ethics_designated_agent_responsiveness", label: "Designated-Agent Responsiveness" },
];

type CheckState = Record<AcknowledgmentType, boolean>;

const EMPTY: CheckState = {
  fincen_aml: false,
  ethics_data_accuracy: false,
  ethics_non_solicitation: false,
  ethics_designated_agent_responsiveness: false,
};

function CompliancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [checks, setChecks] = useState<CheckState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then(async (row) => {
      if (cancelled || !row) return;
      setAgent(row);
      const rows = await getAgentAcknowledgments(row.id);
      if (cancelled) return;
      setChecks((prev) => {
        const next = { ...prev };
        for (const r of rows) if (r.accepted) next[r.acknowledgment_type] = true;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggle(type: AcknowledgmentType) {
    setChecks((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  const allChecked =
    checks.fincen_aml &&
    checks.ethics_data_accuracy &&
    checks.ethics_non_solicitation &&
    checks.ethics_designated_agent_responsiveness;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!agent) return;
    setError(null);

    if (!checks.fincen_aml) {
      setError("Please acknowledge the FinCEN requirements to continue.");
      return;
    }
    if (!allChecked) {
      setError("Each ethics acknowledgment must be accepted individually.");
      return;
    }

    setSubmitting(true);
    const res = await submitComplianceAcknowledgments(agent.id);
    if (res.error) {
      setSubmitting(false);
      setError(res.error);
      return;
    }

    await logAudit({
      actorId: agent.auth_user_id,
      actorType: "agent",
      actionType: "agent.fincen_acknowledged",
      entityType: "agent",
      entityId: agent.id,
      metadata: { acknowledged_at: res.acceptedAt },
    });
    await logAudit({
      actorId: agent.auth_user_id,
      actorType: "agent",
      actionType: "agent.ethics_acknowledged",
      entityType: "agent",
      entityId: agent.id,
      metadata: {
        acknowledged_at: res.acceptedAt,
        acknowledgments: ETHICS.map((e) => e.type),
      },
    });

    toast.success("Compliance acknowledgments recorded.");
    navigate({ to: "/agent/onboarding/broker" });
  }

  return (
    <div className="space-y-8">
      <AgentOnboardingStepper current={3} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          FinCEN &amp; ethics compliance
        </h1>
        <p className="text-sm text-muted-foreground">
          Each acknowledgment below is recorded separately with its own timestamp against your
          agent record.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Landmark className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              FinCEN / AML acknowledgment
            </h2>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
              checked={checks.fincen_aml}
              onChange={() => toggle("fincen_aml")}
            />
            <span className="text-muted-foreground [overflow-wrap:anywhere]">
              {ACKNOWLEDGMENT_TEXT.fincen_aml}
            </span>
          </label>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <ScrollText className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Ethics &amp; interoperability
            </h2>
          </div>
          <div className="space-y-3">
            {ETHICS.map((item) => (
              <label
                key={item.type}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  checked={checks[item.type]}
                  onChange={() => toggle(item.type)}
                />
                <span className="space-y-1">
                  <span className="block font-medium text-foreground">{item.label}</span>
                  <span className="block text-muted-foreground [overflow-wrap:anywhere]">
                    {ACKNOWLEDGMENT_TEXT[item.type]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !agent}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue to broker link
        </button>
      </form>
    </div>
  );
}
