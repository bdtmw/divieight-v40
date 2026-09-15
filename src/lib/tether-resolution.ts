/**
 * Tether failure detection for the Buyer-Designated Agent flow.
 *
 * This layer never changes designation or acceptance behaviour — it only
 * decides when a silent or unreachable buyer must be surfaced to admins.
 */

/** Hours a buyer has to pick one of the three paths after the expiry notice. */
export const TETHER_RESPONSE_HOURS = 72;

/** Days in Pending Tether from Golden Ticket before the escalation alert. */
export const PENDING_TETHER_ALERT_DAYS = 14;

export type TetherResolutionReason = "undeliverable_notice" | "no_buyer_response";

export interface TetherResolutionInput {
  tetherStatus: string | null;
  designationExpired: boolean;
  designationExpiryNotifiedAt: string | null;
  designationNoticeDeliveryFailed: boolean;
  now?: Date;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Should this buyer carry the "awaiting tether resolution" flag? */
export function evaluateTetherResolution(
  input: TetherResolutionInput,
): { flagged: boolean; reason: TetherResolutionReason | null } {
  const now = input.now ?? new Date();
  if (input.tetherStatus === "tethered") return { flagged: false, reason: null };
  if (!input.designationExpired) return { flagged: false, reason: null };

  if (input.designationNoticeDeliveryFailed) {
    return { flagged: true, reason: "undeliverable_notice" };
  }

  const sent = input.designationExpiryNotifiedAt
    ? new Date(input.designationExpiryNotifiedAt).getTime()
    : null;
  if (sent !== null && now.getTime() - sent >= TETHER_RESPONSE_HOURS * HOUR) {
    return { flagged: true, reason: "no_buyer_response" };
  }

  return { flagged: false, reason: null };
}

/** Pending Tether for more than 14 days from Golden Ticket issuance. */
export function pendingTetherOverdue(
  tetherStatus: string | null,
  goldenTicketIssuedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (tetherStatus === "tethered") return false;
  if (!goldenTicketIssuedAt) return false;
  return now.getTime() - new Date(goldenTicketIssuedAt).getTime() > PENDING_TETHER_ALERT_DAYS * DAY;
}

export function elapsedSince(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const ms = now.getTime() - new Date(iso).getTime();
  if (ms < 0) return "—";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export const RESOLUTION_REASON_LABEL: Record<TetherResolutionReason, string> = {
  undeliverable_notice: "Notification could not be delivered",
  no_buyer_response: "No response within 72 hours of notification",
};
