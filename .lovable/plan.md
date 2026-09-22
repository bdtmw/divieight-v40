# Agent document review parity

## Goal
Make the Agent Due Diligence review interface match the Buyer review experience without changing acknowledgment rules or saved data.

## Changes
- Replace the embedded split PDF viewer with the shared single-panel, page-by-page document preview used by buyers.
- Reuse the same typed-initials secondary verification control and genuine scroll-to-end requirement.
- Match buyer-style document cards, statuses, revision notice, and acknowledgment controls while retaining agent-specific buyer/property and deadline details.
- Keep the current agent acknowledgment submission and server-side checks unchanged.

## Verification
- Confirm multi-page PDFs render in one scrollable preview.
- Confirm acknowledgment remains disabled until the document bottom is reached and initials verify.
- Check the agent page at desktop and mobile widths and ensure the preview builds cleanly.
