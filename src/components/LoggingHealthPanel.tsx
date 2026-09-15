import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { triggerLoggingHealthCheck } from "@/lib/logging-health.functions";
import { describeSilence, type LoggingHealthReport } from "@/lib/logging-health";
import { when } from "@/lib/admin";

/**
 * Logging-integrity panel. Shows, per source, when the last record arrived and
 * whether that is inside the expected cadence. Content of log entries is never
 * read — only recency.
 */
export function LoggingHealthPanel() {
  const run = useServerFn(triggerLoggingHealthCheck);
  const [report, setReport] = useState<LoggingHealthReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setError(null);
    try {
      setReport(await run({}));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Logging integrity</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Checks that the audit vault, notification sends and document deliveries are still being
            recorded at all. Quiet sources raise an admin alert.
          </p>
        </div>
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {busy ? "Checking…" : "Run check now"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {report && (
        <>
          <p className="mt-4 text-xs text-muted-foreground">Last checked {when(report.checkedAt)}</p>
          <ul className="mt-3 space-y-2">
            {report.sources.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Last record {s.lastSeenAt ? when(s.lastSeenAt) : "—"} · expected every{" "}
                    {s.expectedHours}h
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.status === "ok"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {s.status === "ok" ? "Recording" : describeSilence(s)}
                  </span>
                  {s.status !== "ok" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      up to {s.affectedParticipants} participant
                      {s.affectedParticipants === 1 ? "" : "s"} affected
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
