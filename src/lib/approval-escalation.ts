/** Shared types for the Gate 1 approval-queue escalation timers. */

export interface EscalationSettings {
  first_reminder_hours: number;
  second_reminder_hours: number;
  stalled_hours: number;
}

export const DEFAULT_ESCALATION_SETTINGS: EscalationSettings = {
  first_reminder_hours: 72,
  second_reminder_hours: 120,
  stalled_hours: 168,
};

export const ESCALATION_SETTINGS_KEY = "listing_approval_escalation";

export interface StalledApprovalItem {
  id: string;
  property_id: string;
  address: string;
  item_type: string;
  label: string | null;
  queued_at: string;
  stalled_at: string | null;
  hours_waiting: number;
  reminder_first_sent_at: string | null;
  reminder_second_sent_at: string | null;
  listing_agent_name: string | null;
  broker_name: string | null;
  seller_id: string;
  seller_name: string | null;
  seller_email: string | null;
  seller_phone: string | null;
  seller_onboarding_status: string | null;
}
