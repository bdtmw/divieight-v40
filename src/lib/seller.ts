import { supabase } from "@/integrations/supabase/client";

export interface SellerRow {
  id: string;
  onboarding_status: string;
}

/** Returns the seller profile for an auth user, or null if they aren't a seller. */
export async function getSellerAccount(userId: string): Promise<SellerRow | null> {
  const { data, error } = await supabase
    .from("sellers")
    .select("id, onboarding_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

/**
 * Google OAuth signups can't carry `account_type` metadata, so the database
 * trigger never fires for them. Create the seller profile client-side when a
 * seller signs in through OAuth for the first time.
 */
export async function ensureSellerAccount(params: {
  userId: string;
  email: string;
  phone?: string | null;
  fullName?: string | null;
}): Promise<SellerRow | null> {
  const existing = await getSellerAccount(params.userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("sellers")
    .insert({
      id: params.userId,
      email: params.email,
      phone: params.phone ?? null,
      full_name: params.fullName ?? "",
    })
    .select("id, onboarding_status")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
