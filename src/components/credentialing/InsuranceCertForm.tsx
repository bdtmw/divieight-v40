import { useState, type FormEvent } from "react";
import { FileCheck2, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import {
  NAR_CERT_TEXT,
  submitInsuranceAndCertification,
  uploadEoInsurance,
} from "@/lib/agent-compliance";
import type { CredentialEntity, EntityType } from "@/lib/credentialing";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 10 * 1024 * 1024;

/** Shared E&O insurance + NAR settlement certification step. */
export function InsuranceCertForm({
  entityType,
  entity,
  onDone,
}: {
  entityType: EntityType;
  entity: CredentialEntity | null;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [brokerAffirmed, setBrokerAffirmed] = useState(false);
  const [eoExpiry, setEoExpiry] = useState("");
  const [narChecked, setNarChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const affirmationLabel =
    entityType === "broker"
      ? "My brokerage carries firm-level E&O coverage and I affirm it on the firm's behalf"
      : "My broker affirms coverage on my behalf";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!entity) return;
    setError(null);

    const hasExistingProof = Boolean(entity.eo_insurance_url) || Boolean(entity.eo_broker_affirmed);
    if (!brokerAffirmed && !file && !hasExistingProof) {
      setError("Upload proof of E&O coverage, or check the affirmation box instead.");
      return;
    }
    if (file && file.size > MAX_BYTES) {
      setError("File must be 10MB or smaller.");
      return;
    }
    if (!eoExpiry) {
      setError("Enter the date your E&O coverage expires.");
      return;
    }
    if (!narChecked) {
      setError("The NAR settlement certification is required to continue.");
      return;
    }

    setSubmitting(true);
    let path: string | null = entity.eo_insurance_url;
    if (!brokerAffirmed && file) {
      const uploaded = await uploadEoInsurance(entity.auth_user_id, file);
      if (uploaded.error) {
        setSubmitting(false);
        setError(uploaded.error);
        return;
      }
      path = uploaded.path ?? null;
    }

    const res = await submitInsuranceAndCertification({
      entityId: entity.id,
      entityType,
      eoInsurancePath: path,
      brokerAffirmed,
      eoExpiresAt: new Date(`${eoExpiry}T00:00:00`).toISOString(),
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    await logAudit({
      actorId: entity.auth_user_id,
      actorType: entityType === "broker" ? "broker" : "agent",
      actionType: "agent.eo_insurance_submitted",
      entityType,
      entityId: entity.id,
      metadata: {
        method: brokerAffirmed ? "broker_affirmation" : "document_upload",
        eo_expires_at: eoExpiry,
      },
    });
    await logAudit({
      actorId: entity.auth_user_id,
      actorType: entityType === "broker" ? "broker" : "agent",
      actionType: "agent.nar_cert_signed",
      entityType,
      entityId: entity.id,
      metadata: { certification: "NAR August 2024 settlement" },
    });

    toast.success("Insurance proof and certification recorded.");
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Errors &amp; Omissions insurance
          </h2>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Upload className="h-4 w-4 text-accent" />
          <span className="[overflow-wrap:anywhere]">
            {file ? file.name : "Upload proof of E&O coverage (PDF or image, max 10MB)"}
          </span>
          <input
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            disabled={brokerAffirmed}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
            checked={brokerAffirmed}
            onChange={() => {
              setBrokerAffirmed((v) => !v);
              setFile(null);
            }}
          />
          <span className="text-muted-foreground">{affirmationLabel}</span>
        </label>

        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Coverage expires on</span>
          <input
            type="date"
            required
            value={eoExpiry}
            onChange={(e) => setEoExpiry(e.target.value)}
            className="mt-2 h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
          <span className="mt-2 block text-xs text-muted-foreground">
            We remind you 60, 30 and 7 days before this date, and copy your Broker of Record at 30
            days. Coverage that expires without renewed evidence puts your work on hold.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            NAR settlement certification
          </h2>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
            checked={narChecked}
            onChange={() => setNarChecked((v) => !v)}
          />
          <span className="text-muted-foreground [overflow-wrap:anywhere]">{NAR_CERT_TEXT}</span>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          Certification is valid for one year and must be renewed before it lapses.
        </p>
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
        Continue to FinCEN &amp; ethics
      </button>
    </form>
  );
}
