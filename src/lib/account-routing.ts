import { supabase } from "@/integrations/supabase/client";
import { buyerRedirect, ensureBuyerAccount, getBuyerAccount } from "@/lib/buyer";
import { ensureSellerAccount, getSellerAccount } from "@/lib/seller";
import { getPostLoginRedirect } from "@/lib/post-login";

export type AccountRole = "buyer" | "seller";

const ROLE_KEY = "divieight.oauth_role";

/** Remember which side of the marketplace started an OAuth flow (survives redirect). */
export function setOAuthRole(role: AccountRole) {
  try {
    sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    /* storage unavailable — callback falls back to existing account lookup */
  }
}

export function consumeOAuthRole(): AccountRole | null {
  try {
    const value = sessionStorage.getItem(ROLE_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    return value === "buyer" || value === "seller" ? value : null;
  } catch {
    return null;
  }
}

export interface ResolveResult {
  to?: string;
  error?: string;
}

/**
 * Decide where an authenticated user goes for the side of the marketplace they
 * signed in from, provisioning the missing profile for first-time OAuth users
 * and refusing cross-role signups (one email = one role).
 */
export async function resolveSignIn(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  role: AccountRole | null,
): Promise<ResolveResult> {
  const email = user.email ?? "";
  const fullName = (user.user_metadata?.full_name as string) ?? "";
  const phone = (user.user_metadata?.phone as string) ?? null;

  // The sessionStorage hint is lost when the user confirms via an email link in
  // a new tab, so fall back to the account_type captured at signup.
  const metaRole = user.user_metadata?.account_type;
  const effectiveRole: AccountRole | null =
    role ?? (metaRole === "buyer" || metaRole === "seller" ? metaRole : null);

  const [buyer, seller] = await Promise.all([
    getBuyerAccount(user.id),
    getSellerAccount(user.id),
  ]);

  if (effectiveRole === "buyer") {
    if (!buyer && seller) {
      await supabase.auth.signOut();
      return {
        error:
          "This email is already registered as a seller account. Please sign in as a seller instead.",
      };
    }
    const account = buyer ?? (await ensureBuyerAccount({ userId: user.id, email, phone, fullName }));
    return { to: account ? buyerRedirect(account.onboarding_status) : "/buyer/onboarding" };
  }

  if (effectiveRole === "seller") {
    if (!seller && buyer) {
      await supabase.auth.signOut();
      return {
        error:
          "This email is already registered as a buyer account. Please sign in as a buyer instead.",
      };
    }
    if (!seller) {
      await ensureSellerAccount({ userId: user.id, email, phone, fullName });
    }
    return { to: await getPostLoginRedirect(user.id) };
  }

  // No role hint at all — route by whichever profile exists.
  if (buyer) return { to: buyerRedirect(buyer.onboarding_status) };
  if (seller) return { to: await getPostLoginRedirect(user.id) };
  return { to: "/" };
}

