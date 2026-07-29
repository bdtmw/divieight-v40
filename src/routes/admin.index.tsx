import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/admin";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type Stats = {
  sellers: number;
  buyers: number;
  goldenTickets: number;
  properties: number;
  listed: number;
  contacts: number;
  revenueCents: number;
};

function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const count = { count: "exact" as const, head: true };
      const [sellers, buyers, tickets, properties, listed, contacts, sellerPay, buyerPay] =
        await Promise.all([
          supabase.from("sellers").select("id", count),
          supabase.from("buyer_accounts").select("id", count),
          supabase.from("buyer_accounts").select("id", count).eq("golden_ticket_issued", true),
          supabase.from("properties").select("id", count),
          supabase.from("properties").select("id", count).eq("status", "listed"),
          supabase.from("contact_submissions").select("id", count),
          supabase.from("enrollment_payments").select("amount_cents").eq("status", "paid"),
          supabase.from("buyer_enrollment_payments").select("amount_cents").eq("status", "paid"),
        ]);

      const sum = (rows: { amount_cents: number }[] | null) =>
        (rows ?? []).reduce((t, r) => t + (r.amount_cents ?? 0), 0);

      setStats({
        sellers: sellers.count ?? 0,
        buyers: buyers.count ?? 0,
        goldenTickets: tickets.count ?? 0,
        properties: properties.count ?? 0,
        listed: listed.count ?? 0,
        contacts: contacts.count ?? 0,
        revenueCents:
          sum(sellerPay.data as { amount_cents: number }[] | null) +
          sum(buyerPay.data as { amount_cents: number }[] | null),
      });
    })();
  }, []);

  const cards = [
    { label: "Sellers", value: stats?.sellers, to: "/admin/sellers" },
    { label: "Buyer accounts", value: stats?.buyers, to: "/admin/buyers" },
    { label: "Golden Tickets issued", value: stats?.goldenTickets, to: "/admin/buyers" },
    { label: "Properties", value: stats?.properties, to: "/admin/properties" },
    { label: "Live listings", value: stats?.listed, to: "/admin/properties" },
    { label: "Contact messages", value: stats?.contacts, to: "/admin/contacts" },
  ] as const;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Admin · Internal
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
        Platform overview
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Everything happening across the seller and buyer modules, in one place.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-foreground">
              {c.value ?? "—"}
            </p>
          </Link>
        ))}
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Enrollment fees collected
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-foreground">
            {stats ? currency(stats.revenueCents) : "—"}
          </p>
          <Link to="/admin/payments" className="mt-2 inline-block text-xs text-accent">
            View payments →
          </Link>
        </div>
      </div>
    </div>
  );
}
