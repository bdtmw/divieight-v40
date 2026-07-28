import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, FileCheck2, Scale, ShieldCheck, ArrowRight } from "lucide-react";
import aboutHero from "@/assets/trust-band.jpg";
import aboutStory from "@/assets/about-story.jpg";
import teamImg from "@/assets/how-it-works.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About divieight — Fractional Second-Home Ownership" },
      {
        name: "description",
        content:
          "divieight makes second-home ownership accessible by dividing homes into eight equal shares with vetted co-owners and an automated legal structure.",
      },
      { property: "og:title", content: "About divieight — Fractional Second-Home Ownership" },
      {
        property: "og:description",
        content:
          "Our story, our values, and the team building a more accessible path to second-home ownership.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    icon: BadgeCheck,
    title: "Vetted Co-Owners",
    body: "Identity, funding, and disclosure checks run before anyone joins an ownership group — so every share is held by someone who cleared the same bar.",
  },
  {
    icon: Scale,
    title: "Automated Legal Structure",
    body: "Each property is held in its own purpose-built entity with standardized operating agreements generated directly from the listing.",
  },
  {
    icon: FileCheck2,
    title: "Transparent Commission System",
    body: "Fees, platform enrollment costs, and agent commissions are shown up front and calculated from the same numbers everyone sees.",
  },
  {
    icon: ShieldCheck,
    title: "SOC-2 Aligned Audit Trail",
    body: "Every meaningful action — identity submission, listing changes, signatures, payments — is written to an append-only record.",
  },
];

const team = [
  { name: "Amara Whitfield", role: "Co-Founder & CEO", initials: "AW" },
  { name: "Daniel Reyes", role: "Co-Founder & Head of Product", initials: "DR" },
  { name: "Priya Raman", role: "Head of Legal & Compliance", initials: "PR" },
  { name: "Marcus Hale", role: "Head of Real Estate Operations", initials: "MH" },
];

function AboutPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <img
          src={aboutHero}
          alt="Aerial view of a coastal neighborhood of second homes"
          width={1920}
          height={800}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-background/85" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Making second-home ownership reachable
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Most people don't need a whole second home. They need a few weeks a year in a place
            they love — without the full price tag, the empty months, or the maintenance
            headaches that come with sole ownership.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <img
            src={aboutStory}
            alt="Bright living room of a modern coastal co-owned home"
            loading="lazy"
            width={1280}
            height={960}
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[var(--shadow-elegant)]"
          />
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Our story
            </h2>
            <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                divieight began with a simple observation: fractional ownership has existed for
                decades, but it has always been slow, bespoke, and reserved for people with
                lawyers on retainer. Every deal was rebuilt from scratch — a new entity, a new
                agreement, a new set of assumptions about who pays for what.
              </p>
              <p>
                We set out to standardize it. A home is divided into eight equal shares. Each
                share carries the same rights, the same obligations, and the same documentation.
                Sellers can exit fully or retain shares and stay in the home. Buyers can own the
                portion they'll actually use.
              </p>
              <p>
                The result is a process that scales: one listing flow, one legal structure, one
                transparent record of every step from intent to closing. That's what makes
                fractional ownership something a normal household can actually do.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Why divieight
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          The team
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A small group from real estate, fintech, and compliance backgrounds.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m) => (
            <div
              key={m.name}
              className="rounded-xl border border-border bg-card p-6 text-center shadow-sm"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary font-display text-lg font-semibold text-accent">
                {m.initials}
              </div>
              <p className="mt-4 font-display text-sm font-semibold text-foreground">{m.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/30 py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
            Have a question for us?
          </h2>
          <Link
            to="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5"
          >
            Get in touch
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
