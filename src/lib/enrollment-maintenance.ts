import { supabase } from "@/integrations/supabase/client";

/**
 * 30-Day Enrollment Maintenance.
 *
 * A buyer who has paid the Platform Enrollment Fee but has not yet been issued
 * a Golden Ticket must keep making progress. After STALL_DAYS of inactivity we
 * send a warning; if they stay inactive for GRACE_DAYS more, their priority
 * position is forfeited and the account is archived.
 */
export const STALL_DAYS = 30;
/** Configurable grace period after the warning before forfeiture. */
export const GRACE_DAYS = 7;

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface MaintenanceInput {
  goldenTicketIssued: boolean;
  onboardingStatus: string;
  paid: boolean;
  lastActivityAt: string | null;
  stallWarningSentAt: string | null;
  now?: number;
}

export type MaintenanceAction = "none" | "warn" | "forfeit";

/** Pure decision rule so it stays testable. */
export function evaluateMaintenance(input: MaintenanceInput): {
  action: MaintenanceAction;
  daysInactive: number;
  graceDaysLeft: number;
} {
  const now = input.now ?? Date.now();
  const last = input.lastActivityAt ? new Date(input.lastActivityAt).getTime() : now;
  const daysInactive = Math.floor((now - last) / DAY_MS);

  if (!input.paid || input.goldenTicketIssued || input.onboardingStatus === "archived") {
    return { action: "none", daysInactive, graceDaysLeft: GRACE_DAYS };
  }

  if (input.stallWarningSentAt) {
    const warned = new Date(input.stallWarningSentAt).getTime();
    const sinceWarning = Math.floor((now - warned) / DAY_MS);
    const graceDaysLeft = Math.max(0, GRACE_DAYS - sinceWarning);
    // Any onboarding action after the warning resets the clock.
    if (last > warned) return { action: "none", daysInactive, graceDaysLeft: GRACE_DAYS };
    return { action: graceDaysLeft === 0 ? "forfeit" : "none", daysInactive, graceDaysLeft };
  }

  return {
    action: daysInactive >= STALL_DAYS ? "warn" : "none",
    daysInactive,
    graceDaysLeft: GRACE_DAYS,
  };
}

/**
 * Stamp buyer activity. Call from any buyer onboarding action so the
 * maintenance job can tell an active enrollment from a stalled one.
 * Re-activating an archived account also clears the previous warning.
 */
export async function touchBuyerActivity(buyerAccountId: string) {
  const { error } = await supabase
    .from("buyer_accounts")
    .update({ last_activity_at: new Date().toISOString(), stall_warning_sent_at: null })
    .eq("id", buyerAccountId);
  if (error) console.error("[enrollment] activity touch failed", error);
}
