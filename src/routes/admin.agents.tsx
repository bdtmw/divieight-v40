import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { when } from "@/lib/admin";
import { formatMarkets } from "@/lib/markets";

export const Route = createFileRoute("/admin/agents")({
  component: AdminAgents,
});

type AgentAdminRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_state: string | null;
  markets: string[] | null;
  broker_id: string | null;
  onboarding_status: string;
  license_verified: boolean | null;
  nar_cert_lapsed: boolean | null;
  relationship_status: string | null;
  transactions_held: boolean | null;
  created_at: string;
};

function AdminAgents() {
  const [rows, setRows] = useState<AgentAdminRow[]>([]);
  const [brokers, setBrokers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const db = supabase as unknown as { from: (t: string) => any };
      const { data, error: err } = await db
        .from("agents")
        .select(
          "id,full_name,email,phone,license_number,license_state,markets,broker_id,onboarding_status,license_verified,nar_cert_lapsed,relationship_status,transactions_held,created_at",
        )
        .order("created_at", { ascending: false });
      if (err) setError(err.message ?? "Could not load agents.");
      const list = (data as AgentAdminRow[] | null) ?? [];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.broker_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: bs } = await db
          .from("brokers")
          .select("id,brokerage_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        for (const b of (bs as { id: string; brokerage_name: string }[] | null) ?? []) {
          map[b.id] = b.brokerage_name;
        }
        setBrokers(map);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    return `${r.full_name} ${r.email ?? ""} ${r.license_number ?? ""} ${formatMarkets(r.markets)}`
      .toLowerCase()
      .includes(q.trim().toLowerCase());
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Agents
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length} registered agent{rows.length === 1 ? "" : "s"} with credentialing and
            Broker of Record standing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, license, market…"
            className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error} — run <code>admin-agents-visibility.sql</code> so admins can read the agents table.
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">Markets</th>
                <th className="px-4 py-3 text-left font-medium">License</th>
                <th className="px-4 py-3 text-left font-medium">Broker of Record</th>
                <th className="px-4 py-3 text-left font-medium">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium">Flags</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No agents found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground [overflow-wrap:anywhere]">
                        {r.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {r.email ?? "—"} · {r.phone ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {formatMarkets(r.markets)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">
                      {formatMarkets(r.markets)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-muted-foreground [overflow-wrap:anywhere]">
                        {r.license_number ?? "—"} {r.license_state ? `(${r.license_state})` : ""}
                      </div>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.license_verified
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {r.license_verified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">
                      {r.broker_id ? (brokers[r.broker_id] ?? "Linked") : "Not linked"}
                      {r.relationship_status && r.relationship_status !== "active" ? (
                        <div className="text-xs text-destructive">{r.relationship_status}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.onboarding_status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.nar_cert_lapsed ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                            NAR lapsed
                          </span>
                        ) : null}
                        {r.transactions_held ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                            Hold
                          </span>
                        ) : null}
                        {!r.nar_cert_lapsed && !r.transactions_held ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{when(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
