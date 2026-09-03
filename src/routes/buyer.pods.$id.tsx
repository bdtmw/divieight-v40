import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Home, Users, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyPodDetails } from "@/lib/reservations.functions";
import { EightSlicesTracker } from "@/components/EightSlicesTracker";
import { ListingStatusTimeline, type ListingStatus } from "@/components/ListingStatusTimeline";

export const Route = createFileRoute("/buyer/pods/$id")({
  head: () => ({
    meta: [
      { title: "Pod details — divieight" },
      {
        name: "description",
        content:
          "Track your buyer pod: share fill, listing stage, your priority rank, and your tethered agent.",
      },
      { property: "og:title", content: "Pod details — divieight" },
      {
        property: "og:description",
        content: "Track your buyer pod's share fill, listing stage, and agent assignments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyerPodDetailsPage,
});

function money(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function BuyerPodDetailsPage() {
  const { id } = Route.useParams();
  const fetchPod = useServerFn(getMyPodDetails);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-pod", id, authUserId],
    enabled: !!authUserId,
    retry: false,
    queryFn: () => fetchPod({ data: { propertyId: id } }),
  });

  if (isLoading || !authUserId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground sm:px-6">
        Loading your pod…
      </div>
    );
  }

  if (!data || "error" in data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Pod unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(data && "error" in data && data.error) ||
            "We couldn't load this pod for your account."}
        </p>
        <Link
          to="/buyer/dashboard"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const pod = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        to="/buyer/dashboard"
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-4 grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-secondary">
          {pod.photoUrl ? (
            <img src={pod.photoUrl} alt={pod.address} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Home className="h-8 w-8 opacity-40" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            My pod
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">
            {pod.address}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pod.city}, {pod.state} {pod.zip}
            {pod.propertyType ? ` · ${pod.propertyType}` : ""}
          </p>
          <p className="mt-3 font-display text-xl font-semibold text-foreground">
            {money(pod.listingPrice)}
          </p>
          {pod.listingPrice ? (
            <p className="text-xs text-muted-foreground">
              {money(pod.listingPrice / 8)} per share
            </p>
          ) : null}
          <Link
            to="/properties/$id"
            params={{ id: pod.propertyId }}
            className="mt-4 inline-flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground"
          >
            View public listing
          </Link>
        </div>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Share fill</h2>
        <div className="mt-3">
          <EightSlicesTracker
            retainedShares={pod.composition.retainedShares}
            reservedShares={pod.composition.reservedShares}
          />
        </div>
        <div className="mt-5 border-t border-border pt-5">
          <ListingStatusTimeline
            status={(pod.composition.listingStatus as ListingStatus) ?? "forming"}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="My shares" value={String(pod.myShares)} hint={`Status: ${pod.myStatus}`} />
        <Stat
          label="Priority rank"
          value={pod.priorityRank != null ? `#${pod.priorityRank}` : "—"}
          hint={
            pod.priorityRankTimestamp
              ? new Date(pod.priorityRankTimestamp).toLocaleString()
              : undefined
          }
        />
        <Stat
          label="Reserved on"
          value={pod.myReservedAt ? new Date(pod.myReservedAt).toLocaleDateString() : "—"}
        />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Pod composition</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Other members are de-identified — only your own position is named.
        </p>
        <ul className="mt-4 space-y-2">
          {pod.members.map((m, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
            >
              <span className={m.isMine ? "font-semibold text-foreground" : "text-foreground"}>
                {m.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.shares} share{m.shares === 1 ? "" : "s"}
                {m.reservedAt ? ` · ${new Date(m.reservedAt).toLocaleDateString()}` : ""}
              </span>
            </li>
          ))}
          {pod.members.length === 0 ? (
            <li className="text-sm text-muted-foreground">No active reservations yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Representation</h2>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              My Resident Agent
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {pod.tetheredAgentName ?? "Not tethered yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              Heavy Lifting Agent
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {pod.heavyLiftingAgentName ??
                (pod.hlaStatus === "pending_acceptance"
                  ? "Selection pending acceptance"
                  : "Not selected yet")}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
