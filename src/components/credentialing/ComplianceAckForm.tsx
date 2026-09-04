import { useEffect, useState, type FormEvent } from "react";
import { Landmark, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import {
  ACKNOWLEDGMENT_TEXT,
  getAgentAcknowledgments,
  submitComplianceAcknowledgments,
  type AcknowledgmentType,
} from "@/lib/agent-acknowledgments";
import type { CredentialEntity, EntityType } from "@/lib/credentialing";

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

/** Shared FinCEN/AML + Ethics & Interoperability acknowledgment step. */
export function ComplianceAckForm({
  entityType,
  entity,
  onDone,
  submitLabel,
}: {
  entityType: EntityType;
  entity: CredentialEntity | null;
  onDone: () => void;
  submitLabel: string;
}) {
  const [checks, setChecks] = useState<CheckState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entity) return;
    let cancelled = false;
    getAgentAcknowledgments(entity.id, entityType).then((rows) => {
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
  }, [entity, entityType]);

  function toggle(type: AcknowledgmentType) {
    setChecks((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  const allChecked = ETHICS.every((e) => checks[e.type]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!entity) return;
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
    const res = await submitComplianceAcknowledgments(entity.id, entityType);
    if (res.error) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    setSubmitting(false);

    await logAudit({
      actorId: entity.auth_user_id,
      actorType: entityType === "broker" ? "broker" : "agent",
      actionType: "agent.fincen_acknowledged",
      entityType,
      entityId: entity.id,
      metadata: { acknowledged_at: res.acceptedAt },
    });
    await logAudit({
      actorId: entity.auth_user_id,
      actorType: entityType === "broker" ? "broker" : "agent",
      actionType: "agent.ethics_acknowledged",
      entityType,
      entityId: entity.id,
      metadata: { acknowledged_at: res.acceptedAt, acknowledgments: ETHICS.map((e) => e.type) },
    });

    toast.success("Compliance acknowledgments recorded.");
    onDone();
  }

  return (
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
        disabled={submitting || !entity}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}
