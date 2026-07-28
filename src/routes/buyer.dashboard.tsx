import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/buyer/dashboard")({
  head: () => ({
    meta: [
      { title: "Buyer dashboard — divieight" },
      {
        name: "description",
        content: "Track your Buyer Account, members, vetting status, and reserved shares.",
      },
      { property: "og:title", content: "Buyer dashboard — divieight" },
      {
        property: "og:description",
        content: "Track your Buyer Account, members, vetting status, and reserved shares.",
      },
    ],
  }),
  component: BuyerDashboardPage,
});

interface Member {
  id: string;
  full_name: string;
  role: string;
  vetting_status: string;
}

interface AccountView {
  id: string;
  email: string;
  phone: string | null;
  onboarding_status: string;
  intent: string | null;
  primary_target_market: string | null;
  golden_ticket_issued: boolean;
}

function BuyerDashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountView | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        navigate({ to: "/buyer/login" });
        return;
      }
      const { data: acct } = await supabase
        .from("buyer_accounts")
        .select(
          "id, email, phone, onboarding_status, intent, primary_target_market, golden_ticket_issued",
        )
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!acct) {
        navigate({ to: "/buyer/register" });
        return;
      }
      setAccount(acct as AccountView);

      const { data: mem } = await supabase
        .from("account_members")
        .select("id, full_name, role, vetting_status")
        .eq("buyer_account_id", acct.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMembers((mem as Member[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading || !account) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading your buyer dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Buyer Account
          </p>
          <h1 className="truncate font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {account.email}
          </h1>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Browse properties
        </Link>
      </header>
      {account.onboarding_status === "liquidity_pending" ? (
        <div className="mt-8 rounded-xl border border-accent/50 bg-accent/10 p-5">
          <p className="font-display text-base font-semibold text-foreground">
            Liquidity verification pending
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Golden Ticket is on hold until we verify your liquidity — link your bank via
            Plaid or submit proof of funds for Broker of Record review.
          </p>
          <Link
            to="/buyer/onboarding/liquidity"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Complete liquidity check
          </Link>
        </div>
      ) : null}
      {account.onboarding_status === "verification_pending" ? (
        <div className="mt-8 rounded-xl border border-accent/50 bg-accent/10 p-5">
          <p className="font-display text-base font-semibold text-foreground">
            Your account is under review
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We need additional information to verify your background check results. You can
            add more documents at any time.
          </p>
          <Link
            to="/buyer/verification"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Upload documents
          </Link>
        </div>
      ) : null}

      {account.onboarding_status === "adverse_action" ? (
        <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
          <p className="font-display text-base font-semibold text-foreground">
            Adverse action notice issued
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Buyer Account cannot proceed to reservations. Review the notice for your
            rights under the Fair Credit Reporting Act.
          </p>
          <Link
            to="/buyer/adverse-action"
            className="mt-4 inline-block rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            View notice
          </Link>
        </div>
      ) : null}


      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Onboarding" value={humanize(account.onboarding_status)} />
        <Stat label="Intent" value={account.intent ? humanize(account.intent) : "Not set"} />
        <Stat
          label="Golden ticket"
          value={account.golden_ticket_issued ? "Issued" : "Not issued"}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Account members
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({members.length} of 2)
          </span>
        </h2>
        <div className="mt-4 space-y-3">
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No members on this account yet.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.full_name || "Unnamed member"}
                  </p>
                  <p className="text-xs text-muted-foreground">{humanize(m.role)} member</p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  Vetting: {humanize(m.vetting_status)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
