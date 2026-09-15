import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layers, MapPin, Users } from "lucide-react";
import { listAgentPools, type AgentPool } from "@/lib/agent-pools.functions";

/**
 * Agent Pool View — read-only aggregate only.
 *
 * Viewing this page has ZERO effect on Module 7 Selection Logic: there is no
 * action here that expresses interest, flags, favorites, or requests a buyer,
 * and nothing rendered can be traced back to an individual Buyer Account.
 * An agent's own tethered buyers are shown in full only on Verified leads.
 */

export const Route = createFileRoute("/agent/pools")({
  head: () => ({
    meta: [
      { title: "Market pools — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Aggregate view of verified buyer demand forming in the markets you are licensed and active in.",
      },
      { property: "og:title", content: "Market pools — divieight" },
      {
        property: "og:description",
        content: "See what's forming in your markets — aggregate figures only, no buyer identities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentPoolsPage,
});

function AgentPoolsPage() {
  const loadPools = useServerFn(listAgentPools);
  const [pools, setPools] = useState<AgentPool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadPools({})
      .then((rows) => {
        if (!cancelled) setPools(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPools]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
          <Layers className="h-4 w-4" /> Market pools
        </p>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          What's forming in your markets
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Aggregate demand only. Buyer identities, contact details, vetting and financial capacity
          are never shown here — your own tethered buyers appear in full under{" "}
          <Link to="/agent/leads" className="font-medium text-foreground underline">
            Verified leads
          </Link>
          .
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading market pools…</p>
      ) : pools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No verified buyer demand has formed yet in the markets on your licence.
        </div>
      ) : (
        <div className="space-y-6">
          {pools.map((pool) => (
            <section key={pool.market} className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {pool.market}
                </h2>
                {pool.myBuyerCount > 0 ? (
                  <Link
                    to="/agent/leads"
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {pool.myBuyerCount} of these {pool.myBuyerCount === 1 ? "buyer is" : "buyers are"}{" "}
                    yours — open My Buyers
                  </Link>
                ) : null}
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Verified buyer accounts" value={String(pool.verifiedBuyerCount)} />
                <Stat label="Budget range present" value={pool.budgetRangeLabel} />
                <Stat label="Personal use" value={String(pool.intentPersonalUse)} />
                <Stat label="Short-term rental" value={String(pool.intentShortTermRental)} />
              </dl>

              {pool.budgetBucketLabels.length > 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Budget bands represented: {pool.budgetBucketLabels.join(" · ")}
                </p>
              ) : null}

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <MapPin className="mr-1 inline h-3.5 w-3.5" /> Target zip codes
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {pool.zipCodes.length > 0 ? pool.zipCodes.join(", ") : "None declared"}
                </p>
              </div>

              {pool.properties.length > 0 ? (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Converging on
                  </p>
                  <ul className="mt-2 space-y-2">
                    {pool.properties.map((p) => (
                      <li
                        key={p.propertyId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm"
                      >
                        <span className="text-foreground">
                          {p.address}, {p.city} {p.state} {p.zip}
                        </span>
                        <span className="text-muted-foreground">
                          {p.remainingShares} of 8 shares unreserved
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <Users className="mr-1 inline h-3.5 w-3.5" /> Agent roster — active in this pool
                </p>
                {pool.roster.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No Resident Agents are active in this pool yet.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Agent</th>
                          <th className="py-2 pr-4 font-medium">Brokerage</th>
                          <th className="py-2 pr-4 font-medium">Broker of Record</th>
                          <th className="py-2 font-medium">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pool.roster.map((a) => (
                          <tr key={a.agentId} className="border-t border-border">
                            <td className="py-2 pr-4 text-foreground">
                              {a.fullName}
                              {a.isMe ? (
                                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                  You
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {a.brokerageName ?? "—"}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {a.brokerOfRecord ?? "—"}
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {a.contactEmail ? (
                                <a className="underline" href={`mailto:${a.contactEmail}`}>
                                  {a.contactEmail}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  This roster shows only who is active in the pool — never which agent represents
                  which buyer.
                </p>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}
