import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "./notifications.functions";

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

  try {
    await sendNotificationEmail({ data: { kind } });
  } catch (e) {
    console.error("[notify] email failed", e);
  }
}
