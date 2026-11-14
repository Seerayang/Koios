# KOIOS prototype

## Run

Serve `dist/` using any static web server and open its URL. For example, from this directory on your computer:

```sh
python3 -m http.server 8080 --directory dist
```

Then visit `http://localhost:8080`. ES modules require an HTTP server; opening index.html via file:// is insufficient. No dependency installation or build step is required.

## Check

```sh
npm run check
npm test
```

## Source

- `dist/index.html`: application entry point
- `dist/styles.css`: responsive interface, pearl/blue theme, animations
- `dist/app.js`: routing, views, forms, drag/drop, browser persistence, scripted agent, focus sessions
- `dist/model.mjs`: recurrence, overlap detection, date/time parsing, occurrence outcomes and calendar layout
- `tests/calendar.test.mjs`: calendar behavior tests

## Implemented

Animated homepage; local profile and conversational onboarding; editable setup review; day, three-day, week and scrollable month views; activity templates with arbitrary colors and checklist; drag and tap placement; calendar overlaps and alternatives; weekly recurring rules with end dates and exceptions; editable series; individual/following/all deletion; progress check-ins; local journal, ideas, wellbeing records; goal clouds; focus timer; rule-based replanning; search; data export and undo. Data persists in localStorage on the same origin/browser.

## Prototype boundaries

- The site is privately hosted. The local profile form is explicitly not production account authentication. No passwords are collected.
- Koios replies are scripted and labeled in the conversation panel. There are no live AI requests, provider keys, token charges, background notifications or cloud data sync.
- Task phrasing supports a limited parser (weekdays, weekly recurrence, ISO dates, AM/PM times). Every proposal has editable date/time fields and requires confirmation.
- For unbounded recurrence, conflict preview examines 90 days. Calendar occurrences are calculated from the rule for whatever date range is viewed.
- Event editing applies to the whole series. Deletion supports occurrence/following/series; outcomes are occurrence-specific. More granular edit workflows are a next-stage extension.
- Voice input depends on browser SpeechRecognition support and permission. Its transcription service may be external to Koios. The line is an illustrative listening animation, not a measured audio waveform. Text input is always available.
- Fonts are optional external Google Fonts assets; system fonts provide fallback.
- The specification’s richer AI workflows, goal milestones, attachments, health/cycle integrations and production account recovery are not part of this first prototype.

## Next development stage

Add secure authenticated accounts, server-side persistence and user isolation; integrate an AI provider through backend-only credentials and controlled calendar tools; add timezone-aware cross-device scheduling and queued notifications; implement usage limits. Do not expose API secrets in browser code.

## Validation

All 15 calendar behavior tests pass in UTC and America/New_York. JavaScript syntax checks pass. A LinkeDOM simulation also exercised onboarding, calendar scale changes, activity creation, recurring-task review/save, completion, idea capture, search, the scripted conversation and settings successfully. Browser-driven visual and interaction QA was unavailable in the managed build environment, so desktop/mobile rendering and voice support still need manual review in the deployed site.
