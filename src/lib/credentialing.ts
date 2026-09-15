/**
 * Shared credentialing layer for licensed professionals.
 *
 * Agents and Brokers of Record go through the SAME verification steps
 * (ARELLO license lookup, E&O insurance, NAR certification, FinCEN/Ethics
 * acknowledgments). Every screen and helper below is parameterised by
 * `entityType` so both roles reuse one implementation.
 */

export type EntityType = "agent" | "broker";

export interface EntityConfig {
  /** Table holding the professional's profile. */
  table: string;
  /** Per-acknowledgment table. */
  ackTable: string;
  /** Foreign-key column in the acknowledgment table. */
  ackForeignKey: string;
  /** Route prefix for the onboarding wizard. */
  basePath: string;
  /** Stepper labels. */
  steps: readonly string[];
  /** onboarding_status after each shared step completes. */
  next: {
    afterLicense: string;
    afterInsurance: string;
    afterCompliance: string;
  };
  label: string;
}

export const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  agent: {
    table: "agents",
    ackTable: "agent_acknowledgments",
    ackForeignKey: "agent_id",
    basePath: "/agent/onboarding",
    steps: ["License", "Insurance/Cert", "FinCEN/Ethics", "Broker Link", "Complete"],
    next: {
      afterLicense: "insurance_pending",
      afterInsurance: "compliance_pending",
      afterCompliance: "broker_link_pending",
    },
    label: "Agent",
  },
  broker: {
    table: "brokers",
    ackTable: "broker_acknowledgments",
    ackForeignKey: "broker_id",
    basePath: "/broker/onboarding",
    steps: ["License", "Insurance/Cert", "FinCEN/Ethics", "Banking & Tax", "Complete"],
    next: {
      afterLicense: "insurance_pending",
      afterInsurance: "compliance_pending",
      afterCompliance: "banking_pending",
    },
    label: "Broker of Record",
  },
};

/** The fields every credentialing screen needs, common to agents and brokers. */
export interface CredentialEntity {
  id: string;
  auth_user_id: string;
  license_number: string;
  license_state: string;
  license_verified: boolean | null;
  license_verified_at: string | null;
  arello_pending_since: string | null;
  onboarding_status: string;
  eo_insurance_url: string | null;
  eo_broker_affirmed: boolean | null;
  eo_expires_at: string | null;
  nar_cert_signed_at: string | null;
  nar_cert_expires_at: string | null;
  nar_cert_lapsed: boolean | null;
}
