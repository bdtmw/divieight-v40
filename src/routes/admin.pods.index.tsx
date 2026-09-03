import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Boxes } from "lucide-react";
import { listPods } from "@/lib/hla.functions";
import { HLA_STATUS_LABELS } from "@/lib/hla";
import { when, StatusToneClass } from "@/lib/admin";

export const Route = createFileRoute("/admin/pods/")({
  component: AdminPods,
});

function AdminPods() {
  const load = useServerFn(listPods);
  const { data: pods = [], isLoading } = useQuery({
    queryKey: ["admin-pods"],
    queryFn: () => load({}),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Pods &amp; Heavy Lifting Agents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A pod appears here once all eight shares are reserved (System-Lock), so the full
          roster of tethered Resident Agents is known before a Heavy Lifting Agent is chosen.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pods…</p>
      ) : pods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No pods have reached the selection trigger yet.
        </div>
      ) : (
        <div className="space-y-4">
          {pods.map((p) => (
            <section
              key={p.podId}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    <Boxes className="h-4 w-4" /> Pod
                  </p>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {p.address}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {p.city}, {p.state} {p.zip}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${StatusToneClass(
                      p.hlaStatus === "accepted" ? "active" : "pending",
                    )}`}
                  >
                    {HLA_STATUS_LABELS[p.hlaStatus]}
                  </span>
                  <p className="mt-2">{p.eligibleCount} eligible tethered agent(s)</p>
                  {p.heavyLifterName ? <p>Heavy Lifter: {p.heavyLifterName}</p> : null}
                  {p.acceptanceDeadlineAt ? (
                    <p>Responds by {when(p.acceptanceDeadlineAt)}</p>
                  ) : null}
                  {p.cycle > 0 ? <p>Selection cycle #{p.cycle}</p> : null}
                </div>
              </div>

              {p.hlaStatus === "accepted" ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Heavy Lifting Agent accepted {when(p.selectedAt)}.
                </p>
              ) : (
                <Link
                  to="/admin/pods/$id/select-heavy-lifter"
                  params={{ id: p.podId }}
                  className="mt-4 inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
                >
                  {p.hlaStatus === "awaiting_selection"
                    ? `Pod for ${p.address} is ready — select a Heavy Lifting Agent`
                    : "Review selection"}
                </Link>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
