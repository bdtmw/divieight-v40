import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { cn } from "@/lib/utils";
import { notifySeller } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { markListingStep } from "@/lib/listing-progress";

export const Route = createFileRoute("/onboarding/agreement")({
  // Optional ?property=<id> scopes the agreement to one existing listing.
  validateSearch: (search: Record<string, unknown>) => ({
    property: typeof search.property === "string" ? search.property : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Seller agreement — divieight" },
      { name: "description", content: "Review and sign the divieight seller agreement." },
    ],
  }),
  component: AgreementScreen,
});

const DOCUMENT_VERSION = "v1";

type SellerRow = {
  id: string;
  full_name: string | null;
  exit_type: string | null;
  retained_shares: number | null;
};

type PropertyRow = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

function buildAgreement(seller: SellerRow | null, property: PropertyRow | null) {
  const name = seller?.full_name?.trim() || "Seller";
  const exit = seller?.exit_type;
  const retained = seller?.retained_shares ?? 0;
  const soldShares = exit === "hybrid_exit" ? 8 - retained : 8;
  const propertyLine = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
    : "the property described in your listing";

  const exitParagraph =
    exit === "hybrid_exit"
      ? `As a Hybrid Exit Seller, you have elected to sell ${soldShares} of 8 fractional shares (${soldShares}/8ths) of the Property and to retain ${retained} of 8 fractional shares (${retained}/8ths) as a continuing co-owner. Retained shares are subject to the divieight Co-Ownership Rules, including scheduled-use allocation, cost-sharing obligations, and the Right of First Refusal on any subsequent share transfer. Retained shares may not be re-listed on the marketplace for a period of ninety (90) days from the Effective Date without written consent of the Platform.`
      : `As a Full Exit Seller, you have elected to sell all 8 of 8 fractional shares (8/8ths) of the Property and to exit ownership in its entirety upon closing of the final share sale.`;

  return `LISTING AGREEMENT
Document Version: ${DOCUMENT_VERSION}
Effective Date: ${new Date().toLocaleDateString()}

BETWEEN: ${name} ("Seller")
AND: divieight, Inc. ("Platform")
RE: ${propertyLine} ("Property")

1. ENGAGEMENT AND ROLE OF THE PLATFORM
The Seller hereby engages divieight, Inc. as the exclusive marketplace administrator for the fractional listing and sale of undivided 1/8th ownership shares in the Property. The Platform acts as a technology-enabled marketplace and transaction coordinator. The Platform is not a licensed real estate broker in every jurisdiction and does not provide legal, tax, or investment advice. The Seller acknowledges that the Platform's role is limited to marketing, buyer matching, document coordination, and post-sale co-ownership administration.

2. EXIT ELECTION
${exitParagraph}

3. LISTING PRICE AND SHARE PRICING
The Property shall be listed at the Seller-selected total valuation. The per-share list price shall be computed as the total listing price divided by eight (8) and rounded to the nearest whole dollar. The Seller may adjust the listing price with seventy-two (72) hours' written notice, subject to any active offers.

4. TIMELINE AND EXCLUSIVITY
This Agreement grants divieight an exclusive listing period of one hundred eighty (180) days from the Effective Date. The Seller may not list the same Property, in whole or by fractional share, on any competing marketplace during the exclusivity period. Either party may terminate this Agreement with thirty (30) days' written notice after the initial ninety (90) day marketing window.

5. FEES AND DISBURSEMENT
The Platform shall charge a marketplace facilitation fee equal to a percentage of the gross proceeds from each share sold, as disclosed in the Seller Fee Schedule. Fees are deducted at closing of each share transaction and net proceeds are disbursed to the Seller within five (5) business days of settlement.

6. REPRESENTATIONS AND WARRANTIES
The Seller represents and warrants that (a) they are the record owner of the Property or the duly authorized agent thereof, (b) they have disclosed all known liens, easements, encumbrances, and covenants affecting the Property, and (c) all information provided to the Platform, including identity, ownership, and property details, is true and accurate to the best of their knowledge.

7. CO-OWNERSHIP GOVERNANCE
Upon closing of one or more fractional share sales, the Property shall be governed by the divieight Co-Ownership Operating Agreement, which shall be executed by all co-owners of record. This includes rules on scheduled use, shared expenses, capital improvements, dispute resolution, and voluntary or involuntary share transfers.

8. COMPLIANCE AND FAIR HOUSING
The Seller agrees to comply with all applicable federal, state, and local laws, including the Fair Housing Act. The Platform reserves the right to remove any listing that violates its Content and Compliance Policies.

9. LIMITATION OF LIABILITY
To the fullest extent permitted by law, the Platform's aggregate liability under this Agreement shall not exceed the total fees actually paid by the Seller to the Platform in the twelve (12) months preceding the event giving rise to the claim.

10. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement shall be governed by the laws of the State of Delaware, without regard to conflicts of law principles. Any dispute arising hereunder shall be resolved by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.

11. ELECTRONIC SIGNATURE
The Seller consents to conducting this transaction by electronic means and agrees that their typed full legal name, together with a timestamp and cryptographic record, constitutes a legally binding electronic signature under the E-SIGN Act and applicable state UETA statutes.

12. ENTIRE AGREEMENT
This Agreement constitutes the entire understanding of the parties with respect to the subject matter hereof and supersedes all prior agreements, whether written or oral.

BY SIGNING BELOW, THE SELLER ACKNOWLEDGES THAT THEY HAVE READ, UNDERSTOOD, AND AGREED TO THE TERMS OF THIS LISTING AGREEMENT.`;
}

