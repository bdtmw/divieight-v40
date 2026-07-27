import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// "List a Property" funnels sellers into the standard onboarding flow, starting
// at the Intent screen — the same entry point as "New listing" on the dashboard.
export const Route = createFileRoute("/listings/new")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/onboarding" });
  },
});

