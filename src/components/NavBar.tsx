import { Link } from "@tanstack/react-router";
import { UserCircle2 } from "lucide-react";

export function NavBar() {
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
          <Link
            to="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:bg-secondary"
            aria-label="Profile menu"
          >
            <UserCircle2 className="h-5 w-5 text-muted-foreground" />
            <span className="hidden pr-1 text-xs font-medium sm:inline">Account</span>
          </button>
        </div>
      </div>
    </header>
  );
}
