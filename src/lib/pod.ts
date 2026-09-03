export interface PodComposition {
  propertyId: string;
  totalShares: number;
  retainedShares: number;
  reservedShares: number;
  availableShares: number;
  hardLocked: boolean;
  listingStatus: string;
  /** Ordered slot map, 8 entries: seller-retained first, then reserved, then available. */
  slots: ("retained" | "reserved" | "available")[];
}

export interface ReservationEligibility {
  ok: boolean;
  reason:
    | "ok"
    | "no_buyer_account"
    | "not_liquidity_verified"
    | "not_found"
    | "sold_out"
    | "already_reserved";
  liquidityStatus: string | null;
  targetBudget: number | null;
  existingShares: number;
  composition: PodComposition | null;
}

export interface ReservationResult {
  ok: boolean;
  reason: ReservationEligibility["reason"] | "error";
  reservationId: string | null;
  composition: PodComposition | null;
  systemLocked: boolean;
}

export interface MyReservation {
  id: string;
  property_id: string;
  shares_reserved: number;
  status: string;
  reserved_at: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listing_price: number | null;
  listing_status: string;
}

export const RESERVATION_BLOCK_COPY: Record<
  Exclude<ReservationEligibility["reason"], "ok">,
  { title: string; body: string }
> = {
  no_buyer_account: {
    title: "Buyer account required",
    body: "Reservations are limited to enrolled divieight buyers. Create a buyer account to continue.",
  },
  not_liquidity_verified: {
    title: "Liquidity verification required",
    body: "Your funds haven't cleared the Liquidity Gate yet. Verified liquidity of at least 1.2× your target budget is required before you can hold a share.",
  },
  not_found: {
    title: "Listing unavailable",
    body: "This home isn't accepting reservations right now.",
  },
  sold_out: {
    title: "All eight shares are accounted for",
    body: "This pod is full and has moved into System Lock. Browse other homes to secure a rank.",
  },
  already_reserved: {
    title: "You already hold a share here",
    body: "Your reservation on this property is active — see it under My Reservations on your dashboard.",
  },
};

/** Buyer-facing pod detail view. Other members stay de-identified. */
export interface BuyerPodDetails {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listingPrice: number | null;
  propertyType: string | null;
  photoUrl: string | null;
  composition: PodComposition;
  myShares: number;
  myStatus: string;
  myReservedAt: string | null;
  priorityRank: number | null;
  priorityRankTimestamp: string | null;
  members: { label: string; shares: number; reservedAt: string | null; isMine: boolean }[];
  tetheredAgentName: string | null;
  heavyLiftingAgentName: string | null;
  hlaStatus: string | null;
}
