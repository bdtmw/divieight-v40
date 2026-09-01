import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { logAudit } from "@/lib/audit";
import {
  getForcedOutcome,
  markLicenseNotFound,
  markLicensePending,
  markLicenseVerified,
  pingArello,
  setForcedOutcome,
  type ArelloOutcome,
  type ArelloResult,
} from "@/lib/arello";

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
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ArelloResult | null>(null);
  const [forced, setForced] = useState<ArelloOutcome | null>(null);
  const started = useRef(false);

  useEffect(() => {
    setForced(getForcedOutcome());
  }, []);

  const runCheck = useCallback(
    async (row: AgentRow, force?: ArelloOutcome | null) => {
      setChecking(true);
      setResult(null);
      const res = await pingArello(row.license_number, row.license_state, force);
      setResult(res);
      setChecking(false);

      if (res.outcome === "verified") {
        await markLicenseVerified(row.id);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: "agent",
          actionType: "agent.arello_check_verified",
          entityType: "agent",
          entityId: row.id,
          metadata: { license_number: res.licenseNumber, license_state: res.licenseState },
        });
      } else if (res.outcome === "not_found") {
        await markLicenseNotFound(row.id);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: "agent",
          actionType: "agent.arello_check_not_found",
          entityType: "agent",
          entityId: row.id,
          metadata: { license_number: res.licenseNumber, license_state: res.licenseState },
        });
      } else {
        await markLicensePending(row.id);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: "agent",
          actionType: "agent.arello_check_pending",
          entityType: "agent",
          entityId: row.id,
          metadata: { reason: "arello_unavailable" },
        });
      }
      const refreshed = await getAgentProfile(row.auth_user_id);
      if (refreshed) setAgent(refreshed);
    },
    [],
  );

  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (cancelled || !row) return;
      setAgent(row);
      if (row.license_verified) {
        setResult({
          outcome: "verified",
          licenseNumber: row.license_number,
          licenseState: row.license_state,
          licenseStatus: "Active — in good standing",
          checkedAt: row.license_verified_at ?? new Date().toISOString(),
          message: "License already verified against the ARELLO national registry.",
        });
        return;
      }
      void runCheck(row, getForcedOutcome());
    });
    return () => {
      cancelled = true;
    };
  }, [user, runCheck]);

  function chooseForced(outcome: ArelloOutcome | null) {
    setForced(outcome);
    setForcedOutcome(outcome);
  }

  return (
    <div className="space-y-8">
      <AgentOnboardingStepper current={1} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          License verification
        </h1>
        <p className="text-sm text-muted-foreground">
          We check your license in real time against the ARELLO national registry before you can
          be tethered to a buyer pod.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">License #</dt>
            <dd className="font-medium text-foreground">{agent?.license_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">State</dt>
            <dd className="font-medium text-foreground">{agent?.license_state ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
            <dd className="font-medium text-foreground">
              {agent?.onboarding_status ?? "arello_pending"}
            </dd>
          </div>
        </dl>
      </section>

      {checking ? (
        <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Contacting the ARELLO national registry…
        </section>
      ) : null}

      {!checking && result?.outcome === "verified" ? (
        <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold text-foreground">License verified</p>
              <p className="text-muted-foreground">{result.message}</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  License {result.licenseNumber} ({result.licenseState})
                </li>
                {result.licenseStatus ? <li>Registry status: {result.licenseStatus}</li> : null}
                {result.expiresOn ? <li>Expires: {result.expiresOn}</li> : null}
                <li>Checked: {new Date(result.checkedAt).toLocaleString()}</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate({ to: "/agent/onboarding/insurance" })}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Continue to insurance &amp; certification
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!checking && result?.outcome === "not_found" ? (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold text-foreground">
                We couldn&apos;t match this license
              </p>
              <p className="text-muted-foreground">{result.message}</p>
              <p className="text-muted-foreground">
                Check the license number and issuing state for typos, then run the check again.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/agent/onboarding/license-details" })}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Re-enter license details
                </button>
                <button
                  type="button"
                  onClick={() => agent && runCheck(agent, forced)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!checking && result?.outcome === "error" ? (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold text-foreground">
                Verification pending — registry unavailable
              </p>
              <p className="text-muted-foreground">{result.message}</p>
              <p className="text-muted-foreground">
                You can keep completing the rest of your profile. Only final activation (pod
                tethering) is held until verification clears.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/agent/onboarding/insurance" })}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Continue onboarding
                </button>
                <button
                  type="button"
                  onClick={() => agent && runCheck(agent, forced)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Retry now
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Dev-only outcome toggle — remove once the SourceRE integration is live. */}
      {import.meta.env.DEV ? (
        <section className="rounded-xl border border-dashed border-border p-4 text-xs">
          <p className="mb-2 flex items-center gap-2 font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Dev toggle — force the simulated ARELLO outcome
          </p>
          <div className="flex flex-wrap gap-2">
            {([null, "verified", "not_found", "error"] as const).map((o) => (
              <button
                key={String(o)}
                type="button"
                onClick={() => chooseForced(o)}
                className={`rounded-full border px-3 py-1 ${
                  forced === o
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {o ?? "random"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => agent && runCheck(agent, forced)}
              className="rounded-full border border-border px-3 py-1 text-foreground"
            >
              Re-run check
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
