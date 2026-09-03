/**
 * Broker Closing Hold — shared, client-safe types.
 *
 * MONTH 4 INTEGRATION POINT: `closingHoldActive` (pods.closing_hold_active) is
 * the flag the Month 4 closing engine must check before allowing the Closing
 * Ping Saga to proceed. While a hold is active the pod cannot advance through
 * any closing step; the hold must be lifted by the Broker of Record of the
 * pod's accepted Heavy Lifting Agent first.
 */

export interface ClosingHoldState {
  active: boolean;
  reason: string | null;
  placedAt: string | null;
  placedByBrokerName: string | null;
  liftedAt: string | null;
}

export const NO_CLOSING_HOLD: ClosingHoldState = {
  active: false,
  reason: null,
  placedAt: null,
  placedByBrokerName: null,
  liftedAt: null,
};

/** A party inside the pod that a hold can name as affected. */
export interface PodParty {
  id: string;
  label: string;
  kind: "buyer" | "agent";
}

export interface BrokerHoldPod {
  podId: string;
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listingStatus: string;
  heavyLifterName: string;
  heavyLifterAgentId: string;
  acceptedAt: string | null;
  parties: PodParty[];
  hold: ClosingHoldState;
}

export interface ClosingHoldInput {
  podId: string;
  issueDescription: string;
  affectedParties: string[];
  proposedResolution: string;
}

/** Contemporaneous documentation, rendered as the stored hold reason. */
export function composeHoldReason(input: {
  issueDescription: string;
  affectedPartyLabels: string[];
  proposedResolution: string;
}) {
  return [
    `Issue: ${input.issueDescription.trim()}`,
    `Affected parties: ${
      input.affectedPartyLabels.length ? input.affectedPartyLabels.join(", ") : "Entire pod"
    }`,
    `Proposed resolution: ${input.proposedResolution.trim()}`,
  ].join("\n");
}
