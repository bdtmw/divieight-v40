import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { FileCheck2, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { AgentPendingBanner } from "@/components/AgentPendingBanner";
import { AgentCertLapsedBanner } from "@/components/AgentCertLapsedBanner";
import { logAudit } from "@/lib/audit";
import {
  NAR_CERT_TEXT,
  submitInsuranceAndCertification,
  uploadEoInsurance,
} from "@/lib/agent-compliance";

export const Route = createFileRoute("/agent/onboarding/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance & certification — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Step 2 of divieight agent credentialing: E&O insurance proof and NAR settlement certification.",
      },
      { property: "og:title", content: "Insurance & certification — divieight" },
      {
        property: "og:description",
        content:
          "Submit E&O insurance proof and certify NAR August 2024 settlement compliance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsurancePage,
});

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 10 * 1024 * 1024;

function InsurancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [brokerAffirmed, setBrokerAffirmed] = useState(false);
  const [narChecked, setNarChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (cancelled || !row) return;
      setAgent(row);
      setBrokerAffirmed(Boolean(row.eo_broker_affirmed));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!agent) return;
    setError(null);

    const hasExistingProof = Boolean(agent.eo_insurance_url) || Boolean(agent.eo_broker_affirmed);
    if (!brokerAffirmed && !file && !hasExistingProof) {
      setError(
        "Upload proof of E&O coverage, or check the broker affirmation box instead.",
      );
      return;
    }
    if (file && file.size > MAX_BYTES) {
      setError("That file is larger than 10 MB. Please upload a smaller copy.");
      return;
    }
    if (!narChecked) {
      setError("Please certify NAR settlement compliance to continue.");
      return;
    }

    setSubmitting(true);
    let uploadedPath: string | null = agent.eo_insurance_url;
    if (!brokerAffirmed && file && user) {
      const up = await uploadEoInsurance(user.id, file);
      if (up.error) {
        setSubmitting(false);
        setError(up.error);
        return;
      }
      uploadedPath = up.path ?? null;
    }

    const res = await submitInsuranceAndCertification({
      agentId: agent.id,
      eoInsurancePath: uploadedPath,
      brokerAffirmed,
    });
    if (res.error) {
      setSubmitting(false);
      setError(res.error);
      return;
    }

    await logAudit({
      actorId: agent.auth_user_id,
      actorType: "agent",
      actionType: "agent.eo_insurance_submitted",
      entityType: "agent",
      entityId: agent.id,
      metadata: { method: brokerAffirmed ? "broker_affirmation" : "document_upload" },
    });
    await logAudit({
      actorId: agent.auth_user_id,
      actorType: "agent",
      actionType: "agent.nar_cert_signed",
      entityType: "agent",
      entityId: agent.id,
      metadata: { certification: NAR_CERT_TEXT },
    });

    toast.success("Insurance and certification recorded.");
    navigate({ to: "/agent/onboarding/compliance" });
  }

  return (
    <div className="space-y-8">
      <AgentOnboardingStepper current={2} />

      {agent ? <AgentPendingBanner agent={agent} onUpdated={setAgent} /> : null}
      {agent ? <AgentCertLapsedBanner agent={agent} onUpdated={setAgent} /> : null}

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Insurance &amp; certification
        </h1>
        <p className="text-sm text-muted-foreground">
          Provide proof of Errors &amp; Omissions coverage and certify your compliance with the
          NAR August 2024 settlement rules.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Errors &amp; Omissions insurance
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload your current certificate of coverage (PDF or image, up to 10 MB).
                </p>
              </div>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm ${
                  brokerAffirmed ? "pointer-events-none opacity-50" : "hover:bg-secondary/50"
                }`}
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {file
                    ? file.name
                    : agent?.eo_insurance_url
                      ? "Certificate on file — upload a new one to replace it"
                      : "Choose a PDF or image file"}
                </span>
                <input
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  disabled={brokerAffirmed}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={brokerAffirmed}
                  onChange={(e) => setBrokerAffirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span className="text-foreground">
                  My broker affirms coverage on my behalf
                  <span className="block text-xs text-muted-foreground">
                    Permitted as an alternative to uploading a certificate. Your Broker of Record
                    remains responsible for the coverage attestation.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  NAR settlement certification
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This certification is valid for one year and must be renewed annually.
                </p>
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={narChecked}
                  onChange={(e) => setNarChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span className="text-foreground">{NAR_CERT_TEXT}</span>
              </label>
              {agent?.nar_cert_expires_at ? (
                <p className="text-xs text-muted-foreground">
                  Current certification expires{" "}
                  {new Date(agent.nar_cert_expires_at).toLocaleDateString()}.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !agent}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit &amp; continue
          </button>
          <p className="text-xs text-muted-foreground">
            Current status:{" "}
            <span className="font-medium text-foreground">
              {agent?.onboarding_status ?? "insurance_pending"}
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
