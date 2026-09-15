/**
 * Logging-integrity monitoring.
 *
 * This watches whether the platform's own record-keeping is still HAPPENING.
 * It never inspects what is inside a log entry — only how long it has been
 * since the most recent one arrived for each source. If a source goes quiet
 * longer than its configured cadence, an admin alert is raised.
 *
 * Cadences live in `platform_settings` (key below) so they are configurable
 * later without a deploy.
 */

export const LOGGING_HEALTH_SETTINGS_KEY = "logging_health_cadence";

export type LoggingSourceId = "audit_log" | "notifications" | "signed_documents";

export interface LoggingSourceSpec {
  id: LoggingSourceId;
  /** Table that physically holds the records. */
  table: string;
  /** Timestamp column to read the newest record from. */
  column: string;
  label: string;
  description: string;
}

export const LOGGING_SOURCES: LoggingSourceSpec[] = [
  {
    id: "audit_log",
    table: "audit_log",
    column: "created_at",
    label: "Audit vault",
    description: "Append-only audit_log entries across every module.",
  },
  {
    id: "notifications",
    table: "notifications",
    column: "created_at",
    label: "Email / notification sends",
    description: "Notification records written whenever the platform contacts a participant.",
  },
  {
    id: "signed_documents",
    table: "signed_documents",
    column: "created_at",
    label: "Document delivery",
    description: "signed_documents rows created when an agreement is executed.",
  },
];

/** Hours a source may stay silent before it counts as a gap. */
export type LoggingHealthSettings = Record<LoggingSourceId, number>;

export const DEFAULT_LOGGING_HEALTH_SETTINGS: LoggingHealthSettings = {
  // The audit vault touches nearly every action, so it should never be quiet
  // for a full business day.
  audit_log: 12,
  // Outbound contact is lumpier but still daily during normal operation.
  notifications: 24,
  // Signings are the least frequent of the three.
  signed_documents: 72,
};

export type LoggingSourceStatus = "ok" | "silent" | "never";

export interface LoggingSourceHealth {
  id: LoggingSourceId;
  label: string;
  description: string;
  expectedHours: number;
  lastSeenAt: string | null;
  silentHours: number | null;
  status: LoggingSourceStatus;
  /** Rough count of participants whose record-keeping this gap could touch. */
  affectedParticipants: number;
}

export interface LoggingHealthReport {
  checkedAt: string;
  settings: LoggingHealthSettings;
  sources: LoggingSourceHealth[];
  alerts: LoggingSourceHealth[];
}

export function hoursBetween(from: string, to: Date): number {
  return (to.getTime() - new Date(from).getTime()) / 3_600_000;
}

export function evaluateSource(params: {
  spec: LoggingSourceSpec;
  expectedHours: number;
  lastSeenAt: string | null;
  affectedParticipants: number;
  now: Date;
}): LoggingSourceHealth {
  const { spec, expectedHours, lastSeenAt, affectedParticipants, now } = params;
  const silentHours = lastSeenAt === null ? null : Math.max(0, hoursBetween(lastSeenAt, now));
  const status: LoggingSourceStatus =
    lastSeenAt === null ? "never" : silentHours! > expectedHours ? "silent" : "ok";
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    expectedHours,
    lastSeenAt,
    silentHours: silentHours === null ? null : Math.round(silentHours * 10) / 10,
    status,
    affectedParticipants,
  };
}

export function describeSilence(h: LoggingSourceHealth): string {
  if (h.status === "never") return "no records have ever been written";
  const hours = h.silentHours ?? 0;
  if (hours < 48) return `silent for ${hours.toFixed(1)}h`;
  return `silent for ${(hours / 24).toFixed(1)} days`;
}

export function alertMessage(h: LoggingSourceHealth): string {
  return `Logging integrity alert — ${h.label}: ${describeSilence(h)} (expected at least one record every ${h.expectedHours}h). Up to ${h.affectedParticipants} participant${h.affectedParticipants === 1 ? "" : "s"} may be affected.`;
}
