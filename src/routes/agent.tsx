import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, LayoutDashboard, ListChecks, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow, AGENT_ROLE_LABELS } from "@/lib/agent";

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

const NAV = [
  { to: "/agent/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/agent/onboarding/license-check", label: "Onboarding", icon: ListChecks },
] as const;

const PUBLIC_PREFIXES = ["/agent/register", "/agent/login"];

function AgentPortalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [checking, setChecking] = useState(true);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setAgent(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    getAgentProfile(user.id).then((row) => {
      if (cancelled) return;
      setAgent(row);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
    if (isPublic || loading || checking) return;
    if (!user) {
      navigate({ to: "/agent/login", replace: true });
      return;
    }
    if (!agent) {
      toast.error("This area is for licensed agents on the divieight Professional Portal.");
      navigate({ to: "/agent/register", replace: true });
    }
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
            {NAV.map(({ to, label, icon: Icon }) => (
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
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {AGENT_ROLE_LABELS[agent.role]}
            </span>
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
