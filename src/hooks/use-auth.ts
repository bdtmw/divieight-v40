import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Validate the stored session against the server. If the auth user was
        // deleted (e.g. test-data reset), drop the stale local session.
        const { data: verified, error } = await supabase.auth.getUser();
        if (error || !verified.user) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });


    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}
