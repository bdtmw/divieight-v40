import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, FileSignature, Layers, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import {
  getAgentOnboardingStatus,
  agentGuardRedirect,
  type AgentOnboardingStatus,
} from "@/lib/agent-onboarding-status";
import { AgentOnboardingProvider } from "@/hooks/use-agent-onboarding";
import { formatMarkets } from "@/lib/markets";
import { NotificationsBell } from "@/components/NotificationsBell";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Professional Portal — divieight" },
      {
        name: "description",
        content:
          "The divieight Professional Portal for licensed real estate agents and brokers.",
      },
      { property: "og:title", content: "Professional Portal — divieight" },
      {
        property: "og:description",
        content: "Licensed agent portal for divieight co-ownership transactions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentPortalLayout,
});

const BASE_NAV = [
  { to: "/agent/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/agent/leads", label: "Verified leads", icon: Users },
  { to: "/agent/pools", label: "Market pools", icon: Layers },
  { to: "/agent/attribution", label: "Referral links", icon: Share2 },
  { to: "/agent/documents", label: "Agreements", icon: FileSignature },
  { to: "/support", label: "Support", icon: LifeBuoy },
] as const;

/** Only Listing Agents see the listing dashboard / Gate 1 approval queue. */
const LISTING_NAV = { to: "/agent/listings", label: "My listings", icon: ListChecks } as const;

const ONBOARDING_NAV = {
  label: "Onboarding",
  icon: ListChecks,
} as const;


const PUBLIC_PREFIXES = ["/agent/register", "/agent/login"];

function AgentPortalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<AgentOnboardingStatus | null>(null);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setAgent(null);
      setStatus(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    // Re-check on navigation too: right after registration the profile row is
    // created a moment before we land on the first onboarding screen. The
    // onboarding status is re-read from the database on EVERY navigation, so
    // a typed URL, bookmark or back/forward cannot bypass the guard.
    getAgentProfile(user.id).then(async (row) => {
      if (cancelled) return;
      setAgent(row);
      const next = row ? await getAgentOnboardingStatus(row.id) : null;
      if (cancelled) return;
      setStatus(next);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading, pathname]);

  // Pin the agent to the first genuinely-incomplete onboarding step.
  useEffect(() => {
    if (isPublic || loading || checking || !agent || !status) return;
    const target = agentGuardRedirect(status, pathname);
    if (target && target !== pathname) navigate({ to: target, replace: true });
  }, [isPublic, loading, checking, agent, status, pathname, navigate]);



  useEffect(() => {
    if (isPublic || loading || checking) return;
    if (!user) {
      navigate({ to: "/agent/login", replace: true });
      return;
    }
    if (agent) return;
    // Give the just-created profile one more chance before bouncing out.
    let cancelled = false;
    const t = setTimeout(() => {
      getAgentProfile(user.id).then((row) => {
        if (cancelled) return;
        if (row) {
          setAgent(row);
          return;
        }
        toast.error("This area is for licensed agents on the divieight Professional Portal.");
        navigate({ to: "/agent/register", replace: true });
      });
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isPublic, loading, checking, user, agent, navigate]);


  async function onSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/agent/login" });
  }

  if (isPublic) return <Outlet />;

  if (loading || checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Checking professional access…
      </div>
    );
  }

  if (!user || !agent) return null;

  const onboardingComplete = status?.complete ?? false;
  const pendingRedirect = status ? agentGuardRedirect(status, pathname) : null;
  // Don't paint a page the guard is about to leave — no fake-complete content.
  const blocked = !!pendingRedirect && pendingRedirect !== pathname;
  const nextOnboardingPath = status?.firstIncomplete?.path ?? "/agent/dashboard";


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/agent/dashboard" className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-accent" />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
              Professional Portal
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {/* Until credentialing is genuinely complete the only portal
                destinations are Support and the onboarding wizard. */}
            {(onboardingComplete
              ? BASE_NAV
              : BASE_NAV.filter((n) => n.to === "/support")
            ).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {/* Listing Agent work is a per-property relationship, never a role. */}
            {onboardingComplete ? (
              <Link
                to={LISTING_NAV.to}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                <LISTING_NAV.icon className="h-4 w-4" />
                {LISTING_NAV.label}
              </Link>
            ) : null}
            {/* Onboarding tab disappears once credentialing is complete. */}
            {onboardingComplete ? null : (
              <Link
                to={nextOnboardingPath}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                <ONBOARDING_NAV.icon className="h-4 w-4" />
                {ONBOARDING_NAV.label}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {formatMarkets(agent.markets)}
            </span>
            <NotificationsBell />
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Agents are compensated solely through buyer-side commission paid at closing by their
        Broker of Record. divieight does not pay agents.
      </footer>
    </div>
  );
}
