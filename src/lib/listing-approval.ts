/** Shared types + labels for Listing Agent tagging and the two publish gates. */

export type ContentItemType = "description" | "photo_caption" | "virtual_tour_narrative";

export type Disposition =
  | "pending"
  | "approved"
  | "approved_with_modification"
  | "rejected";

export const CONTENT_TYPE_LABELS: Record<ContentItemType, string> = {
  description: "Listing description",
  photo_caption: "Photo caption",
  virtual_tour_narrative: "Virtual tour narrative",
};

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  approved_with_modification: "Approved with modification",
  rejected: "Rejected",
};

export interface ContentItem {
  id: string;
  property_id: string;
  item_type: ContentItemType;
  label: string | null;
  original_content: string;
  revised_content: string | null;
  disposition: Disposition;
  reject_reason: string | null;
  agent_unavailable: boolean;
  decided_at: string | null;
  created_at: string;
  address?: string;
}

export interface ListingAgentProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  listing_status: string;
  listing_price: number | null;
  exit_type: string | null;
  retained_shares: number | null;
  content_approval_status: string;
  compliance_status: string;
  seller_name: string | null;
  reserved_shares: number;
  pending_items: number;
  pod_status: string | null;
  hla_status: string | null;
  closing_hold_active: boolean;
}

export interface ComplianceReview {
  id: string;
  property_id: string;
  address: string;
  flagged_phrases: string[];
  status: string;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  not_submitted: "Not submitted",
  pending: "Gate 1 — awaiting Listing Agent",
  changes_requested: "Gate 1 — changes requested",
  approved: "Gate 1 cleared",
};

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  not_started: "Gate 2 — not started",
  flagged: "Gate 2 — flagged for compliance",
  human_review: "Gate 2 — human review requested",
  denied: "Gate 2 — denied",
  cleared: "Gate 2 cleared",
};
