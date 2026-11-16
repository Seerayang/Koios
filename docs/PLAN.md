# KOIOS Product Design and Plan

2026-10-31 · Sophia

## 1. Product vision

KOIOS is a calendar you never operate by hand: a floating blue agent places every event for you, so planning takes one sentence instead of a form.

The product has three parts that depend on each other. The calendar is the workspace. The KOIOS agent is the only way events get created and changed. Personalization is what makes the calendar feel like yours: every weekday and every stretch of weeks can carry its own name, color and motion.

**Who it is for.** People whose weeks are full and repetitive in some places and unpredictable in others: students, early-career professionals and anyone balancing classes or work, training, practice and long-range goals. The first target user is a college student with classes, a running routine, piano practice, exams and interviews.

**Design principles**

1. **The agent does the input.** No time pickers, no title fields, no category menus. The user says or drags; KOIOS fills in the rest.
2. **No confirmation step.** An event appears the moment it is understood. Mistakes are fixed by telling KOIOS or by editing the event directly, never by answering "Are you sure?" first.
3. **Cute, but never in the way.** Animation is a core selling point, so it is designed with a time budget: every placement animation is short, skippable and collapses when many events arrive at once.
4. **The calendar has a personality.** Days and periods are named and styled. A Monday can be RUN DAY. A stretch of weeks can be "Two weeks before Chemistry Midterm".
5. **Two in the room.** Onboarding and conversation screens contain only the user and KOIOS. Nothing else competes for attention.
6. **Pearl white and blue only.** The base look never leaves that palette (details in section 2).

## 2. Visual identity

The whole product lives in pearl white and shades of blue, led by one futuristic electric blue that is also the color of the KOIOS agent and of the signature line.

**Palette**

| Token | Role | Value |
|---|---|---|
| Pearl | Page background | #F6F8FC |
| Pearl shade | Panels, calendar surface | #EAF0FA |
| Mist | Hairlines, grid lines, disabled | #C9D8F0 |
| Sky | Secondary fills, hover | #8FB8FF |
| Koios blue | Signature line, agent, primary actions | #2F6BFF |
| Ion | Glows, highlights, animation trails | #3DD6FF |
| Midnight | Text and the deepest shade | #0A1B4A |

A dark mode swaps Pearl for a deep midnight blue and keeps the same blue accents. Pearl white is never replaced by gray.

**Typography**

- Display, wordmark and interface: Optima, set wide with generous letter-spacing for KOIOS. Optima is native on Apple devices; other devices fall back to Candara, then Belleza (a free Optima-like face from Google Fonts), then the system sans.
- Agent speech uses the same Optima stack, so the whole product speaks in one humanist voice that stays readable at small sizes.
- Times and numbers: JetBrains Mono, so the 2-hour time anchors (8 AM, 10 AM, 12 PM) read like instrument markings.

**The signature line.** One continuous blue line is the brand mark. It sweeps across the homepage, across the onboarding screen and, in a quieter form, under the calendar header. It always behaves like a plucked violin string: it travels, it is struck, it rings and settles.

**Motion language.** Everything eases like something floating: slow starts, soft landings, no hard stops. Short interface motions run 150 to 250 ms. Agent flights run 400 to 900 ms. Nothing except the entrance sequence is allowed to block input.

**Decision for review: personalization colors.** The brief asks for a pearl and blue-only page, and also for "special colors" on themed days and weeks. The plan resolves this by keeping the page chrome strictly pearl and blue, and giving each theme its own tint inside the blue family by default (ice, teal-blue, periwinkle, indigo, aqua). Users can opt in to non-blue theme colors for individual days or periods.

## 3. Homepage entrance

The homepage opens with one blue line that sweeps across a pearl-white screen, rings like a struck violin string, and reveals the KOIOS name and the sign-in portals in under 3 seconds.

The beats overlap on purpose, so the name appears while the line is still ringing and the page feels like one gesture, not five steps.

