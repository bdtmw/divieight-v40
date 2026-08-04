const clientToken = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? "pk_test_51Sk6tzGYrpmuz5ftEPPuTGl3Wh5oIeu551ifMjIRSvesdJWqTH7ARysZUZaDfbbrYfaEHYgairdsdnDilvjoaUcc00PKMNp7MB";

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Production checkout is not configured yet. Complete payments go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-sm text-accent">
        All payments made in the preview are in test mode.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Read more
        </a>
      </div>
    );
  }
  return null;
}
