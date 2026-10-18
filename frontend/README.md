# DigiMirror frontend

React + Vite + TypeScript frontend for DigiMirror. The sample experience works without an account; sign-in and account creation use the included FastAPI backend through `/api/v1/auth`.

The ZIP includes `.env` at the project root. It contains explanatory comments only, because this frontend does not read environment variables. The file is ignored by Git.

## Run, build and test

Use Node.js 22.18+ or 24 and npm. From this folder:

```powershell
npm ci
npm run dev -- --port 5175 --strictPort
npm run build
npm run check
npm test
```

`npm run preview` serves the production build locally. Dependency installation needs npm access. The app uses native fonts and local assets. Official export-help links open only when selected.

## Screens

`/#home` is the landing page. Workspace routes are `/#app/overview`, `map`, `plan`, `history`, `lab`, `trust` and `settings`. An unknown workspace route shows a recovery page. `/#app` resumes the last session screen.

Desktop uses a sidebar with privacy/settings controls at its bottom. Tablet uses an expandable rail. Mobile has five primary tabs; Trust centre and Settings remain available through the profile menu and command search. Ctrl/Cmd+K opens pages and actions. Native dialogs support Escape, focus containment and returning focus.

## What is real and what is sample

Scores, map observations, weekly trend and notifications are explicitly illustrative. Completing an action updates the sample score, categories, service evidence, next step, plan and history. It never changes or verifies settings in another service. Baseline 72 minus the four sample impacts (7 + 6 + 4 + 3) gives a potential score of 52.

File preview reads one JSON or CSV file up to 2 MB locally. It counts array entries/object keys or CSV records; it does not analyse privacy risk. Raw contents are discarded. The selected file's name, format and count remain in this browser session until cleared or the tab closes.

Sample choices, activity, file summary, motion/text preferences and last screen use guarded sessionStorage. Theme and completed/skipped onboarding use guarded localStorage. If storage is unavailable, the view still works in memory. The original shield intro plays on document entry/refresh; navigating from the landing page does not replay it. The first score animation runs once per session.

Clear/delete actions require confirmation. Their eight-second Undo restores the previous session snapshot. Export downloads a sample JSON summary without raw file contents or the selected filename. Print uses a separate clean summary of sample score, plan and activity.

## Source map

- `src/App.tsx`: stable shell, routing, preferences and flows.
- `src/data/mock.ts`: sample numbers, services, actions and help content.
- `src/data/state.ts`: score/state transitions and guarded persistence.
- `src/i18n/en.ts`: component copy; `locales.ts` defines the Hindi/English contract and expansion fixture. Hindi is not enabled pending translation review.
- `src/components`: common UI, evidence/onboarding/notifications, file parser, print summary.
- `src/screens`: lazy-loaded screens.
- `src/styles/tokens.css`: brand, theme, type, radius and icon tokens.
- `src/styles/app.css`: responsive styles, motion, accessibility and print layout.
- `src/tests`: component/state regression tests.

Read `IMPROVEMENT-REPORT.md` for every numbered requirement, `VALIDATION.md` for checks and limits, and `SELF-REVIEW.md` for the three weakest screens.
