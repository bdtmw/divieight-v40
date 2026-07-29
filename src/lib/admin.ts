import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Admin access is decided server-side by the `has_role` security-definer
 * function backed by the `user_roles` table. Never trust client storage.
 */
export function useAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    // Reset while re-checking so the gate waits instead of bouncing to /admin/login.
    setIsAdmin(null);
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("[admin] role check failed", error);
        setIsAdmin(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { user, loading: loading || isAdmin === null, isAdmin: isAdmin === true };
}

export function currency(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function money(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function when(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function StatusToneClass(status: string) {
  const s = status.toLowerCase();
  if (["active", "cleared", "listed", "succeeded", "paid", "resolved"].includes(s))
    return "bg-emerald-500/10 text-emerald-600";
  if (["archived", "failed", "flagged"].includes(s)) return "bg-destructive/10 text-destructive";
  if (["pending", "manual_review_pending", "in_progress", "new"].includes(s))
    return "bg-amber-500/10 text-amber-600";
  return "bg-muted text-muted-foreground";
}
