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
  | "buyer.identity_submitted";

export type AuditEntity = "seller" | "property" | "payment" | "media" | "buyer_account";

export async function logAudit(params: {
  actorId: string;
  actionType: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  actorType?: "seller" | "buyer";
  metadata?: Record<string, unknown>;
}) {
  const { actorId, actionType, entityType, entityId, actorType, metadata } = params;
  const { error } = await supabase.from("audit_log").insert({
    actor_id: actorId,
    actor_type: actorType ?? (actionType.startsWith("buyer.") ? "buyer" : "seller"),
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: (metadata ?? {}) as never,
  });
  if (error) console.error("[audit] insert failed", error);
}


