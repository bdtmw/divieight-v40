import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getBuyerAccount } from "@/lib/buyer";
import { getSellerAccount } from "@/lib/seller";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

// "List a Property" funnels sellers into the standard onboarding flow, starting
// at the Intent screen — the same entry point as "New listing" on the dashboard.
// Buyer accounts are blocked: one email = one role.
export const Route = createFileRoute("/listings/new")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    const [buyer, seller] = await Promise.all([
      getBuyerAccount(data.user.id),
      getSellerAccount(data.user.id),
    ]);
    if (buyer && !seller) {
      return { blocked: true as const };
    }
    throw redirect({ to: "/onboarding" });
  },
  component: BlockedForBuyers,
});

function BlockedForBuyers() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        Buyer accounts can't list properties
      </h1>
      <p className="mt-3 text-muted-foreground">
        You're signed in with a buyer account. Listing a property requires a seller account —
        one email can only be used for one role.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/buyer/dashboard">Go to buyer dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/properties">Browse properties</Link>
        </Button>
      </div>
    </main>
  );
}