// Simple deterministic hash placeholder (djb2). Replace with real digest later.
function hashDocument(text: string) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) & 0xffffffff;
  }
  return `djb2_${(hash >>> 0).toString(16)}_${text.length}`;
}

function AgreementScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { property: propertyParam } = Route.useSearch();
  const [seller, setSeller] = useState<SellerRow | null>(null);
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase
        .from("sellers")
        .select("id, full_name, exit_type, retained_shares")
        .eq("id", user.id)
        .maybeSingle();
      setSeller(s ?? null);
      setSignedName((s?.full_name ?? "").trim());

      let query = supabase
        .from("properties")
        .select("id, address, city, state, zip")
        .eq("seller_id", user.id);
      query = propertyParam
        ? query.eq("id", propertyParam)
        : query.order("created_at", { ascending: false }).limit(1);
      const { data: p } = await query.maybeSingle();
      setProperty(p ?? null);
    })();
  }, [user, propertyParam]);

  const agreement = useMemo(() => buildAgreement(seller, property), [seller, property]);
  const documentHash = useMemo(() => hashDocument(agreement), [agreement]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledEnd(true);
    }
  }

  async function handleConfirmSign() {
    if (!user || !seller) {
      toast.error("You need to be signed in.");
      return;
    }
    const typed = signedName.trim();
    if (typed.length < 3) {
      toast.error("Please type your full legal name.");
      return;
    }

    setSubmitting(true);

    let ip: string | null = null;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (res.ok) ip = (await res.json()).ip ?? null;
    } catch {
      ip = null;
    }

    const { error: signErr } = await supabase.from("signed_documents").insert({
      seller_id: user.id,
      document_type: "listing_agreement",
      document_version: DOCUMENT_VERSION,
      signed_name: typed,
      document_hash: documentHash,
      ip_address: ip,
      property_id: property?.id ?? null,
    });
    if (signErr) {
      setSubmitting(false);
      toast.error(signErr.message);
      return;
    }

    const { error: sellerErr } = await supabase
      .from("sellers")
      .update({ onboarding_status: "active" })
      .eq("id", user.id);
    if (sellerErr) {
      setSubmitting(false);
      toast.error(sellerErr.message);
      return;
    }

    if (property?.id) {
      // Signing no longer publishes. Content now routes through Gate 1
      // (Listing Agent approval) and Gate 2 (compliance) before going live.
      await markListingStep(property.id, "agreement");
      try {
        await submitListingForApproval({ data: { propertyId: property.id } });
      } catch (e) {
        console.error("[listing] submit for approval failed", e);
      }
    }

    await logAudit({
      actorId: user.id,
      actionType: "seller.listing_agreement_signed",
      entityType: "property",
      entityId: property?.id ?? null,
      metadata: {
        document_version: DOCUMENT_VERSION,
        document_hash: documentHash,
        signed_name: typed,
        ip_address: ip,
      },
    });

    setSubmitting(false);
    setModalOpen(false);
    setDone(true);
    toast.success("Your listing is live! Welcome to divieight.");
    setTimeout(() => navigate({ to: "/dashboard" }), 1600);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={6} />

      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Step 6 · Agreement
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Sign your listing agreement
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Review the full agreement. Scroll to the end to enable signing.
        </p>
      </div>

      {done ? (
        <div className="mt-10 rounded-xl border border-accent/40 bg-accent/10 p-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Your listing is live!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome to divieight. Redirecting you to your dashboard…
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Listing Agreement · {DOCUMENT_VERSION}
            </div>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-[440px] overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-serif"
            >
              {agreement}
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span>
                {scrolledEnd
                  ? "✓ You've reviewed the full document."
                  : "Scroll to the bottom to enable signing."}
              </span>
              <span className="font-mono">{documentHash.slice(0, 18)}…</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={!scrolledEnd || loading || !seller}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign Agreement
            </button>
            <p className="text-xs text-muted-foreground">
              By signing, you agree to the terms above and consent to electronic signature.
            </p>
          </div>
        </>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-4"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className={cn(
              "w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-semibold text-foreground">
              Confirm your signature
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Type your full legal name to sign the Listing Agreement. This creates a
              legally binding electronic signature.
            </p>
            <label className="mt-5 block text-sm font-medium text-foreground">
              Full legal name
            </label>
            <input
              type="text"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              placeholder="e.g. Jane A. Doe"
              className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background font-serif italic"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSign}
                disabled={submitting || signedName.trim().length < 3}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Signing…" : "Confirm & Sign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