**Details**

- **The line.** A single continuous blue stroke, never segments or dots. It draws from the left edge to the right edge in 0.8 seconds with an ease-out.
- **The strike.** When the line reaches the right edge it is plucked near its middle. It oscillates as a damped wave, large at first and flat again after about one second, the way a struck violin string settles. An optional soft tick sound is off by default.
- **The name and the agent.** The KOIOS wordmark fades up directly under the line while it is still ringing. The agent floats in below the name and settles with one bob. The agent uses a light 2D sprite here, and the full 3D model streams in afterward.
- **The portals.** Get Started is the primary button, filled blue. "Already have an Agent? Login" is a quieter text link. Both fade in last, so the first screen stays calm.
- **Never in the way.** A click, key press or scroll during the sequence jumps straight to the finished screen. Repeat visits in the same session play a 1-second version.
- **Reduced motion.** The line appears whole with one brief glow, everything else fades in, and the total is under 0.6 seconds.

## 4. KOIOS agent character

KOIOS is a small floating 3D robot built from the reference drawing: a rounded pearl helmet, a dark visor painted flush onto the face (nothing sticks out), two symmetrical, slightly rounded glowing eyes, small soft ears, a heater-shield body close under the head with a pale arrow on it, and short arms that hang close to the body with dark hands. It has no mouth and no center button. A thin navy ink line outlines every part. It is blue by default and can turn all the way around, spin, flip and dance.

The design follows the reference image Sophia shared: eye shape, a small torso under a large head, and floating dark hands. The eyes are almond-shaped, the body is a small shield rather than a large cone, and the mouth and the blue button on the body were removed in the second revision.

**Anatomy**

| Part | Design |
|---|---|
| Body | Inverted cone, wide at the top and narrowing to a rounded tip. Every edge is smoothed so it reads as a soft pod, not a funnel. No legs or wheels. A soft Ion glow pulses under the tip to show it is hovering. |
| Head | A rounded, slightly squashed sphere that floats above the body with a visible gap and no neck. A thin Ion ring sits in the gap and brightens when KOIOS speaks. |
| Visor | A dark navy glass visor set into the pearl-white head, with two large, glossy oval eyes that glow Ion blue. Each eye has a bright highlight that shifts with where KOIOS is looking. |
| Ears | Two tall, tapered ears with rounded tips, pearl white with three blue bands each, set on the sides of the head. They tilt up when KOIOS is curious or alert and droop when idle or sleepy. |
| Arms | Short pearl-white arms with two blue bands each and round dark navy hands, floating beside the body with no visible shoulder joint. They carry events, hold the tiny computer and wave. |
| Finish | Glossy Koios blue body with Sky highlights on the upper curves; pearl-white head shell, ears and arms with blue bands; Midnight visor and hands. The default body is blue. Users can switch it to other shades of blue, or to an all-pearl version with blue bands. |

**Proportions.** Head width 1.00 and height 0.92, visor 0.86, each eye 0.24 wide, body 0.60 wide and 0.74 tall, gap between head and body 0.06, ears 0.33 tall, arms 0.33 long. The big head and small body keep it cute and recognizable at 40 px in a corner of the screen.

**Expressions** (eye shape and ear angle only, so they stay readable when small)

- Neutral: round eyes, ears level.
- Happy: eyes curve into upward arcs, ears perk up.
- Thinking: eyes look up and to the side, one ear tilts.
- Working: eyes narrow to focused ovals, ears flat.
- Alert: eyes widen, ears fully raised. Used for exam and deadline reminders.
- Sleepy: eyes half closed, ears droop. Used after long idle time.
- Surprised: eyes become tall ovals, body jumps up slightly.

