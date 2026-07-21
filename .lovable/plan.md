## Goal
Recolor the site to match the divieight logo: blue primary (from the "divi" wordmark, ~#2AA6E0) with a teal accent `#46ACB4` (replacing the previous gold), on the existing warm off-white canvas.

## Scope
Presentation-only. No component logic, routes, or backend touched.

## Changes

**`src/styles.css`** — update design tokens only:
- `--primary`: logo blue (~`oklch(0.66 0.13 235)`), white `--primary-foreground`. Drives CTAs, nav brand chip, primary buttons.
- `--accent`: teal `#46ACB4` (~`oklch(0.68 0.07 200)`), dark `--accent-foreground`. Drives hero "1/8th Shares" highlight, share/ownership cues, EightSlicesTracker fills, focus ring.
- `--ring`: match accent teal.
- `--secondary` / `--muted`: keep neutral warm tint so blue + teal read cleanly.
- Dark mode block: mirror the same hues at appropriate lightness (blue primary and teal accent slightly brighter for legibility on dark bg).
- `--shadow-elegant` already derives from `var(--primary)`, so it recolors automatically.

No other files change — NavBar, landing hero, dashboard cards, `EightSlicesTracker`, `ListingStatusTimeline`, onboarding stepper, and buttons all consume these tokens, so the recolor propagates everywhere.

## Out of scope
- The logo image itself (NavBar still uses the text "1/8" chip).
- Any copy, layout, or structural changes.

## Verification
Reload `/` and `/dashboard`; confirm CTAs are logo blue, hero highlight and share/status accents are teal `#46ACB4`, and contrast still reads clean in both light and dark modes.
