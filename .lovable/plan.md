# Earnest Money Coordination

Tracks each Buyer Account's earnest-money obligation after a seller accepts the Buyer Group's offer. Money moves directly from each Buyer Account to the title/escrow company — the platform only issues instructions and tracks status.

## Trigger

When the final acceptance authorization (acceptance of a seller counter-offer or final purchase agreement) reaches "authorized", the property is flagged as ready for earnest-money setup and appears in a new admin queue. Admin can also set it up manually for any property with an active pod, since the live acceptance handshake isn't wired yet.

## Setting up the obligations (admin only)

On a new admin screen, the Manager enters:
- the total earnest money as a flat dollar amount from the accepted offer
- the funding deadline (entered manually, no default)
- escrow/title company name, account details and reference (free text, configurable placeholder until the real integration exists)
- acceptable funding methods (wire, cashier's check, etc.)

The platform then splits the total pro-rata by shares: a Buyer Account holding 2 of 8 shares owes twice a 1-share Account. Rounding remainders go to the largest holder so the parts always sum to the total. One obligation row per Buyer Account.

## What each Buyer Account sees

A funding instruction card on the buyer dashboard and a dedicated screen: amount owed, share count it's based on, escrow account details, deadline, accepted funding methods, and a plain statement that funds go directly to escrow and the platform never holds them. The Platform Enrollment Fee is named explicitly as a separate, already-paid obligation so the two are never confused.

Status is one of: pending, funded, late, missed. Admin marks an obligation funded (recording reference and date). A sweep marks obligations late once the deadline passes and missed after the grace period.

## Default and forfeiture

A missed obligation is a Default under PRA Section 8. The platform then:
- notifies the title/escrow contact, the non-defaulting Buyer Accounts (no names or reason disclosed), and the tethered Resident Agents
- releases the defaulting Account's slice and opens the existing Member Substitution Pipeline for it, unchanged

## Substitute Members

When a Substitute Member accepts an invitation, an earnest-money obligation is created for them immediately, pro-rata to their shares, with the same deadline as the member they replace (or a short minimum window if that deadline already passed). Their installation into the Buyer Group is conditional on funding; failure to fund cascades to the next candidate in the pipeline.

## Audit

Every event is logged: obligations issued, instruction viewed, marked funded, marked late, marked missed/defaulted, substitution triggered, substitute obligation created.

## Technical notes

- New table `earnest_money_obligations` (id, buyer_account_id, property_id, amount, status, funding_deadline, funded_at) plus setup fields (shares_basis, escrow details, funding methods, reference, marked-by, timestamps) and a per-property `earnest_money_terms` row for the shared escrow/deadline/total values. RLS: buyer reads own rows; writes via service-role server functions. Ships as `earnest-money.sql` at repo root, run manually in the Supabase SQL editor.
- New `src/lib/earnest-money.ts` (pro-rata split, status/labels, instruction copy) and `src/lib/earnest-money.functions.ts` (issue, list for buyer/admin/agent, mark funded, sweep).
- Deadline sweep at `/api/public/earnest-money-sweep`, apikey-gated POST, same pattern as the other sweeps; marks late/missed and calls the existing substitution opener.
- New audit actions under an `earnest_money_obligation` entity type.
- Substitution acceptance path in `substitution-invite.server.ts` gains obligation creation; the pipeline's own ranking, invitation and privacy logic is untouched.
- Enrollment fee, commission authorization, due-diligence gate and Eight-Slices math are untouched.
