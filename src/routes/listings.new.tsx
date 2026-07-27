import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// The property intake flow lives inside /onboarding (property → listing → media
// → agreement). "List a Property" from the nav funnels sellers into that flow
// so there is only one path to create a listing — but only once signed in.
export const Route = createFileRoute("/listings/new")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: "/listings/new" } });
    }
    throw redirect({ to: "/onboarding/property" });
  },
});
