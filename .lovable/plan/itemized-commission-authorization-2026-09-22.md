# Itemized commission authorization

A buyer-side commission provision becomes its own, separate authorization item — never bundled into the authorization of the offer, counter-offer, revision, or final purchase agreement.

## How it works

1. **Heavy Lifting Agent proposes.** A dedicated screen lets the Heavy Lifting Agent attach a commission provision to an authorization request: the buyer-side rate (percentage), the funding source (paid from sale proceeds at closing, or funded by the Preferred Member at the closing table), and the exact provision text. Only the Heavy Lifting Agent can create or change it. There is no stored commission rate anywhere in the project today, so the rate comes from the Heavy Lifting Agent; the per-share dollar figure is derived from the frozen share price (listing price divided by eight) and shown alongside the percentage.
2. **Resident Agent reviews.** Each Member's tethered Resident Agent sees the proposed provision next to their existing recommendation and can comment on it. They cannot author or price it.
3. **Buyer authorizes separately.** On the authorization request, the commission provision appears as its own clearly separated section with its own checkbox and its own typed-initials verification, distinct from the instrument authorization. Authorizing the instrument does not authorize the commission, and the request is not fully authorized until both acts are captured from every Preferred Member.
4. **Plain-language statement.** The commission section states, referencing no other document: the amount attributable to that Member's one-eighth share as both a percentage and a dollar figure; whether it is paid from sale proceeds at closing or funded by the Member at the closing table; and that the obligation is non-contingent under PRA Section 7.5 — neither created nor discharged by whatever the seller allows from proceeds.
5. **Declination.** If a Member declines the commission provision, the instrument is not tendered. The matter routes to that Member's tethered Resident Agent and to the Heavy Lifting Agent for resolution, with a clear notice that the declination is explicitly not a Default under PRA Section 8.
6. **Audit Vault.** The commission authorization is recorded as its own record type — Member identity, the exact text presented, timestamp, IP address, secondary verification method, and a hash of the instrument version the provision belonged to.

## Manager's Restraint

Every screen and notification in the commission flow, plus a pass over the existing authorization screens and emails, is checked and rewritten where needed so the Manager only presents the provision for authorization and executes the authorized instrument. Proposals are attributed to the Heavy Lifting Agent; nothing implies the Manager authored, negotiated, priced, or advised on the terms.

## Technical details

- New table `authorization_commission_items` (request_id, proposed_by_agent_id, rate_percent, funding_source `proceeds_at_closing` | `member_at_closing`, provision_text, per_share_amount_cents, instrument_hash, status, created_at) plus `authorization_commission_responses` (item_id, account_member_id, decision, signed_name, secondary_verification_method, exact_text_presented, content_hash, ip_address, responded_at; unique per item + member). RLS mirrors the existing authorization tables; grants for `authenticated` and `service_role`. Shipped as `authorization-commission.sql` at repo root, run manually in the external Supabase SQL editor like the other migrations.
- `src/lib/commission-item.ts`: shared derivation of the per-share dollar figure from the frozen share price, the fixed plain-language statement text, and the content hash of the presented text plus instrument version.
- `src/lib/authorization.functions.ts`: new server functions `proposeCommissionItem` / `updateCommissionItem` (Heavy Lifting Agent only, verified against `pods.heavy_lifting_agent_id`), `respondToCommissionItem` (Preferred Member, separate from `respondToAuthorization`), and inclusion of the item plus per-member commission responses in the buyer, agent, and admin reads.
- Final disposition logic requires both the instrument responses and the commission responses from every member before a request becomes `authorized`; a commission declination sets a `commission_declined` state, blocks tender, and notifies the Resident Agent and the Heavy Lifting Agent.
- New route `/agent/authorizations/$id/commission` for the Heavy Lifting Agent proposal form; the buyer detail route gains a separate commission section reusing `SecondaryVerification`; the admin list shows commission item status per member and is read-only.
- New audit action types: `authorization.commission_proposed`, `authorization.commission_authorized`, `authorization.commission_declined`, with entity type `authorization_commission_item`.
- Prompt 3's Due Diligence gate, acknowledgment logic, and the Eight-Slices / share-price math are untouched.