**Production model.** The prototype is now real 3D: a small custom WebGL renderer draws the figure from smooth parametric shapes (no model files, about 40 KB of code), with a key light, fill light, rim light and soft shadow. The head, torso, eyes, ears and hands are separate parts, which is what lets KOIOS turn around, spin, flip, bow, dance and pull out a laptop. If WebGL is unavailable, the page falls back to the earlier 2D vector figure. For production the same rig can be exported to glTF within a budget of 15,000 triangles.

## 5. Onboarding and agent personalization

After the account is created, the user lands on a screen that contains only the blue line, KOIOS and a text field, and has a short conversation that teaches KOIOS who they are.

**Screen.** Pearl white background, nothing else. The signature blue line strikes across the screen again and rings. KOIOS floats in below it, centered. KOIOS's words appear in large type directly under the blue line. The user answers by speaking (a microphone button under KOIOS, with a live transcript) or by typing in a field under KOIOS. No sidebar, no menu, no progress bar. A small "Skip for now" link stays in the corner at all times.

**What KOIOS asks**, one question at a time, in this order:

1. What do you do day to day? (what you study or work on, and what a typical day looks like)
2. What habits do you keep? (running, piano, gym, reading)
3. Is there anything else you want KOIOS to know?

**How it behaves**

- Answers are free text or speech. The user never picks from a form. KOIOS extracts the structure itself: classes and meetings become fixed events, running and practice become recurring habits, exams and interviews become dated milestones, and long-term targets become goals.
- KOIOS reacts briefly to each answer (a short line and an expression change) and moves on. It asks a follow-up only when an answer is too vague to use, such as "I work out sometimes".
- Anything the user does not know yet can be skipped by saying "not sure". KOIOS never blocks on a missing answer.
- When the questions end, KOIOS summarizes what it understood in two or three sentences and offers calendar personalization (section 10). The user can accept, adjust by talking, or skip. Skipping applies the default setup.

**Example opening**

> KOIOS: Hi, I'm KOIOS. I'll be the one putting everything on your calendar, so you never have to. What do you most want to get out of me?

**Defaults when the user skips everything.** Standard weekly view, a neutral blue theme, no named days or periods, and KOIOS in the bottom-left corner. KOIOS can propose personalization later, once it has seen real events.

## 6. Calendar layout: days without a grid

Each day is an open vertical strip of time with a 2-hour ruler on its edges, and the grid lines fade out before they reach the middle, so events float on empty space instead of sitting in cells.

**The idea.** A normal calendar draws every hour as a full-width line, which makes a week look like a spreadsheet. KOIOS keeps the information of a grid and removes its weight. The time scale is a ruler that lives on the edge of each day, like the markings on an instrument.

**Layout**

| Element | Behavior |
|---|---|
| Time anchors | Labels every 2 hours: 8 AM, 10 AM, 12 PM, 2 PM, 4 PM, 6 PM, 8 PM, 10 PM, 12 AM. Set in the mono face, small, on the left edge of each day strip. |
| Grid lines | Each anchor has a hairline that starts at both edges of the day strip at about 30 percent opacity and fades to zero by the middle of the strip. The center of every day is clear. |
| Days | Vertical strips laid out left to right. No borders between days. A strip is a slightly different pearl shade with soft rounded ends, separated by a gap. |
| Day header | Weekday and date, plus the day's theme label when it has one (for example RUN DAY). |
| Events | Soft rounded capsules floating on the strip. Height equals duration, with no visible cell boundary. Overlapping events sit side by side. |
| Now line | A thin glowing blue thread across today, drawn like the signature line. It does not ripple unless KOIOS is placing something near it. |
| Visible hours | **Full 24 hours.** The strip scrolls vertically through the whole day and opens at 6 AM, so the day starts at 6 AM but nothing is hidden. |
| Finer marks | Time zoom works like a big canvas. Ctrl or Cmd with scroll, a pinch, or the minus and plus buttons zoom the time axis, and the labels step from every 4 hours, to 2 hours, 1 hour, 30 minutes and 15 minutes as you zoom in. The Day, 3 Days, Week and Month buttons set how many days are visible and are separate from time zoom (section 8). |

