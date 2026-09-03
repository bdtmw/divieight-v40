import { supabase } from "@/integrations/supabase/client";

// Append-only audit logger. Rows in `audit_log` cannot be updated or deleted:
// no UPDATE/DELETE RLS policies exist on the table, so the database itself
// enforces immutability for the authenticated role.
//
// PII Sub-Vault access controls (restricting sensitive fields like SSN, ID
// documents) will be implemented in Month 4 when compliance officer roles
// exist — for now, identity document URLs and personal data remain in the
// regular properties/sellers tables, not yet PII-segmented.

export type AuditAction =
  | "seller.registered"
  | "seller.identity_submitted"
  | "seller.property_created"
  | "seller.property_media_uploaded"
  | "seller.listing_agreement_signed"
  | "seller.enrollment_fee_paid"
  | "buyer.registered"
  | "buyer.identity_submitted"
  | "buyer.lifestyle_submitted"
  | "buyer.enrollment_fee_paid"
  | "buyer.pra_signed"
  | "buyer.background_check_completed"
  | "buyer.hold_harmless_signed"
  | "buyer.verification_requested"
  | "buyer.verification_documents_submitted"
  | "buyer.plaid_consent_given"
  | "buyer.liquidity_verified"
  | "buyer.liquidity_insufficient"
  | "buyer.liquidity_link_failed"
  | "buyer.liquidity_documents_submitted"
  | "buyer.fcra_adverse_action_issued"
  | "buyer.golden_ticket_issued"
  | "buyer.priority_forfeited"
  | "buyer.share_reserved"
  | "buyer.reservation_withdrawn"
  | "buyer.wishlist_added"
  | "buyer.wishlist_removed"
  | "buyer.perks_consent_given"
  | "buyer.perks_consent_declined"
  | "substitution.pipeline_opened"
  | "substitution.pipeline_viewed"
  | "buyer.data_room_document_viewed"
  | "seller.data_room_document_uploaded"
  | "seller.data_room_document_deleted"
  | "agent.arello_check_verified"
  | "agent.arello_check_not_found"
  | "agent.arello_check_pending"
  | "agent.arello_retry_verified"
  | "agent.eo_insurance_submitted"
  | "agent.nar_cert_signed"
  | "agent.nar_cert_lapsed"
  | "agent.nar_cert_recertified"
  | "agent.fincen_acknowledged"
  | "agent.ethics_acknowledged"
  | "agent.broker_relationship_lapsed"
  | "agent.broker_relationship_verified"
  | "broker.invitation_sent"
  | "broker.linked"
  | "broker.banking_saved"
  | "broker.onboarding_completed"
  | "agent.attribution_token_created"
  | "agent.attribution_token_clicked"
  | "buyer.referral_tagged"
  | "buyer.resident_agent_tethered"
  | "buyer.agent_designated"
  | "buyer.agent_designation_resent"
  | "buyer.agent_designation_expired"
  | "agent.designation_accepted"
  | "agent.designation_declined"
  | "agent.tether_accepted"
  | "agent.nar_referral_generated"
  | "agent.nar_referral_signed"
  | "agent.nar_referral_executed"
  | "agent.refer_only_elected";


export type AuditEntity =
  | "seller"
  | "property"
  | "payment"
  | "media"
  | "buyer_account"
  | "wishlist"
  | "property_document"
  | "agent"
  | "broker"
  | "referral_agreement"
  | "attribution_token";


export async function logAudit(params: {
  actorId: string;
  actionType: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  actorType?: "seller" | "buyer" | "agent";
  metadata?: Record<string, unknown>;
}) {
  const { actorId, actionType, entityType, entityId, actorType, metadata } = params;
  const { error } = await supabase.from("audit_log").insert({
    actor_id: actorId,
    actor_type: actorType ??
      (actionType.startsWith("buyer.")
        ? "buyer"
        : actionType.startsWith("agent.") || actionType.startsWith("broker.")
          ? "agent"
          : "seller"),
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: (metadata ?? {}) as never,
  });
  if (error) console.error("[audit] insert failed", error);
}


