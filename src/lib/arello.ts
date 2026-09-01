import { supabase } from "@/integrations/supabase/client";

/**
 * ARELLO / SourceRE real-time license verification.
 *
 * TODO(SourceRE integration): replace `pingArello()` with a real call from a
 * server function (the JWT must never reach the browser):
 *
 *   POST https://api.sourcere.arello.com/v1/licensee/search
 *   Headers: Authorization: Bearer <SOURCERE_JWT>   (JWT Bearer Token auth)
 *            Content-Type: application/json
 *   Body:    { licenseNumber, state, searchMode: "test" }
 *            -> searchMode=test hits the SourceRE sandbox; switch to
 *               searchMode=live only after vendor certification.
 *   Rate limit: 5,000 requests/hour per token (per vendor doc). Back off on
 *   HTTP 429 and fall through to the 24-hour pending-retry path below.
 *
 * Until that integration exists, the call is simulated locally but the data
 * flow (statuses, persistence, audit logging, pending retry) is production-shaped.
 */

const db = supabase as unknown as { from: (table: string) => any };

export type ArelloOutcome = "verified" | "not_found" | "error";

export interface ArelloResult {
  outcome: ArelloOutcome;
  licenseNumber: string;
  licenseState: string;
  /** Present only when outcome === 'verified'. */
  licenseStatus?: string;
  expiresOn?: string;
  checkedAt: string;
  message: string;
}

const FORCE_KEY = "divieight.arello_force_outcome";

/** Dev toggle: force a specific outcome for the next check. */
export function setForcedOutcome(outcome: ArelloOutcome | null) {
  try {
    if (outcome) sessionStorage.setItem(FORCE_KEY, outcome);
    else sessionStorage.removeItem(FORCE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getForcedOutcome(): ArelloOutcome | null {
  try {
    const v = sessionStorage.getItem(FORCE_KEY);
    return v === "verified" || v === "not_found" || v === "error" ? v : null;
  } catch {
    return null;
  }
}

function randomOutcome(): ArelloOutcome {
  const roll = Math.random();
  if (roll < 0.7) return "verified";
  if (roll < 0.85) return "not_found";
  return "error";
}

/** Simulated ARELLO ping. Mirrors the shape of the real SourceRE response. */
export async function pingArello(
  licenseNumber: string,
  licenseState: string,
  forced?: ArelloOutcome | null,
): Promise<ArelloResult> {
  await new Promise((r) => setTimeout(r, 1400));
  const outcome = forced ?? randomOutcome();
  const checkedAt = new Date().toISOString();

  if (outcome === "verified") {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    return {
      outcome,
      licenseNumber,
      licenseState,
      licenseStatus: "Active — in good standing",
      expiresOn: expires.toISOString().slice(0, 10),
      checkedAt,
      message: "License matched the ARELLO national registry.",
    };
  }

  if (outcome === "not_found") {
    return {
      outcome,
      licenseNumber,
      licenseState,
      checkedAt,
      message:
        "No active licensee matched this license number in the selected state registry.",
    };
  }

  return {
    outcome,
    licenseNumber,
    licenseState,
    checkedAt,
    message: "The ARELLO registry did not respond. We'll keep retrying for 24 hours.",
  };
}

/** Persist a verified result and advance onboarding. */
export async function markLicenseVerified(agentId: string) {
  const now = new Date().toISOString();
  await db
    .from("agents")
    .update({
      license_verified: true,
      license_verified_at: now,
      arello_pending_since: null,
      onboarding_status: "insurance_pending",
    })
    .eq("id", agentId);
}

/** Persist the 24-hour pending fallback state (registry unavailable). */
export async function markLicensePending(agentId: string) {
  await db
    .from("agents")
    .update({
      onboarding_status: "arello_pending_retry",
      arello_pending_since: new Date().toISOString(),
    })
    .eq("id", agentId);
}

/** Persist a no-match result so the agent must correct their details. */
export async function markLicenseNotFound(agentId: string) {
  await db
    .from("agents")
    .update({ license_verified: false, onboarding_status: "arello_pending" })
    .eq("id", agentId);
}

export const PENDING_WINDOW_HOURS = 24;

export function pendingHoursLeft(pendingSince: string | null): number {
  if (!pendingSince) return PENDING_WINDOW_HOURS;
  const elapsed = (Date.now() - new Date(pendingSince).getTime()) / 3_600_000;
  return Math.max(0, Math.round((PENDING_WINDOW_HOURS - elapsed) * 10) / 10);
}
