import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AUTHORIZATION_ACTION_LABELS,
  RECOMMENDATION_KINDS,
  authorizationStatusLabel,
  diffTerms,
  formatDeadline,
  recommendationLabel,
  type AuthorizationRequestRow,
  type RecommendationKind,
} from "@/lib/authorization";
import {
  listAgentAuthorizations,
  submitAgentRecommendation,
} from "@/lib/authorization.functions";

export const Route = createFileRoute("/agent/authorizations")({
  component: AgentAuthorizations,
});

type Row = AuthorizationRequestRow & { propertyLabel: string };

function AgentAuthorizations() {
  const load = useServerFn(listAgentAuthorizations);
  const submit = useServerFn(submitAgentRecommendation);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { kind: RecommendationKind; text: string }>>(
    {},
  );

  const refresh = useCallback(async () => {
    const result = await load({});
    setRows(result.rows as Row[]);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save(row: Row) {
    const entry = draft[row.id] ?? { kind: "no_recommendation" as RecommendationKind, text: "" };
    try {
      await submit({ data: { requestId: row.id, kind: entry.kind, text: entry.text } });
      toast.success("Recommendation recorded — your buyer can see it.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-foreground">
        Buyer authorization requests
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You're notified in parallel with your buyer. You may attach a recommendation, or note that
        you have none. Only the Buyer Account can authorize the action.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No authorization requests for your tethered buyers yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row) => {
            const entry = draft[row.id] ?? {
              kind: (row.recommendation_kind ?? "no_recommendation") as RecommendationKind,
              text: row.recommendation_text ?? "",
            };
            return (
              <li key={row.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {AUTHORIZATION_ACTION_LABELS[row.action_type]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.propertyLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Buyer deadline {formatDeadline(row.deadline_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground">
                    {authorizationStatusLabel(row)}
                  </span>
                </div>

                <dl className="mt-4 divide-y divide-border rounded-lg border border-border">
                  {diffTerms(row.terms ?? {}, row.prior_terms).map((line) => (
                    <div key={line.label} className="grid gap-1 px-3 py-2 sm:grid-cols-[180px_1fr]">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        {line.label}
                      </dt>
                      <dd className="text-sm text-foreground">
                        {line.kind === "changed" ? (
                          <>
                            <span className="text-muted-foreground line-through">
                              {line.priorValue}
                            </span>{" "}
                            <span className="font-medium">{line.value}</span>
                          </>
                        ) : (
                          (line.value ?? "—")
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 text-xs text-muted-foreground">
                  Current position: {recommendationLabel(row.recommendation_kind)}
                </p>

                {row.status === "pending" ? (
                  <div className="mt-3 space-y-3">
                    <select
                      value={entry.kind}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [row.id]: { ...entry, kind: e.target.value as RecommendationKind },
                        }))
                      }
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      {RECOMMENDATION_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={entry.text}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [row.id]: { ...entry, text: e.target.value } }))
                      }
                      rows={3}
                      placeholder="Optional note for your buyer"
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => save(row)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      Record recommendation
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
