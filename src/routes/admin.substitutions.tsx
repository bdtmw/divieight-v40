import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users2 } from "lucide-react";
import { getSubstitutionVacancies } from "@/lib/substitution.functions";
import { money, when } from "@/lib/admin";

export const Route = createFileRoute("/admin/substitutions")({
  component: AdminSubstitutions,
});

function AdminSubstitutions() {
  const fetchVacancies = useServerFn(getSubstitutionVacancies);
  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ["admin-substitutions"],
    queryFn: () => fetchVacancies(),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Member Substitution Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vacated slices with compatible Golden Ticket buyers, ranked by priority timestamp
          (earliest first). The platform invites one candidate at a time and cascades
          automatically on decline or expiry. No agent can search or request a candidate.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading vacancies…</p>
      ) : vacancies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No open vacancies. Withdrawn or defaulted slices appear here automatically.
        </div>
      ) : (
        <div className="space-y-5">
          {vacancies.map((v) => (
            <section
              key={v.reservationId}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    Vacancy
                  </p>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {v.address}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {v.city}, {v.state} {v.zip}
                    {v.usageTag ? ` · ${v.usageTag.replace(/_/g, " ")}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Vacated {when(v.vacatedAt)}</p>
                  <p>{v.availableShares} of 8 slices open</p>
                  <p>{money(v.listingPrice)} list price</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                {v.invitation ? (
                  <>
                    Invitation #{v.invitation.sequence} · {v.invitation.status} · sent{" "}
                    {when(v.invitation.invitedAt)} · window {v.invitation.windowHours}h
                    {v.invitation.windowShortened ? " (shortened for closing date)" : ""} · closes{" "}
                    {when(v.invitation.expiresAt)} ·{" "}
                    {v.invitation.residentAgentNotified
                      ? "Resident Agent notified"
                      : "no tethered Resident Agent"}
                  </>
                ) : (
                  "No invitation dispatched yet."
                )}
              </div>

              <p className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground">
                <Users2 className="h-4 w-4 text-accent" />
                Top {v.candidates.length} compatible candidate
                {v.candidates.length === 1 ? "" : "s"}
              </p>

              {v.candidates.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No vetted buyer currently matches this market and usage type.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {v.candidates.map((c, i) => (
                    <li
                      key={c.buyerAccountId}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background p-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.primaryName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.email} · matched on {c.matchedOn.join(", ")}
                          {c.primaryTargetMarket ? ` · ${c.primaryTargetMarket}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {c.priorityRank != null ? `#${c.priorityRank}` : "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {when(c.priorityRankTimestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
