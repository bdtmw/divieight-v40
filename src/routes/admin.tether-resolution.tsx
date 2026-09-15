import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getTetherAlerts, runTetherAlertSweep, type TetherAlertRow } from "@/lib/tether-resolution.functions";
import {
  PENDING_TETHER_ALERT_DAYS,
  RESOLUTION_REASON_LABEL,
  TETHER_RESPONSE_HOURS,
  elapsedSince,
} from "@/lib/tether-resolution";
import { when } from "@/lib/admin";

export const Route = createFileRoute("/admin/tether-resolution")({
  component: AdminTetherResolution,
});

function AlertCard({ row, overdue }: { row: TetherAlertRow; overdue?: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            {overdue ? "Pending tether over 14 days" : "Awaiting tether resolution"}
          </p>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {row.buyerEmail ?? "Buyer"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {row.market ?? "No target market"} · status {row.tetherStatus ?? "pending"}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Golden Ticket {when(row.goldenTicketIssuedAt)}</p>
          <p>Elapsed {elapsedSince(row.goldenTicketIssuedAt)}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Designated agent</dt>
          <dd className="text-foreground">
            {row.designatedAgentName ?? row.designatedAgentEmail ?? "None on file"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Last successful contact
          </dt>
          <dd className="text-foreground">
            {row.lastSuccessfulContactAt ? when(row.lastSuccessfulContactAt) : "No successful contact recorded"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Notice sent</dt>
          <dd className="text-foreground">{row.notifiedAt ? when(row.notifiedAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reason</dt>
          <dd className="text-foreground">
            {overdue
              ? `In Pending Tether for more than ${PENDING_TETHER_ALERT_DAYS} days`
              : row.reason
                ? RESOLUTION_REASON_LABEL[row.reason]
                : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function AdminTetherResolution() {
  const fetchAlerts = useServerFn(getTetherAlerts);
  const sweep = useServerFn(runTetherAlertSweep);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-tether-alerts"],
    queryFn: () => fetchAlerts(),
  });

  const awaiting = data?.awaitingResolution ?? [];
  const overdue = data?.pendingOverdue ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Tether resolution alerts
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Buyers whose designated-agent window expired and who either could not be reached or did
            not choose a path within {TETHER_RESPONSE_HOURS} hours, plus any buyer still untethered{" "}
            {PENDING_TETHER_ALERT_DAYS} days after Golden Ticket. Buyers keep full marketplace
            browsing throughout — only property commitment waits on tethering.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await sweep();
            setBusy(false);
            toast.success(`Scanned ${r.scanned} · flagged ${r.flagged} · 14-day alerts ${r.overdue}`);
            void refetch();
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Run detection now
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading alerts…</p>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-accent" />
              Awaiting tether resolution ({awaiting.length})
            </h2>
            {awaiting.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No buyers are awaiting tether resolution.
              </div>
            ) : (
              <div className="space-y-4">
                {awaiting.map((r) => (
                  <AlertCard key={r.buyerAccountId} row={r} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Clock className="h-4 w-4 text-accent" />
              Pending Tether over {PENDING_TETHER_ALERT_DAYS} days ({overdue.length})
            </h2>
            {overdue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No overdue Pending Tether accounts.
              </div>
            ) : (
              <div className="space-y-4">
                {overdue.map((r) => (
                  <AlertCard key={r.buyerAccountId} row={r} overdue />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
