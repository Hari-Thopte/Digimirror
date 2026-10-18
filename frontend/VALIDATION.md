# Validation — 16 October 2026

## Automated

- `npm run build`: strict TypeScript and Vite production build pass. Screens are separate dynamic chunks; the shared initial JS is about 142 kB gzip, CSS about 13 kB gzip. These are build sizes, not field performance measurements.
- `npm run check`: unused-binding checks; 24 semantic text color pairs >=4.5:1 across light/dark; source check for network/API calls; five primary mobile tabs; CSV edge cases; visible JSX/accessibility-copy catalog checks.
- `npm test`: 14 tests pass. Coverage includes score idempotency/reopen, severity boundaries, invalid session JSON, relative dates, guided completion and Undo, Overview/History updates, onboarding dismissal, theme persistence, confirmed deletion/Undo, keyboard completion, restored choices, offline recovery, screen-error instructions, import validation/recovery, copy expansion and advertising evidence consistency.

## In-app browser

- 48 route/viewport checks: landing plus seven workspace screens at actual CSS widths **360, 390, 768, 1024, 1440, 1920**. Zero horizontal page overflow after fixing tooltip bounds.
- Normal workspace controls measured at least 44 x 44 CSS pixels in the small-width checks. Mobile uses five tabs and safe-area padding. Checkbox labels provide the enlarged click target.
- At 360 x 800, the Overview next action ends above the bottom navigation. Its full description is available in the guided dialog; the mobile next-step card is compact.
- Desktop score/next-step cards align in height. Category bars use red >75, amber 50–75, green <50, with visible severity labels.
- Rendered text contrast/minimum-size reads across all seven workspace screens: no <4.5:1 text pair or <12px visible text found in light or dark. Token checks also pass. Hovered map labels retain readable text while other node surfaces and lines become quieter.
- Seven workspace screens checked with the 200% text-size setting on desktop and at 360px: no horizontal page overflow. Long action labels wrap. A double-length English copy fixture is tested; Hindi translation has not been supplied or reviewed.
- Live keyboard guided fix: Space selects the three steps, Enter completes; sample 72 → 65 appears in What changed; Undo returns progress to 0/4 and focus to the original action.
- Map/List keyboard End selection and focus tested. Map/risk rings/connection routing and details visually inspected. Mobile defaults to List.
- Landing proof is above the fold in the six-size checks. The original logo assets retain their source dimensions and geometry.

## Limits

These are local prototype checks, not WCAG certification, screen-reader certification, real-device lab tests, measured scan accuracy or deployment results. OS reduced motion is supported by implementation; the device setting itself was not changed. Native system fonts need no download or font-display rule.

Provider-specific instructions remain generic for fictional services and the cross-service ad action. Google Timeline guidance and official export help were checked; the UI links to current help. Instagram menu labels may vary by version. No account was signed into or changed.

Print summary and print CSS are implemented. Native browser print/PDF output was not visually inspected. Production social-card scraping also needs a deployed host; the local PNG and metadata are supplied.

Landing and Settings have loading/error/recovery and normal states, but no artificial data-empty screen. Data-bearing screens provide empty states with sample/export guidance.

## Focused follow-up: Soundwave node

Made the map's low-exposure green fill more distinct in light/dark themes. Other node colors, layout and score data are unchanged. The contrast checker now includes this map-specific fill: 26 semantic text pairs pass >=4.5:1. Build passes and the dark map was visually reviewed.
