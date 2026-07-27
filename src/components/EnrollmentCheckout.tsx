import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createEnrollmentCheckout } from "@/utils/payments.functions";

export function EnrollmentCheckout({ returnUrl }: { returnUrl: string }) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createEnrollmentCheckout({
      data: { returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout could not be started.");
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="mt-6">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
