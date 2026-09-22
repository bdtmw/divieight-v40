# Authorization gate messaging and selector loading

## Changes
- Extend the existing authorization gate status read to report whether required acknowledgment is pending from an Account Member, the Resident Agent, or both, while leaving the shared gate-clearing predicate unchanged.
- Update the buyer authorization list and review navigation so buyer-pending cases retain the existing document link, agent-only cases show a no-action-needed message without that link, and both-pending cases prioritize the buyer action.
- Add a visible disabled loading option to the admin buyer/property selector until targets finish loading.
- Verify the affected screens and current build diagnostics.

## Technical details
- Derive blocker responsibility from the existing `buildGateState`/`gatingDocuments` state rather than creating another gate rule.
- Keep authorization creation, due-diligence inventory, and acknowledgment-screen behavior unchanged.