**Why this works.** Time is still readable from any point in the strip, because the ruler is always close to the left or right edge. Events get the full visual weight. Empty time looks empty, which makes free slots obvious and gives the agent room to animate.

**Accessibility.** Contrast between event text and capsule color meets WCAG AA. Every capsule has a text label and time range available to screen readers. A high-contrast option draws the grid lines at full strength across the strip.

## 7. Creating events with KOIOS

Every event is created by KOIOS from a drag or a sentence, appears immediately with no confirmation step, and is corrected by telling KOIOS or editing it directly.

**Path A: drag to create**

1. The user drags across empty time on a day strip, for example from 10 PM to 12 AM.
2. A ghost capsule follows the drag. On release, KOIOS looks up from its corner and the chat box opens with the starter already filled in: "Today 10PM-12AM...".
3. The user finishes the sentence, for example "meeting with Audrey", and presses Enter. The event is created. No time field, no title field, no category.
4. If the drag was slightly off (it ended at 12 AM but should end at 12:30), the user tells KOIOS "make it end at 12:30" and KOIOS adjusts. Dragging the capsule's edge also works. Drags snap to 15 minutes.

**Path B: type or speak a sentence.** The chat box is always available and accepts full requests with no drag at all.

| User says | KOIOS creates | Inferred without asking |
|---|---|---|
| (drag 10 PM to 12 AM) "meeting with Audrey" | "Meeting with Audrey", today, 10 PM to 12 AM | Nothing: time came from the drag |
| "put running for me every monday 3PM" | "Running", repeating every Monday at 3 PM | Duration 45 min, from the habit type |
| "i have a conference next monday 2PM" | "Conference", the coming Monday at 2 PM, once | Duration 1 hour, from the event type |
| "make it end at 12:30" | The selected event now ends at 12:30 AM | Which event: the one just created |

Default durations are starting guesses. KOIOS learns from edits, so after a user stretches a run to an hour twice, new runs start at an hour.

**Rules that keep it fast**

- **No double confirmation.** KOIOS never asks "Add this event?". The event simply appears.
- **Undo is not a confirmation.** A small, non-blocking "Undo" appears for a few seconds after each creation. It never has to be answered.
- **Ask only when blocked.** KOIOS asks one short question only when no day can be inferred. If the time is missing but the day is clear, it picks the nearest free slot and says where it put the event.
- **Three ways to change an event:** tell KOIOS ("move it to Tuesday"), drag it, or open it and edit the fields by hand.

**Placement animation.** After creation, KOIOS flies from its corner to the day, carrying the new capsule in its hands, and sets it down. For repeating events the calendar scrolls horizontally from day to day while KOIOS drops the capsule on each occurrence. To protect speed:

- The first three occurrences are placed one by one at about 350 ms each. The rest are filled in a single fast sweep.
- The whole sequence is capped at 2.5 seconds.
- Any click, key press or scroll ends it immediately and shows the final result.
- With reduced motion turned on, events fade in and KOIOS stays in place.

## 8. Zoom and navigation

The calendar is one continuous horizontal timeline that zooms smoothly from a single day to a whole month and scrolls sideways through weeks and days.

| Zoom level | Days visible | What the user sees |
|---|---|---|
| Day (maximum zoom) | 1 | 15-minute ticks, full event titles and notes, the whole 24 hours reachable by vertical scroll. KOIOS sits beside the day when called. |
| Three days | 3 | Full titles, 30-minute ticks. |
| Week (default) | 7 | The standard working view: 2-hour ruler, event titles, day themes. |
| Month (maximum zoom out) | 28 to 31 | Each day shrinks to a thin strip. Events become small bars. Themed periods show as colored bands across the top. |

**Controls**

