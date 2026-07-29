import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  Handshake,
  KeyRound,
  Search,
  ShieldCheck,
} from "lucide-react";
import { EightSlicesTracker } from "@/components/EightSlicesTracker";
import { getFeaturedProperties } from "@/lib/public.functions";
import heroHome from "@/assets/hero-home.jpg";
import howItWorksImg from "@/assets/how-it-works.jpg";
import trustBand from "@/assets/trust-band.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "divieight — Own a Piece of Your Dream Home" },
      {
        name: "description",
        content:
          "Fractional second-home ownership in eight equal shares. Browse vetted properties, reserve your 1/8th share, or list your own home with divieight.",
      },
      { property: "og:title", content: "divieight — Own a Piece of Your Dream Home" },
      {
        property: "og:description",
        content:
          "Fractional second-home ownership in eight equal shares. Browse vetted properties or list your own home.",
      },
    ],
  }),
  component: LandingPage,
});

const steps = [
  {
    icon: Search,
    title: "Browse",
    body: "Explore vetted second homes offered in eight equal 1/8th ownership shares.",
  },
  {
    icon: BadgeCheck,
    title: "Get Vetted",
    body: "Complete identity and funding checks so every co-owner meets the same standard.",
  },
  {
    icon: Handshake,
    title: "Reserve Your Share",
    body: "Lock in your share while documents, disclosures, and title work are prepared.",
  },
  {
    icon: KeyRound,
    title: "Close & Co-Own",
    body: "Close into a purpose-built LLC and start scheduling your time in the home.",
  },
];

const trust = [
  { icon: BadgeCheck, title: "Vetted Buyers", body: "Every co-owner clears identity and funding review before closing." },
  { icon: ShieldCheck, title: "SOC-2 Aligned", body: "Append-only audit trail across every action in the platform." },
  { icon: Building2, title: "Delaware LLC Structure", body: "Each property is held in its own purpose-built ownership entity." },
  { icon: FileCheck2, title: "Automated Documents", body: "Agreements, disclosures, and signatures generated in-flow." },
];

function currency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function LandingPage() {
  const fetchFeatured = useServerFn(getFeaturedProperties);
  const { data: featured, isLoading } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: () => fetchFeatured(),
  });

  return (
    <div className="relative overflow-hidden">
      {/* Hero banner */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroHome}
          alt="Modern lakeside second home lit at golden hour"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/80 to-background/30"
        />

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Fractional co-ownership, simplified
            </span>

            <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Own a Piece of Your{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-accent">Dream Home</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 -z-0 h-2 rounded bg-accent/20"
                />
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              divieight divides a home into eight equal shares. Buy the 1/8th you'll actually
              use — or sell your property share by share — with vetted co-owners, automated
              legal structure, and a transparent record of every step.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                href="#featured"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5"
              >
                Browse Properties
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/listings/new"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                List Your Property
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-6">
              {[
                { k: "8", v: "Equal shares per home" },
                { k: "100%", v: "Vetted co-owners" },
                { k: "1 LLC", v: "Per property" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-semibold text-foreground">{s.k}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            <img
              src={howItWorksImg}
              alt="Buyer reviewing co-ownership documents with an advisor"
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
            />
            <div className="absolute -bottom-6 left-6 hidden rounded-xl border border-border bg-card p-5 shadow-sm sm:block">
              <p className="font-display text-2xl font-semibold text-accent">1/8</p>
              <p className="mt-1 text-xs text-muted-foreground">of a home, fully documented</p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Four steps from browsing to holding the keys.
            </p>

            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <li
                  key={title}
                  className="relative rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <span className="absolute right-4 top-4 text-xs font-semibold text-muted-foreground">
                    0{i + 1}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Featured properties */}
      <section id="featured" className="scroll-mt-20 bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Featured properties
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Recently listed homes with shares still available.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : (featured?.length ?? 0) === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <p className="text-sm font-medium text-foreground">No listings yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                New homes are added as sellers complete their listings. Be the first — list
                your property in eight shares.
              </p>
              <Link
                to="/listings/new"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                List Your Property
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured!.map((p) => {
                const perShare = p.listing_price ? Number(p.listing_price) / 8 : null;
                const retained =
                  p.exit_type === "hybrid_exit" ? (p.retained_shares ?? 0) : 0;
                return (
                  <article
                    key={p.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                  >
                    <div className="aspect-[4/3] w-full bg-secondary">
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={`${p.address}, ${p.city}, ${p.state}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Building2 className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="truncate font-display text-base font-semibold text-foreground">
                        {p.address}
                      </h3>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {p.city}, {p.state}
                      </p>
                      <p className="mt-4 text-sm text-muted-foreground">
                        <span className="text-lg font-semibold text-foreground">
                          {perShare ? currency(perShare) : "—"}
                        </span>{" "}
                        per 1/8th share
                      </p>
                      <div className="mt-4">
                        <EightSlicesTracker retainedShares={retained} compact />
                      </div>
                      <Link
                        to="/properties/$id"
                        params={{ id: p.id }}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        View listing
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust */}
      <section className="relative isolate overflow-hidden py-20">
        <img
          src={trustBand}
          alt="Aerial view of a coastal neighborhood of modern homes"
          loading="lazy"
          width={1920}
          height={800}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/90" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built to be trusted
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Co-ownership only works when the structure and the people are solid.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card/90 p-6 shadow-sm backdrop-blur"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
