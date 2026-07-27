import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const ENROLLMENT_PRICE_ID = "platform_enrollment_share";
const PER_SHARE_CENTS = 257000;

type CheckoutResult = { clientSecret: string } | { error: string };
type ConfirmResult = { paid: boolean } | { error: string };

/**
 * Creates (or reuses) the Stripe customer for this seller so purchases stay
 * linked to the user across sessions.
 */
async function resolveCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { userId: string; email?: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createEnrollmentCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;

    const { data: seller } = await supabase
      .from("sellers")
      .select("email, exit_type, retained_shares")
      .eq("id", userId)
      .maybeSingle();

    const retained = seller?.retained_shares ?? 0;
    if (seller?.exit_type !== "hybrid_exit" || retained <= 1) {
      return { error: "No enrollment fee is due for this exit type." };
    }
    const quantity = retained - 1;

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [ENROLLMENT_PRICE_ID] });
      if (!prices.data.length) return { error: "Enrollment fee price not found." };
      const price = prices.data[0];

      const customerId = await resolveCustomer(stripe, {
        userId,
        email: seller?.email ?? undefined,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        // Stripe Tax is not configured for this account yet (prices have no
        // tax_behavior), which made the embedded checkout fail to render.
        billing_address_collection: "required",
        payment_intent_data: { description: "Platform Enrollment Fee" },
        metadata: {
          userId,
          retainedShares: String(retained),
          kind: "enrollment_fee",
        },
      });

      await supabase.from("enrollment_payments").insert({
        seller_id: userId,
        retained_shares: retained,
        amount_cents: quantity * PER_SHARE_CENTS,
        status: "pending",
        stripe_session_id: session.id,
        environment: data.environment,
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const confirmEnrollmentPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) throw new Error("Invalid sessionId");
    return data;
  })
  .handler(async ({ data, context }): Promise<ConfirmResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);

      if (session.metadata?.userId !== context.userId) {
        return { error: "This payment does not belong to your account." };
      }
      const paid = session.payment_status === "paid";
      if (!paid) return { paid: false };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("enrollment_payments")
        .update({ status: "paid" })
        .eq("stripe_session_id", session.id)
        .eq("seller_id", context.userId);

      return { paid: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
