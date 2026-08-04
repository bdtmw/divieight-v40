import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

// BYOK Stripe: prefer your own publishable key, fall back to the managed token.
const clientToken =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined);

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Payments are not configured for this build. Add your Stripe publishable key to enable checkout.",
  );
}


let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** $2,570 per retained 1/8th share beyond the first. */
export const ENROLLMENT_FEE_CENTS_PER_SHARE = 257000;

export function billableShares(retainedShares: number | null | undefined): number {
  if (!retainedShares || retainedShares <= 1) return 0;
  return retainedShares - 1;
}

export function enrollmentFeeCents(retainedShares: number | null | undefined): number {
  return billableShares(retainedShares) * ENROLLMENT_FEE_CENTS_PER_SHARE;
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
