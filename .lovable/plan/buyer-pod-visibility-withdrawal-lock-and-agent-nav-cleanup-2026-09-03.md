# Buyer pod visibility, withdrawal lock, and agent nav cleanup

Four scoped changes.

## 1. Master Briefcase thread stays agent-only

No change to visibility: the coordination thread remains internal to the Heavy Lifting Agent and the Manager (divieight, LLC), per the FSB spec that shields the HLA from direct contact with the eight buyers. Buyers get transparency through pod status, share fill, and notifications instead — not this thread. A short code comment will record this decision in the briefcase route so it isn't "fixed" later by mistake.

## 2. Hide "Withdraw reservation" once the pod is System-Locked

- On the buyer dashboard reservation list, the withdraw button is hidden when the pod/listing is in `system_lock` (or any later stage).
- In its place, a small "Pod locked" note explains that withdrawal now runs through the Member Substitution Pipeline.
- Server side: `withdrawReservation` rejects the request when the property's listing status is `system_lock` or beyond, so the URL/API path is closed too, not just the button.

## 3. New buyer pod details page

New route `/buyer/pods/$id` (pod/property scoped), reachable from each row in "My Reservations" via a "View pod" link, plus a "My Reservations" section header link.

Page contents (full pod view):
- Property summary: photo, address, price, price per share, link to the public listing.
- 8-slice fill progress and listing status timeline (reuses the existing tracker/timeline components).
- My position: shares I hold, reservation date, priority rank, reservation status.
- Pod composition: other members de-identified (same de-identification rule already used on the agent side).
- My tethered Resident Agent, and the pod's Heavy Lifting Agent once accepted (name + status only).
- No coordination thread (per decision 1).

Access is restricted to buyers who hold a reservation in that pod; others get a not-found/denied state.

## 4. Agent portal nav: hide "Onboarding" when complete

The Professional Portal header currently always shows the Onboarding tab. It will be hidden once the agent's `onboarding_status` is `complete`/`active`; while incomplete it keeps linking to the agent's current step rather than always `/agent/onboarding/license-check`.

## Technical notes

- Files touched: `src/routes/buyer.dashboard.tsx`, `src/lib/reservations.functions.ts`, new `src/routes/buyer.pods.$id.tsx`, a new pod-details server function in `src/lib/pod.ts`/`pod.server.ts`, `src/routes/agent.tsx`, comment in `src/routes/agent.pods.$id.briefcase.tsx`.
- The pod details fetch runs through an authenticated server function so buyer PII of other members is filtered server-side, not in the browser.
- No schema migration required; all fields (`pod_reservations`, `properties.listing_status`, `pods.heavy_lifting_agent_id`, `buyer_accounts.tethered_resident_agent_id`) already exist.
- No changes to commission, payment, or substitution logic beyond the withdraw guard.
