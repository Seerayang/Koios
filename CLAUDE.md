# KOIOS: notes for Claude Code

KOIOS is an AI calendar agent prototype. Owner: Sophia (Duke freshman). She wants efficient, direct work.

## Layout
- `src/`: the source. Edit here, never in `dist/`.
  - `site1.js`, `site2.js`, `site3.js`: one script, joined in that order by the build (they share scope).
    1 = onboarding and shared helpers, 2 = calendar model, layout and rendering, 3 = interaction, AI, popovers, Prism, Account.
  - `site.src.html` + `site.css`: page markup and styles. `{{PLACEHOLDERS}}` are filled in by the build.
  - `koios3d.js`: raw-WebGL assistant (`Koios3D`; skins `body/stripe/eye/chev`; `setTint(hex)` recolours stripes and eyes only).
  - `parser.js`: offline command parser (`parseCommand`).
  - `character.*`, `string.js`: SVG fallback figure and helpers.
  - `appearance.src.html`: the look-and-character sheet.
- `scripts/build.py`: builds `dist/site.html` and `dist/appearance.html`. `scripts/check_syntax.py` syntax-checks the script.
- `tests/`: Playwright smoke tests plus `parser.test.js`.
- `docs/`: plan, architecture, roadmap.

## Workflow
1. Edit `src/`.
2. `python3 scripts/build.py && python3 scripts/check_syntax.py`
3. Run the test that matches what you touched (`npm test` runs all).
4. Look at the page in a browser when you change anything visual. Check it at phone width (about 390px) too.

## Data model
Events: `{id,title,date,start,end,kind,milestone,series,color,desc,allDay,endDate,hide}`.
Day tasks have `allDay:true`, `start:0`, `end:1440`, `endDate` inclusive. Times are minutes from midnight.
The calendar is 90 day strips (today minus 7 for 90 days). Month view is a separate grid (`#mgrid`).

## Rules
- NEVER put an API key or any secret in `src/`, `dist/`, docs, tests or commits. Keys live in `.env` (git-ignored). If a key is ever pasted into a chat or file, tell the owner to rotate it.
- The product must work offline in "Basic mode": every AI feature keeps a local fallback.
- Colours come from CSS variables so the Account colour theme works. Do not hard-code the blue in new UI.
- Style: pearl white and blue, Optima-style display type, calm motion. Keep the assistant's body white with blue bands; only the stripes and eyes take the chosen colour.
- Save UI preferences with try/catch around `localStorage`; the page must work without it.
