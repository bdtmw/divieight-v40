/**
 * E&O insurance expiry — pure helpers.
 *
 * Deliberately parallel to the NAR settlement certification clock in
 * `@/lib/agent-compliance`: coverage carries an expiry date, agents get
 * reminders at 60/30/7 days, and on expiry without renewed evidence the
 * agent lapses. The lapse reuses the existing `agents.transactions_held`
 * flag so in-flight transactions hold through the same mechanism.
 */

/** Default coverage term when a policy end date isn't supplied. */
export const EO_DEFAULT_TERM_DAYS = 365;

/** Days before expiry at which the agent is reminded. */
export const EO_REMINDER_DAYS = [60, 30, 7] as const;

export type EoReminderDay = (typeof EO_REMINDER_DAYS)[number];

/** The Broker of Record is copied at this mark. */
export const EO_BROKER_NOTICE_DAY: EoReminderDay = 30;

export const EO_LAPSED_MESSAGE =
  "Your E&O coverage has expired — upload renewed proof or have your broker affirm coverage to continue.";

export const EO_BLOCKED_MESSAGE =
  "This agent's E&O coverage has lapsed and must be restored before they can take on new work.";

/** Default expiry, one year out, for use when no policy date is given. */
export function defaultEoExpiry(from: Date | string = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + EO_DEFAULT_TERM_DAYS);
  return d.toISOString();
}

export function isEoExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function daysUntilEoExpiry(
  expiresAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

export interface EoReminderState {
  expiresAt: string | null;
  reminder60SentAt?: string | null;
  reminder30SentAt?: string | null;
  reminder7SentAt?: string | null;
}

/**
 * The reminder that is due right now, or null. Returns the nearest unsent
 * threshold so a sweep that missed a day still sends the right notice once.
 */
export function dueEoReminder(
  state: EoReminderState,
  now: Date = new Date(),
): EoReminderDay | null {
  const days = daysUntilEoExpiry(state.expiresAt, now);
  if (days === null || days < 0) return null;
  const sent: Record<EoReminderDay, string | null | undefined> = {
    60: state.reminder60SentAt,
    30: state.reminder30SentAt,
    7: state.reminder7SentAt,
  };
  for (const threshold of [7, 30, 60] as EoReminderDay[]) {
    if (days <= threshold && !sent[threshold]) return threshold;
  }
  return null;
}

export function eoReminderMessage(day: EoReminderDay): string {
  return `Your E&O coverage expires in ${day} day${day === 1 ? "" : "s"} — upload renewed proof or have your broker affirm coverage.`;
}

export function eoBrokerNoticeMessage(agentName: string, day: EoReminderDay): string {
  return `${agentName}'s E&O coverage expires in ${day} days. Renewed proof or your affirmation is needed before it lapses.`;
}

/** Agents with lapsed coverage cannot take new tethering or HLA work. */
export function eoBlocksNewWork(agent: {
  eo_lapsed?: boolean | null;
  eo_expires_at?: string | null;
}, now: Date = new Date()): boolean {
  return Boolean(agent.eo_lapsed) || isEoExpired(agent.eo_expires_at ?? null, now);
}