- Zoom: pinch, Ctrl or Cmd with scroll, a zoom slider, or the keys + and -. Zoom anchors on the cursor or fingers, so the day under the pointer stays under it.
- Scroll sideways: trackpad swipe, Shift with scroll, drag on empty space, or the left and right arrow keys. Scrolling has light momentum and settles on a day boundary.
- A "Today" button returns to the current day at the current zoom.
- Zoom changes are continuous. Layouts morph between levels over about 250 ms, with no hard swap between views.

The same horizontal motion is what the placement animation uses: when KOIOS adds a repeating event, the calendar scrolls along the days it is filling, then returns to where the user was.

## 9. Event types and the sidebar

KOIOS handles two kinds of events: recurring habits, served by a pre-built sidebar, and fixed events that sit at exact times.

|   | Recurring events (habits) | Fixed events |
|---|---|---|
| Examples | Running, piano practice, reading | Classes, weekly meetings, Friday gym lesson |
| Created by | A card in the sidebar, or a sentence such as "put running for me every Monday 3PM" | A drag on the calendar or a sentence such as "I have a conference next Monday 2PM" |
| Timing | A target (for example 3 times a week) and a preferred window, or an exact repeating time if the user gives one | Exact day and time, with an optional repeat rule |
| Moves automatically | Yes, within its window, when a fixed event takes its slot. KOIOS tells the user where it went. | Never, unless the user asks |

A one-time event, such as the conference, is a fixed event with no repeat rule.

**The sidebar.** A slim rail on the left edge that expands to a panel.

- It is pre-filled from onboarding: every habit the user named becomes a card, and a short starter set (Running, Piano practice, Reading, Gym, Study) appears if they skipped onboarding.
- Each card shows its name, its weekly target and its next scheduled time.
- Dragging a card onto a day, or saying "add running this week", sends it to KOIOS, which places it. The same no-confirmation rule applies.
- Cards can be edited by talking to KOIOS ("piano four times a week, after dinner") or by hand.
- The rail stops above the bottom-left corner so it never covers KOIOS's home position.

## 10. Calendar personalization

KOIOS can name and style every weekday and every period of weeks, and it figures most of that out on its own; the user can skip all of it and get a sensible default.

**Setup is optional.** At the end of onboarding, and later by saying "personalize my calendar", KOIOS offers three paths: skip (defaults), answer a few questions, or just describe what the user wants in one message. With no input, KOIOS assumes the default: an unlabeled week in the standard blue theme. Personalization can be added, changed or removed at any time.

**Level 1: personalizing each day of the week**

The user says "my run day is every Monday" and KOIOS labels every Monday RUN DAY, with a special tint and animation.

| Day theme | Label | Tint (inside the blue family) | Motion |
|---|---|---|---|
| Run day | RUN DAY | Aqua | A thin dashed line sprints across the day header every few seconds |
| Piano day | PIANO DAY | Periwinkle | A row of small keys in the header ripples when the day is opened |
| Gym day | GYM DAY | Indigo | A slow pulse on the day's top edge, like a heartbeat |
| Rest day | REST DAY | Ice | Almost no motion; the strip is slightly brighter |

Users can name a day anything, choose a tint, and choose how much motion it has.

**Level 2: personalizing periods (weeks and months)**

There are two naming styles, and the user can use either or both.

| Style | Examples | How KOIOS decides |
|---|---|---|
| Seasonal and named | Flowering week, Fall week, Thanksgiving week | From the date, the user's region and the holidays and seasons in the calendar |
| Countdown | Three weeks into the semester, three weeks before an interview, two weeks before the Chemistry midterm | From events KOIOS already sees on the calendar |

Period labels appear as a static colored band above the affected days, with a small icon and no animation, so the top of the calendar stays calm. Every week carries a theme from its season or nearest festival (Early Winter, Spring Bloom, Golden Fall, Halloween week, Thanksgiving week, Lunar New Year, Diwali and so on); a countdown or a name the user gives takes priority.

