// Support Intake — shared constants and validation.
//
// `channel` exists on every ticket and defaults to "form". A future live-chat
// intake writes the same row shape with channel: "chat"; nothing here needs to
// change for that. No chat behaviour is built.

import { z } from "zod";

export const SUPPORT_CATEGORIES = [
  "Account Issue",
  "Payment Issue",
  "Technical Problem",
  "Verification or Documents",
  "General Question",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["new", "in_progress", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_ACK =
  "We've received your request and will respond soon.";

export const supportTicketSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  category: z.enum(SUPPORT_CATEGORIES),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the issue in at least 10 characters")
    .max(4000, "Description must be under 4000 characters"),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export interface SupportTicketRow {
  id: string;
  submitter_auth_user_id: string | null;
  submitter_name: string;
  submitter_email: string;
  category: string;
  description: string;
  channel: string;
  status: string;
  internal_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function statusLabel(status: string) {
  return status.replace("_", " ");
}
