import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStepper, useIdentityDone } from "@/components/OnboardingStepper";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { EnrollmentCheckout } from "@/components/EnrollmentCheckout";
import {
  billableShares,
  enrollmentFeeCents,
  formatUsd,
  getStripeEnvironment,
  ENROLLMENT_FEE_CENTS_PER_SHARE,
} from "@/lib/stripe";
import { confirmEnrollmentPayment } from "@/utils/payments.functions";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/onboarding/fee")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Platform enrollment fee — divieight" },
      {
        name: "description",
        content:
          "Pay the one-time platform enrollment fee for the 1/8th shares you're retaining as a co-owner.",
      },
      { property: "og:title", content: "Platform enrollment fee — divieight" },
      {
        property: "og:description",
        content: "One-time enrollment fee for Hybrid Exit sellers retaining shares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeeScreen,
});

function FeeScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { session_id: sessionId } = Route.useSearch();
  const identityDone = useIdentityDone();

  const [retained, setRetained] = useState<number | null>(null);
  const [exitType, setExitType] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [paid, setPaid] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Load the seller's election and any existing unconsumed payment.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: seller } = await supabase
        .from("sellers")
        .select("exit_type, retained_shares")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setExitType(seller?.exit_type ?? null);
      setRetained(seller?.retained_shares ?? null);

      // The fee covers the listing currently being onboarded: a paid record
      // counts only if it was made after the seller's most recent property.
      const { data: lastProperty } = await supabase
        .from("properties")
        .select("created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let paidQuery = supabase
        .from("enrollment_payments")
        .select("id")
        .eq("seller_id", user.id)
        .eq("status", "paid");
      if (lastProperty?.created_at) {
        paidQuery = paidQuery.gt("created_at", lastProperty.created_at);
      }
      const { data: existing } = await paidQuery.limit(1);
      if (cancelled) return;
      if (existing && existing.length > 0) setPaid(true);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  // Returning from Stripe checkout — confirm and record the payment.
  useEffect(() => {
    if (!sessionId || !user) return;
    let cancelled = false;
    (async () => {
      const result = await confirmEnrollmentPayment({
        data: { sessionId, environment: getStripeEnvironment() },
      });
      if (cancelled) return;
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.paid) {
        setPaid(true);
        setShowCheckout(false);
        toast.success("Enrollment fee received.");
        void logAudit({
          actorId: user.id,
          actionType: "seller.enrollment_fee_paid",
          entityType: "payment",
          entityId: sessionId,
          metadata: { retained_shares: retained },
        });
      } else {
        toast.error("Payment was not completed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, retained]);

  const shares = billableShares(retained);
  const totalCents = enrollmentFeeCents(retained);
  const noFeeDue = !checking && (exitType !== "hybrid_exit" || shares === 0);

  function goNext() {
    navigate({ to: identityDone ? "/onboarding/property" : "/onboarding/identity" });
  }

  return (
    <div>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <OnboardingStepper current={1} />

        <div className="mt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Platform enrollment fee
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One-time fee for retained shares
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Hybrid Exit sellers pay a one-time enrollment fee for each retained
            1/8th share beyond the first.
          </p>
        </div>

        {checking ? (
          <div className="mt-10 h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
        ) : noFeeDue ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              No enrollment fee is due for your selection.
            </p>
            <button
              type="button"
              onClick={goNext}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Fee breakdown
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Shares retained</dt>
                  <dd className="font-medium text-foreground">{retained} / 8</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Billable shares (first is free)</dt>
                  <dd className="font-medium text-foreground">{shares}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Rate per share</dt>
                  <dd className="font-medium text-foreground">
                    {formatUsd(ENROLLMENT_FEE_CENTS_PER_SHARE)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <dt className="font-semibold text-foreground">Total due</dt>
                  <dd className="font-display text-xl font-semibold text-accent">
                    {formatUsd(totalCents)}
                  </dd>
                </div>
              </dl>
            </div>

            {paid ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-foreground">
                  Enrollment fee paid — {formatUsd(totalCents)}
                </p>
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Continue onboarding
                </button>
              </div>
            ) : showCheckout ? (
              <EnrollmentCheckout
                returnUrl={`${window.location.origin}/onboarding/fee?session_id={CHECKOUT_SESSION_ID}`}
              />
            ) : (
              <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input"
                  />
                  <span>
                    I understand this platform enrollment fee is{" "}
                    <strong>non-refundable</strong>.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={() => setShowCheckout(true)}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Pay {formatUsd(totalCents)} now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