**The AI layer: reading the calendar without interrogating the user**

- KOIOS scans titles and context for milestones: exams, midterms, finals, interviews, deadlines, conferences, trips.
- When it finds one, it creates a countdown automatically at 4, 3, 2 and 1 weeks out and for the last 3 days. The user is never asked for the date.
- When a countdown period begins, KOIOS speaks up once, in a short bubble: "Your Chemistry midterm is two weeks away." It offers one optional action, such as blocking study time. It is a reminder, not a new event, and ignoring it is fine.
- Semester structure ("three weeks into the semester") comes from the first class events and any dates the user gave at onboarding.
- Periods sit in two lanes above the days. Season weeks (Fall, Thanksgiving, Flowering) take the top lane. Semester weeks and countdowns share the lower lane, and a countdown to an exam or interview replaces the semester label for its weeks.
- Everything can be changed by talking to KOIOS: "call this week Midterm Madness and make it indigo", or "stop labeling weeks".

**Decision for review.** Study blocks are offered, not added automatically, because adding blocks changes the user's time and the brief says KOIOS should not ask too much. If you want KOIOS to add them without asking, it is a one-line change in behavior.

## 11. KOIOS animation and behavior

KOIOS lives in the bottom-left corner, stays put while idle with small in-place motions, flies out to do the work when called, and returns home when it is done.

**Home position.** Bottom-left of the screen, above the sidebar rail's end. While idle KOIOS floats in place and does not drift or travel. Motion is a gentle bob with no momentum, as if hovering in still air.

**Idle behaviors.** One idle action runs at a time, picked at random, with a gap of 15 to 40 seconds between actions.

| Behavior | What happens | Length |
|---|---|---|
| Hover bob (always on) | Body rises and falls about 6 px; head lags slightly behind the body | 3.2 s loop |
| Blink | Eyes close and open | 0.15 s, every 3 to 6 s |
| Look around | Eyes drift to one side, head tilts, eyes return | 2 s |
| Spin | One full turn around the vertical axis, ears trailing | 1.2 s |
| Pull out a computer | Arms bring up a small glowing laptop, KOIOS types with focused eyes, then folds it away | 6 to 9 s |
| Wave | One arm lifts and waves | 1.5 s |
| Sleepy | After 3 minutes with no input: eyes half closed, slower bob | Until the next input |

**Working behaviors**

| State | Trigger | Motion | Time |
|---|---|---|---|
| Called | A drag ends, or the chat box is focused | Idle action stops. KOIOS flies beside the drag area or stays by the chat box, ears perk up. | 450 ms |
| Listening | The user types or speaks | Head tilts toward the text; the ring around the head brightens with input | While typing |
| Thinking | Request sent | Eyes look up, the ring orbits the head | Usually under 600 ms |
| Placing | Event parsed | KOIOS carries the capsule to its slot, lowers it in, and a small ripple runs through the day strip | 350 ms per event |
| Sweeping | A repeating event with many occurrences | The calendar scrolls sideways while KOIOS places the first three occurrences, then the rest fill in one sweep | Up to 2.5 s total |
| Reminding | A countdown period begins | Ears fully raised, a short speech bubble, a small bounce | 4 s, then fades |
| Returning | Task finished | KOIOS flies home, a happy blink, then back to idle | 500 ms |

**Rules that protect productivity**

- Idle behaviors never start while the user is typing, dragging, or has a text field focused.
- Any user input interrupts an animation immediately and shows the final state.
- Idle animation pauses when the tab is hidden.
- Animation intensity is a setting: Full, Calm (bob and blink only) and Off. Reduced motion defaults to Calm.
- Performance target: 60 frames per second, with the agent using less than 8 percent of GPU time on a mid-range laptop.
- Sound is off by default. An optional soft tick plays when the blue line is struck and when an event lands.

## 12. Technical plan

