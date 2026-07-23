import { Link, useNavigate } from "@tanstack/react-router";
import { UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationsBell } from "./NotificationsBell";

export function NavBar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-display text-sm font-semibold tracking-tight">1/8</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            divieight
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Seller Dashboard
          </Link>
          <Link
            to="/listings/new"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            List a Property
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <NotificationsBell />
              <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
                {user.email}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <span className="hidden text-xs font-medium sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <UserCircle2 className="h-4 w-4" />
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
