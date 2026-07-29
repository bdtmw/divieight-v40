import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusToneClass, when } from "@/lib/admin";

export const Route = createFileRoute("/admin/sellers")({
  component: AdminSellers,
});

type SellerRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  onboarding_status: string;
  exit_type: string | null;
  retained_shares: number | null;
  created_at: string;
};

function AdminSellers() {
  const [rows, setRows] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id,email,full_name,phone,onboarding_status,exit_type,retained_shares,created_at")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setRows((data as SellerRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    `${r.email} ${r.full_name} ${r.phone ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Sellers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every seller account and where they are in onboarding.
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone…"
          className="h-10 w-72 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Seller</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium">Exit type</th>
                <th className="px-4 py-3 text-left font-medium">Retained</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No sellers found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${StatusToneClass(r.onboarding_status)}`}
                      >
                        {r.onboarding_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{r.exit_type ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {r.retained_shares != null ? `${r.retained_shares}/8` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{when(r.created_at)}</td>
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
