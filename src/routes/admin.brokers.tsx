import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { when } from "@/lib/admin";

export const Route = createFileRoute("/admin/brokers")({
  component: AdminBrokers,
});

type BrokerAdminRow = {
  id: string;
  brokerage_name: string;
  contact_name: string | null;
  email: string | null;
  onboarding_status: string;
  w9_or_w8_type: string | null;
  w9_or_w8_uploaded_at: string | null;
  tax_form_verified: boolean | null;
  created_at: string;
};

function AdminBrokers() {
  const [rows, setRows] = useState<BrokerAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  useEffect(() => {
    (async () => {
      const db = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await db
        .from("brokers")
        .select(
          "id,brokerage_name,contact_name,email,onboarding_status,w9_or_w8_type,w9_or_w8_uploaded_at,tax_form_verified,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setRows((data as BrokerAdminRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const matches = `${r.brokerage_name} ${r.contact_name ?? ""} ${r.email ?? ""}`
      .toLowerCase()
      .includes(q.trim().toLowerCase());
    return matches && (!onlyBlocked || !r.tax_form_verified);
  });

  const blockedCount = rows.filter((r) => !r.tax_form_verified).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Brokers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            W-9/W-8 status per Broker of Record. {blockedCount} brokerage
            {blockedCount === 1 ? "" : "s"} currently blocking commission payout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyBlocked}
              onChange={(e) => setOnlyBlocked(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Blocking payouts only
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brokerage, contact, email…"
            className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Brokerage</th>
                <th className="px-4 py-3 text-left font-medium">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium">Tax form</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th className="px-4 py-3 text-left font-medium">Payout gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No brokers found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground [overflow-wrap:anywhere]">
                        {r.brokerage_name}
                      </div>
                      <div className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {r.contact_name ?? "—"} · {r.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.onboarding_status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.w9_or_w8_type ?? "Not provided"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {when(r.w9_or_w8_uploaded_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          r.tax_form_verified
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {r.tax_form_verified ? "Cleared" : "Blocked"}
                      </span>
                    </td>
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
