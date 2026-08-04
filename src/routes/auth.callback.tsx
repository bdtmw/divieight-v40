import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { consumeOAuthRole, resolveSignIn } from "@/lib/account-routing";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    /** detectSessionInUrl exchanges the code asynchronously — poll briefly. */
    async function waitForSession() {
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session.user;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    }

    async function go() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") ?? params.get("error");
      if (oauthError) {
        toast.error(oauthError);
        navigate({ to: "/login" });
        return;
      }

      const user = await waitForSession();
      if (cancelled) return;
      if (!user) {
        toast.error("Google sign-in could not be completed. Please try again.");
        navigate({ to: "/login" });
        return;
      }
      const role = consumeOAuthRole();
      const outcome = await resolveSignIn(user, role);
      if (cancelled) return;
      if (outcome.error) {
        toast.error(outcome.error);
        navigate({ to: role === "buyer" ? "/buyer/login" : "/login" });
        return;
      }
      navigate({ to: outcome.to! });
    }
    go();
    return () => {
      cancelled = true;
    };
  }, [navigate]);


  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  );
}
