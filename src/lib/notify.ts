import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "./notifications.functions";
import { logAudit } from "./audit";

type NotifyKind = "identity_submitted" | "listing_live" | "enrollment_fee_paid";

const MESSAGES: Record<NotifyKind, { message: string; type: string }> = {
  identity_submitted: {
    message: "Your identity verification was submitted.",
    type: "identity",
  },
  listing_live: {
    message: "Your property listing is now live.",
    type: "listing",
  },
  enrollment_fee_paid: {
    message: "Your Platform Enrollment Fee payment was successful.",
    type: "payment",
  },
};

export async function notifySeller(sellerId: string, kind: NotifyKind) {
  const { message, type } = MESSAGES[kind];
  const { error } = await supabase
    .from("notifications")
    .insert({ seller_id: sellerId, message, type });
  if (error) console.error("[notify] insert failed", error);

  // Payment success has no dedicated call site yet — audit it here so the
  // enrollment-fee flow is covered as soon as it starts calling notifySeller.
  if (kind === "enrollment_fee_paid") {
    await logAudit({
      actorId: sellerId,
      actionType: "seller.enrollment_fee_paid",
      entityType: "payment",
    });
  }

  try {
    await sendNotificationEmail({ data: { kind } });
  } catch (e) {
    console.error("[notify] email failed", e);
  }
}


type BuyerNotifyKind = "golden_ticket_issued";

const BUYER_MESSAGES: Record<BuyerNotifyKind, { message: string; type: string }> = {
  golden_ticket_issued: {
    message: "Your Golden Ticket is issued — you're a Vetted Buyer with full marketplace access.",
    type: "golden_ticket",
  },
};

/**
 * Buyer-scoped notification. The notifications table keys rows by the
 * authenticated user id (`seller_id`), and RLS scopes reads to auth.uid(),
 * so buyers reuse the same bell/dropdown surface as sellers.
 */
export async function notifyBuyer(authUserId: string, kind: BuyerNotifyKind) {
  const { message, type } = BUYER_MESSAGES[kind];
  const { error } = await supabase
    .from("notifications")
    .insert({ seller_id: authUserId, message, type });
  if (error) console.error("[notify] buyer insert failed", error);
}
