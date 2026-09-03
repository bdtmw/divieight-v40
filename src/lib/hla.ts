/** Shared Heavy Lifting Agent types (client-safe). */

export type HlaStatus = "awaiting_selection" | "pending_acceptance" | "accepted" | "declined";

export const HLA_STATUS_LABELS: Record<HlaStatus, string> = {
  awaiting_selection: "Awaiting selection",
  pending_acceptance: "Pending agent acceptance",
  accepted: "Accepted",
  declined: "Declined",
};

/** 3 calendar days for the selected agent to accept or decline. */
export const HLA_ACCEPTANCE_WINDOW_DAYS = 3;

export interface EligibleAgent {
  agentId: string;
  fullName: string;
  licenseState: string;
  serviceArea: string;
  /** Platform tenure — informational only, never a formula input in Phase 1. */
  joinedAt: string;
  tenureDays: number;
  closedTransactions: number;
  brokerageName: string | null;
  buyersInPod: number;
}

export interface PodSummary {
  podId: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listingStatus: string;
  hlaStatus: HlaStatus;
  heavyLifterName: string | null;
  selectedAt: string | null;
  acceptanceDeadlineAt: string | null;
  eligibleCount: number;
  cycle: number;
}

export interface PodSelectionDetail extends PodSummary {
  eligible: EligibleAgent[];
  history: SelectionCycle[];
}

export interface SelectionCycle {
  id: string;
  cycle: number;
  agentName: string;
  brokerageName: string | null;
  selectionMethod: string;
  selectionBasis: string | null;
  selectedAt: string;
  outcome: string;
  outcomeAt: string | null;
}

export interface HlaInvitation {
  podId: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: HlaStatus;
  acceptanceDeadlineAt: string | null;
  selectionBasis: string | null;
  buyersInPod: number;
}

export interface BriefcaseBuyer {
  buyerAccountId: string;
  /** Deliberately de-identified: no email, phone, or document data. */
  displayLabel: string;
  sharesReserved: number;
  reservedAt: string;
  tetheredAgentName: string | null;
  isMine: boolean;
}

export interface BriefcaseMessage {
  id: string;
  authorLabel: string;
  body: string;
  createdAt: string;
}

export interface Briefcase {
  podId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  /** Broker Closing Hold state for this pod (see src/lib/closing-hold.ts). */
  closingHold: import("@/lib/closing-hold").ClosingHoldState;
  buyers: BriefcaseBuyer[];
  passiveAgents: { agentId: string; fullName: string }[];
  messages: BriefcaseMessage[];
}
