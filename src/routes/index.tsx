import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, PieChart, Landmark } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "divieight — Sell Your Home in 1/8th Shares" },
      {
        name: "description",
        content:
          "divieight helps homeowners list, manage, and sell their property as eight fractional co-ownership shares.",
      },
      { property: "og:title", content: "divieight — Sell Your Home in 1/8th Shares" },
      {
        property: "og:description",
        content:
          "divieight helps homeowners list, manage, and sell their property as eight fractional co-ownership shares.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* subtle background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] bg-gradient-to-b from-secondary/60 via-background to-background"
      />

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Fractional co-ownership, simplified
          </span>

          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Sell Your Home in{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-accent">1/8th Shares</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-2 rounded bg-accent/20"
              />
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Unlock the full value of your property without waiting for a single buyer. List
            once, sell eight fractional shares, and manage the entire process from a single
            seller dashboard.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/listings/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5"
            >
              List Your Property
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Go to Seller Dashboard
            </Link>
          </div>
        </div>

        {/* Value props */}
        <div className="mx-auto mt-24 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: PieChart,
              title: "Eight equal shares",
              body: "Divide your property into 1/8th ownership interests, each independently transferable.",
            },
            {
              icon: ShieldCheck,
              title: "Compliant by design",
              body: "Built-in KYC, disclosures, and title workflows keep every share sale on solid ground.",
            },
            {
              icon: Landmark,
              title: "Seller-first controls",
              body: "Track offers, share status, and closings from a single, professional dashboard.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
