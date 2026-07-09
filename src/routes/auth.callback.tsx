import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPostLoginRedirect } from "@/lib/post-login";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function go() {
      // Wait a tick for supabase to hydrate the session from the URL hash.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session?.user) {
        navigate({ to: "/login" });
        return;
      }
      const to = await getPostLoginRedirect(data.session.user.id);
      navigate({ to });
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