The proposed build is a web app whose only write path is a single agent service, which turns every sentence or drag into typed calendar actions that the client then animates.

User input goes to the agent service. The agent service asks the language model what the user meant and sends the resulting actions to the Calendar API, which saves them and pushes live updates back to the calendar view and to the agent animation. The insight service reads the calendar for milestones and sends reminders to KOIOS. Voice goes through a speech-to-text step before it reaches the agent service.

**Data model**

| Record | Main fields |
|---|---|
| Event | Title, start, end, repeat rule, kind (fixed or recurring), created by (drag, sentence, sidebar) |
| Habit | Name, weekly target, preferred time window, sidebar position |
| Day theme | Weekday, label, tint, motion level |
| Period | Label, start, end, style, origin (seasonal, countdown, user) |
| Milestone | Linked event, type (exam, interview, deadline, trip), countdown steps |
| Profile | Goals, occupation, schedule notes, habits, long-term targets, time zone, animation setting |

**How a sentence becomes an event.** The agent service sends the sentence plus a small slice of context (today's date, time zone, the selected drag range and nearby events) to the language model, which must answer with a fixed list of actions such as create event, change event, delete event, set day theme and set period. Each action is checked against a schema before it is saved. Undo is the inverse action. Dates are stored in UTC with the user's time zone alongside, and repeats use the standard iCalendar repeat rule format.

**Speed.** The target is under 1.5 seconds from pressing Enter to the event appearing for 90 percent of requests. A ghost capsule appears the instant the user presses Enter, so the interface never feels like it is waiting.

**Client**

- Calendar view: HTML and CSS transforms for day strips, with virtualized rendering in month view and the fading grid lines drawn as gradients.
- KOIOS: real-time 3D drawn by a small WebGL renderer with an animation clip system, and the 2D vector fallback described in section 4.
- Intro line: a single canvas or SVG path with a damped-wave animation, no 3D needed.
- Budgets: first paint under 1 second, 3D model under 1 MB, 60 frames per second during idle animation.

**Privacy.** Onboarding answers and calendar contents are personal. Only the context needed for a request is sent to the language model, and users can export or delete all their data.

## 13. Roadmap, risks and open questions

The plan builds in four phases and moves on only when a gate is passed; dates will be added once the build team and the 3D approach are chosen.

The second phase carries the product's central promise: a sentence or a drag becomes an event with no confirmation step.

**Success measures** (targets to be set after prototype testing)

- Time from sign-up to the first event on the calendar.
- Share of events created by a drag or a sentence that the user never edits afterward.
- Share of new users who complete personalization, and how many skip it.
- Share of users who set animation to Calm or Off, as a signal that animation is getting in the way.
- How often countdown reminders are dismissed without use.

**Risks**

| Risk | Mitigation |
|---|---|
| Cute animation slows power users | Time budgets on every animation, skip on any input, an intensity setting |
| KOIOS creates a wrong event with no confirmation | A one-line note from KOIOS stating what it added, non-blocking undo, learning from edits |
| Dates, times or time zones are misread | Structured actions checked against a schema, time zone from the profile, a question only when no day can be found |
| The non-grid layout is harder to read | The ruler stays close to every point in a day, a high-contrast option, test with real users |
| 3D is too heavy for some devices | 2D sprite fallback, a model size budget |
| Too many themes and colors become noise | Limit simultaneous themed items, intensity setting, blue family by default |

**Open questions**

1. KOIOS now follows the reference image's design language (visor, glowing eyes, banded ears, floating parts) with a softer, cuter build. Is the balance right, and should the default body stay blue, as the brief says, or switch to the reference's pearl white with blue bands? Both are in the prototype.
2. The drag example reads "10PM-12PM". This plan assumes 10 PM to 12 AM (midnight). Please confirm.
3. This plan reads recurring events as flexible habits served by the sidebar and fixed events as exact-time events. Please confirm that matches your intent.
4. Should KOIOS add study blocks before an exam on its own, or only offer them? The plan offers them (section 10).
5. Are non-blue theme colors allowed for days and periods if a user opts in? The plan allows it (section 2).
6. The brief numbers its points 1, 2, 3, 4 and then 6. If there was a point 5, please send it.
7. The plan assumes a web app first. Please confirm, or say if mobile comes first.

## 14. Revision 2: what the latest prototype changed

The website prototype was revised after review. These notes record what changed, so the plan and the prototype stay in step.

**Calendar canvas.** The day now covers the full 24 hours with vertical scroll and opens at 6 AM. The time axis zooms like a map: labels step 4 h, 2 h, 1 h, 30 min, 15 min (8 to 240 px per hour) with Ctrl or Cmd and scroll, pinch, or the minus and plus buttons. Day-count zoom (Day, 3 Days, Week, Month) is separate.

**Reminder bands.** The bands above the days are static. Each week takes a theme from its season or the nearest festival, with a small icon and no animation.

**Habits.** The habit rail can add and delete habits (with undo). Dragging a habit onto the calendar always shows the time before release: a ghost capsule on the day, time tags on the ruler, and a chip reading, for example, Piano, Tuesday, 1:45 to 2:30 PM. Snapping is 15 minutes.

**Onboarding.** Three questions only: day to day, habits, anything else. The AI reads the free-text answers and sets up classes, habits, day themes and countdowns; a local parser covers the same ground when the AI is unavailable.

**AI layer.** Any sentence is sent to Claude together with a small snapshot of the calendar, and Claude answers with structured actions that the page validates before applying: create, move, change or delete events, add, recolor or delete habits, name days and weeks, zoom, jump to a date, and ask a question when something is truly missing. Examples that work: help create a study plan for tomorrow's chem session; make the Piano habit red; zoom to 15 minutes. The first request asks the viewer for one-time permission. If it is declined or unavailable, KOIOS keeps working in Basic mode with the local parser and says so.

**Security note.** No API key is embedded in the page. A key placed in a web page is visible to every visitor, and the page cannot call outside services directly. Production should call the model from the agent service (section 12), where keys stay on the server. A vector database key (such as Pinecone) is not a language model key; it would only be used for memory search, again server-side.

**Fonts.** Optima everywhere, with the Candara then Belleza fallback described in section 2.

## 15. Revision 3: day tasks, month grid, Prism and Account

- **Onboarding (habits).** One chatbox only. Habits are floating bubbles (10 presets); typing a habit into the main box adds a bubble. Generic words such as "other" are ignored. On phones the bubbles, bot and chatbox are stacked so they no longer overlap.
- **Day tasks.** Whole-day items with no time, shown as solid colour bars in a lane under the day headers. Same structure as other tasks (title, description, colour, milestone tick box) with a date only. Drag across days to create; drag a bar to move it; drag either end to stretch it. KOIOS creates them from sentences like "I will be writing my Lit Essay for the next two days".
- **Month view.** An ordinary Mon to Sun grid with every day in order. It shows day tasks and milestone reminders only, and day tasks are the only thing you can create there.
- **Timed tasks.** Drag to another time or day; drag the top edge up or the bottom edge down to resize (15-minute snapping, Escape cancels, Undo offered; press and hold on touch).
- **Week themes.** Only week themes sit above the dates, each with its own colour blend and emoji. Turning them off removes the band and the calendar re-stretches to fit.
- **Prism.** A crystal-shaped tab beside Personalize listing every milestone, nearest first, with a countdown in months, weeks and days.
- **Account.** Profile, calendar colour theme (9 options), KOIOS colour (stripes and eyes only), time zone, reminders, connected calendars, copy calendar as text, delete all events, sign out. On phones Personalize moves into this panel.
- **Known limits.** Connected calendars, the weekly email and plans are placeholders until a backend exists.
