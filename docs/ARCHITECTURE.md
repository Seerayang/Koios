# Architecture

## One build, two pages
`scripts/build.py` reads `src/` and writes `dist/site.html` (the product prototype) and `dist/appearance.html`
(the look and character sheet). Each is a single self-contained file: no network, no bundler. The three
`site*.js` files are joined in order into one script, so they share scope; keep them in order.

## The page (`site.html`)
- **Views:** home, onboarding, calendar. `show(view)` switches them.
- **Calendar:** 90 day strips (today minus 7). `cur = {dayW, gap, hpx}` holds the current zoom; `fitCalendar()` re-fits
  after layout changes (for example hiding the week-theme band). `HEAD_OFF` is the sticky header height from `layoutHead()`.
- **Day tasks:** a sticky layer `#dlane` holds spanning bars; each strip has a `.dgap` slot. In month view the same events
  render into `#mgrid`. One pointer controller (`dtBegin/dtMove/dtEnd`) handles create, move and stretch in both places by
  turning x/y into a date.
- **Timed events:** `.ev` elements inside `.sbody`; the `ed*` controller moves or resizes them and commits with `refreshAll()`.
- **Rendering:** `refreshAll()` redraws layout, events, bands, day tasks, month grid, themes, habits and Prism.
- **Theming:** CSS variables on `:root`. The Account colour theme overrides them from a base hex (`applyAccent`); the default
  blue removes the overrides. Preferences persist in `localStorage` inside try/catch.

## The assistant
`src/koios3d.js` is a small raw-WebGL engine (`K3`) and the character (`Koios3D`): pearl body, blue bands, ears at the
head sides, no hands. `setSkin(name)` picks a preset; `setTint(hex)` recolours only the stripes and eyes. If WebGL is
unavailable the page falls back to the SVG figure in `character.*`.

## AI layer
`askClaude` sends the user's sentence plus a JSON snapshot of the calendar (`ctxJson`) with the action list (`ACTION_DOC`),
and `applyActions` runs the reply. Every command also has an offline path (`parser.js`, `localEdit`, `localMilestone`,
`localExtras`) so Basic mode works with no AI. In the claude.ai artifact the call goes through the `sample` capability;
in a standalone build it should go to your own server (see ROADMAP).

## Data
Events: `{id,title,date,start,end,kind,milestone,series,color,desc,allDay,endDate,hide}`. Minutes are from midnight.
Everything is in memory; undo uses `snapshot()` and `restore()`.
