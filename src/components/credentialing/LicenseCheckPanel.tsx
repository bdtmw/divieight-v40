import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, Loader2, ShieldCheck, XCircle } from "lucide-react";
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
import type { CredentialEntity, EntityType } from "@/lib/credentialing";

/**
 * Shared ARELLO license verification panel — used by both the agent and the
 * Broker of Record onboarding wizards.
 */
export function LicenseCheckPanel({
  entityType,
  entity,
  onEntityChange,
  reload,
  onContinue,
  onReenterDetails,
}: {
  entityType: EntityType;
  entity: CredentialEntity | null;
  onEntityChange: (entity: CredentialEntity) => void;
  reload: () => Promise<CredentialEntity | null>;
  onContinue: () => void;
  onReenterDetails: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ArelloResult | null>(null);
  const [forced, setForced] = useState<ArelloOutcome | null>(null);
  const started = useRef(false);

  useEffect(() => {
    setForced(getForcedOutcome());
  }, []);

  const runCheck = useCallback(
    async (row: CredentialEntity, force?: ArelloOutcome | null) => {
      setChecking(true);
      setResult(null);
      const res = await pingArello(row.license_number, row.license_state, force);
      setResult(res);
      setChecking(false);

      if (res.outcome === "verified") {
        await markLicenseVerified(row.id, entityType);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: entityType === "broker" ? "broker" : "agent",
          actionType: "agent.arello_check_verified",
          entityType,
          entityId: row.id,
          metadata: { license_number: res.licenseNumber, license_state: res.licenseState },
        });
      } else if (res.outcome === "not_found") {
        await markLicenseNotFound(row.id, entityType);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: entityType === "broker" ? "broker" : "agent",
          actionType: "agent.arello_check_not_found",
          entityType,
          entityId: row.id,
          metadata: { license_number: res.licenseNumber, license_state: res.licenseState },
        });
      } else {
        await markLicensePending(row.id, entityType);
        await logAudit({
          actorId: row.auth_user_id,
          actorType: entityType === "broker" ? "broker" : "agent",
          actionType: "agent.arello_check_pending",
          entityType,
          entityId: row.id,
          metadata: { reason: "arello_unavailable" },
        });
      }
      const refreshed = await reload();
      if (refreshed) onEntityChange(refreshed);
    },
    [entityType, reload, onEntityChange],
  );

  useEffect(() => {
    if (!entity || started.current) return;
    started.current = true;
    if (entity.license_verified) {
      setResult({
        outcome: "verified",
        licenseNumber: entity.license_number,
        licenseState: entity.license_state,
        licenseStatus: "Active — in good standing",
        checkedAt: entity.license_verified_at ?? new Date().toISOString(),
        message: "License already verified against the ARELLO national registry.",
      });
      return;
    }
    void runCheck(entity, getForcedOutcome());
  }, [entity, runCheck]);

  function chooseForced(outcome: ArelloOutcome | null) {
    setForced(outcome);
    setForcedOutcome(outcome);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">License #</dt>
            <dd className="font-medium text-foreground">{entity?.license_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">State</dt>
            <dd className="font-medium text-foreground">{entity?.license_state ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
            <dd className="font-medium text-foreground">
              {entity?.onboarding_status ?? "arello_pending"}
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
                onClick={onContinue}
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
                  onClick={onReenterDetails}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Re-enter license details
                </button>
                <button
                  type="button"
                  onClick={() => entity && runCheck(entity, forced)}
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
                You can keep completing the rest of your profile. Only final activation is held
                until verification clears.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onContinue}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Continue anyway
                </button>
                <button
                  type="button"
                  onClick={() => entity && runCheck(entity, forced)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Retry now
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        <span className="mr-2 font-medium uppercase tracking-wider">Sandbox outcome</span>
        {(["verified", "not_found", "error", null] as const).map((o) => (
          <button
            key={String(o)}
            type="button"
            onClick={() => chooseForced(o)}
            className={`mr-2 rounded-full border px-3 py-1 ${
              forced === o ? "border-accent text-foreground" : "border-border"
            }`}
          >
            {o ?? "random"}
          </button>
        ))}
      </section>
    </div>
  );
}
