# Roadmap

## Next: make it a real product
1. **Backend and accounts.** Sign-in, a database for events and preferences (today everything lives in memory and `localStorage`).
2. **Server-side AI.** A small endpoint that holds an Anthropic key (`ANTHROPIC_API_KEY` in `.env`), receives the sentence and calendar
   snapshot, and returns the action list. The page then calls that endpoint instead of the artifact's `sample` capability.
   Keep Basic mode as the offline fallback.
3. **Calendar sync.** Google, Outlook and Apple connections (buttons exist in Account as placeholders).
4. **Notifications.** The weekly summary email and real reminders.
5. **Recurring events and series editing** beyond the current habit series.

## Polish
- Month grid: show a "+N more" count when a day has many bars; keyboard navigation for day-task stretch.
- Per-event reminders and a search box.
- Accessibility pass: focus order, reduced motion for the 3D assistant, screen-reader labels on bars.
- Performance pass on very small phones.

## Security
- Never ship a key in `src/` or `dist/`. A key in a web page is visible to everyone who opens it.
- Rotate any key that has been pasted into a chat or committed by mistake.
