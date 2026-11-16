/* =========================================================
   KOIOS website prototype
   one page, three views (home, onboarding, calendar) and ONE agent that lives
   in all of them and flies between anchors. Voice is simulated (no device APIs here).
   Understanding: the page asks Claude (sample capability) to read every sentence, with a local parser as fallback.
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const TODAY_S = ymd(TODAY);
const N_DAYS = 90, WIN_BACK = 7;
const WIN_START = addDays(TODAY, -WIN_BACK);
const WIN_START_S = ymd(WIN_START), WIN_END_S = ymd(addDays(WIN_START, N_DAYS - 1));
const DAY0 = 0, PAD = 16, LPAD = 56; let HEAD_OFF = 106;           // full 24 hour day; HEAD_OFF = band + day header height
let HPX_DEF = 40, HPX_MIN = 12; const HPX_MAX = 240;                 // pixels per hour
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const idxOf = ds => Math.round((fromYmd(ds) - WIN_START) / 864e5);
const dateAt = i => ymd(addDays(WIN_START, i));
const mondayIdx = d => (d.getDay() + 6) % 7;
let uidN = 0; const nid = () => 'e' + (++uidN);

const DEFAULT_PREF = { themes: true, seasons: true, counts: true, remind: true, anim: 'full' };
const DEFAULT_THEMES = () => [];                      // a fresh calendar is completely empty
const S = {
  view: 'home', events: [], habits: [], themes: DEFAULT_THEMES(), weekThemes: {}, pref: { ...DEFAULT_PREF },
  zoom: 'week', hpx: HPX_DEF, pending: null, last: null, awaiting: null, drop: new Set(), profile: {}, personalized: false,
  reminded: false, busy: false, undo: null, aiBusy: false
};
const placeAnim = () => S.pref.anim !== 'off' && !REDUCED;

/* ---------- colours ---------- */
const COLOR_NAMES = {
  red: '#E5484D', crimson: '#C2203C', orange: '#F2800C', amber: '#F5A524', yellow: '#E8B800', gold: '#D4A017', lime: '#7CC21A', green: '#2FA866',
  emerald: '#10A37F', teal: '#14A3A8', cyan: '#1FB9E0', aqua: '#1FB9E0', turquoise: '#1FB9E0', sky: '#5AA9FF', blue: '#2F6BFF', navy: '#173FB4',
  indigo: '#4C57E8', purple: '#8B5CF6', violet: '#7C4DFF', lavender: '#A78BFA', pink: '#EC5A9C', magenta: '#D946A8', rose: '#F4577A',
  brown: '#8B5E3C', gray: '#7C8AA5', grey: '#7C8AA5', silver: '#A8B3C9', black: '#1B2336', coral: '#F0716A', mint: '#4CC9A0', peach: '#F6A57C'
};
function parseColor(v) {
  if (!v) return null; v = String(v).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase();
  return COLOR_NAMES[v] || null;
}
const COLOR_WORDS = Object.keys(COLOR_NAMES).join('|');
const DEF_HAB = ['#1FB9E0', '#7F8FF4', '#4C57E8', '#86B6FF'];

/* ---------- sequencing helpers ---------- */
const CANCEL = Symbol('cancel');
let runId = 0;
function seq() {
  const id = ++runId;
  return { ok: () => id === runId, sleep: ms => new Promise((res, rej) => setTimeout(() => (id === runId ? res() : rej(CANCEL)), ms)) };
}
async function guard(fn) { try { await fn(); } catch (e) { if (e !== CANCEL) console.error(e); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

/* =========================================================
   THE AGENT (3D when WebGL is available, flat drawing otherwise)
   ========================================================= */
const agentEl = $('#agent');
const HAS3D = typeof Koios3D !== 'undefined' && Koios3D.supported();
const fig = HAS3D ? new Koios3D($('#agentFig'), { follow: true, w: 400 }) : new KoiosFigure($('#agentFig'), { follow: true });
const idle = new IdleDirector(fig, { isBusy: () => S.busy || S.typing || S.aiBusy || S.view === 'onboarding', first: 6000, min: 12000, max: 26000 });
let agentPos = { x: 0, y: 0, w: 92 };

function rectIn(el) { const a = app.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; }
function agentTo(x, y, w, ms = 600, lean = true) {
  const dx = x - agentPos.x;
  agentEl.style.setProperty('--ms', ms + 'ms');
  agentEl.style.transform = `translate(${x}px,${y}px)`;
  agentEl.style.width = w + 'px';
  agentPos = { x, y, w };
  if (lean && ms > 0) { fig.lean(clamp(dx / 55, -9, 9)); setTimeout(() => fig.lean(0), Math.max(80, ms * 0.85)); }
  return new Promise(r => setTimeout(r, ms));
}
const ANCHORS = { home: '#homeAnchor', onboarding: '#obAnchor', calendar: '#agentHome' };
let parkEl = null;
function park(el, ms = 0) {
  parkEl = el;
  const r = rectIn(el);
  const w = Math.min(r.w, r.h * 400 / 440);
  return agentTo(r.x + (r.w - w) / 2, r.y + (r.h - w * 1.1) / 2, w, REDUCED ? 0 : ms, ms > 0);
}
function agentHomeNow(ms = 600) { return park($(ANCHORS[S.view]), ms); }
addEventListener('resize', () => { if (!placing && parkEl) park(parkEl, 0); fitCalendar(); });

/* click on the agent */
agentEl.addEventListener('click', () => {
  if (S.busy || S.aiBusy) return;
  if (S.view === 'calendar') { fig.play('wave'); $('#chatInput').focus(); bubble('Tell me what to add, change or plan. I can also read a drag.', { ms: 3200 }); }
  else if (!fig.busy) { fig.busy = true; (HAS3D ? fig.play(['spin', 'turn', 'wave', 'nod'][Math.floor(Math.random() * 4)]) : fig.play('wave')).then(() => { fig.busy = false; }); }
});

/* =========================================================
   VIEW ROUTING
   ========================================================= */
const homeLine = new StringLine($('#homeLine'), { amp: 30, width: 3, startVisible: false });
const obLine = new StringLine($('#obLine'), { amp: 26, width: 3, startVisible: false });
const NAMES = ['home', 'onboarding', 'calendar'];

function show(name, opts = {}) {
  if (!NAMES.includes(name)) name = 'home';
  const q = seq();
  S.view = name; app.dataset.view = name;
  $$('.view').forEach(v => v.classList.toggle('on', v.id === name));
  $$('.proto button').forEach(b => { if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  hideBubble(); closePops(); clearPending();
  try { if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ }
  if (name === 'home') guard(() => enterHome(q));
  else if (name === 'onboarding') guard(() => enterOb(q));
  else guard(() => enterCal(q, opts));
}
addEventListener('hashchange', () => { const n = location.hash.slice(1); if (n && n !== S.view) show(n); });
$$('.proto button').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));

/* ---------- HOME: the 3-second entrance ---------- */
async function enterHome(q) {
  const brand = $('#brand'), tag = $('#tagline'), por = $('#portals');
  [brand, tag, por].forEach(e => e.classList.remove('in'));
  fig.setMood('neutral'); fig.setPose('rest');
  homeLine.hide();
  if (!agentEl.classList.contains('on')) { agentEl.style.opacity = 0; }
  await nextFrame();
  park($('#homeAnchor'), 0);
  agentEl.classList.remove('on'); agentEl.style.opacity = '';
  homeLine.sweep(800);                                   // 0.0s  the line sweeps left to right
  await q.sleep(800); homeLine.pluck(0.5, 30);            // 0.8s  struck like a violin string
  await q.sleep(400); brand.classList.add('in');          // 1.2s  KOIOS appears below it
  await q.sleep(300); agentEl.classList.add('on'); fig.setMood('happy'); fig.play(HAS3D ? 'twirl' : 'hop'); // 1.5s the agent floats in
  await q.sleep(400); tag.classList.add('in');            // 1.9s
  await q.sleep(400); por.classList.add('in');            // 2.3s portals, fully in by 3.0s
  await q.sleep(700); fig.setMood('neutral');
}
$('#getStarted').addEventListener('click', () => show('onboarding'));
$('#login').addEventListener('click', () => show('calendar'));

/* ---------- ONBOARDING: a short, friendly conversation. Mostly taps, never a form. ---------- */
const HABIT_OPTS = [['Running', 'Running'], ['Playing piano', 'Piano'], ['Playing violin', 'Violin'], ['Studying', 'Study'], ['Reading', 'Reading'], ['Yoga', 'Yoga'], ['Meditation', 'Meditation'], ['Gardening', 'Gardening'],
  ['Gym', 'Gym'], ['Cooking', 'Cooking']];
const HAB_DUR = { Running: 45, Piano: 45, Violin: 45, Study: 90, Reading: 30, Yoga: 30, Meditation: 15, Gardening: 45, Gym: 60, Swimming: 45, Cooking: 45, Journaling: 15, Cycling: 60, Hiking: 90, Drawing: 45, Language: 30 };
const HOURS = { morning: [480, 720], day: [540, 1020], afternoon: [720, 1020], evening: [1020, 1260] };
const OB_DEMO = { hello: 'Hi KOIOS!', offer: 'Personalize', habits: 'Painting, and swimming', daily: 'I work part time', hours: 'Mornings', goals: 'Product launch Dec 3', done: 'Take me there' };
let obToken = 0, obStep = 'hello', obReady = false, OBS = { habits: new Set(), kind: null, hours: null, goals: [], free: [] };
const sayEl = $('#say'), obInput = $('#obInput'), obChoices = $('#obChoices');
const titleCase = t => t.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toUpperCase()).slice(0, 28);

async function typeSay(text, token) {
  sayEl.textContent = '';
  if (REDUCED) { sayEl.textContent = text; return; }
  const caret = document.createElement('span'); caret.className = 'caret';
  const txt = document.createTextNode(''); sayEl.append(txt, caret);
  const delay = clamp(1100 / text.length, 10, 24);
  for (let i = 1; i <= text.length; i++) {
    if (token !== obToken) return;
    txt.nodeValue = text.slice(0, i);
    await sleep(delay);
  }
  caret.remove();
}
const obHint = t => { $('#obHint').textContent = t; };
function pill(label, { solid = false, on } = {}) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pill' + (solid ? ' solid' : ''); b.textContent = label;
  if (on) b.addEventListener('click', () => { if (obReady) on(b); });
  return b;
}
function popIn(els) { els.forEach((el, i) => { el.classList.add('popin'); el.style.animationDelay = (i * 55) + 'ms'; }); }
function setChoices(els, cls = '') { obChoices.innerHTML = ''; obChoices.className = 'obChoices ' + cls; obChoices.append(...els); popIn(els); setTimeout(() => { if (typeof parkOb === 'function') parkOb(); }, 30); }
async function obSay(text, token, mood = 'happy') {
  fig.setMood(mood); await typeSay(text, token);
  if (token !== obToken) return false;
  fig.setMood('neutral'); return true;
}
async function enterOb(q) {
  const token = ++obToken; obReady = false; OBS = { habits: new Set(), kind: null, hours: null, goals: [], free: [] };
  sayEl.textContent = ''; obChoices.innerHTML = ''; obInput.value = '';
  fig.setMood('neutral'); fig.setPose('rest');
  obLine.hide(); agentEl.classList.add('on');
  await nextFrame();
  park($('#obAnchor'), 900);
  await q.sleep(250); obLine.sweep(700);                  // the blue line strikes again
  await q.sleep(700); obLine.pluck(0.5, 24);
  await q.sleep(450);
  if (token === obToken) obGo('hello', token);
}
async function obGo(step, token = obToken) {
  obStep = step; obReady = false; obChoices.innerHTML = ''; obInput.value = '';
  if (step !== 'hello') obLine.pluck(0.5, 9);
  switch (step) {
    case 'hello': {
      obInput.placeholder = 'Say hi, or type anything. “skip” goes straight to the calendar.';
      obHint('Tap a button, type, or tap the mic. Whatever is easiest.');
      fig.setMood('happy'); fig.play('wave');
      if (!await obSay("Hey there! I'm KOIOS.", token)) return;
      obReady = true;
      setChoices([pill('Hi KOIOS!', { solid: true, on: () => obHi('Hi KOIOS!') })]); break;
    }
    case 'offer': {
      obInput.placeholder = 'Type “personalize” or “skip”…';
      if (!await obSay("I'm here to organize your schedule. Set it up now, or skip for now?", token)) return;
      obReady = true;
      setChoices([pill('Personalize', { solid: true, on: () => obGo('habits') }), pill('Skip for now', { on: () => obSkip() })]); break;
    }
    case 'habits': {
      obInput.placeholder = innerWidth < 520 ? 'Add your own habit…' : 'Or type your own habit here and press Enter';
      obHint('Tap any that fit. Anything you type below joins your picks.');
      if (!await obSay("Great! Let's get started. What are some of your habits?", token)) return;
      obReady = true; renderHabitCloud(); break;
    }
    case 'daily': {
      obInput.placeholder = 'Or describe your days in your own words';
      obHint('');
      if (!await obSay('Nice. And what does your day-to-day look like?', token)) return;
      obReady = true;
      setChoices([['Student', 'student'], ['Working', 'work'], ['Both', 'both'], ['Flexible schedule', 'flex']].map(([l, k]) => pill(l, { on: () => obPickKind(k, l) }))); break;
    }
    case 'hours': {
      obInput.placeholder = 'Or type your hours, e.g. 9 to 3';
      const q = OBS.kind === 'work' ? 'When do you usually work?' : OBS.kind === 'student' ? 'When are your classes, usually?' : 'When is your busiest stretch?';
      if (!await obSay(q, token)) return;
      obReady = true;
      setChoices([['Mornings', 'morning'], ['Daytime, 9 to 5', 'day'], ['Afternoons', 'afternoon'], ['Evenings', 'evening'], ['It varies', 'varies']].map(([l, k]) => pill(l, { on: () => { OBS.hours = k; obHint('You: “' + l + '”'); obGo('goals'); } }))); break;
    }
    case 'goals': {
      obInput.placeholder = 'e.g. “Chem midterm Nov 20” or “Interview next Tuesday 2PM”';
      obHint('Type it, KOIOS will add it as a milestone.');
      if (!await obSay('Anything big coming up? Tell me, or skip.', token)) return;
      obReady = true;
      setChoices([pill('Nothing yet', { solid: true, on: () => obFinishSetup() })]); break;
    }
    case 'done': break;
  }
}
function obHi(text) {
  obReady = false; obHint('You: “' + text + '”'); obChoices.innerHTML = '';
  fig.setMood('happy'); fig.play(HAS3D ? 'spin' : 'hop');
  setTimeout(() => { if (obStep === 'hello') obGo('offer'); }, 900);
}
const parkOb = () => { if (S.view === 'onboarding' && !placing) park($('#obAnchor'), 0); };
function obSkip() { obToken++; show('calendar'); }
function obPickKind(k, label) {
  OBS.kind = k; obHint('You: “' + label + '”'); fig.play('nod');
  obGo(k === 'flex' ? 'goals' : 'hours');
}
/* the habit cloud: scattered tappable choices, plus an "Other" box that adds without touching your picks */
function renderHabitCloud() {
  const wrap = document.createElement('div'); wrap.className = 'cloud';
  const chips = new Map();
  const next = pill('Skip', { solid: true, on: () => obGo('daily') }); next.classList.add('obNext');
  const sync = () => { next.textContent = OBS.habits.size ? 'Next' : 'Skip'; };
  const scatter = el => { el.classList.add('cloudchip'); el.style.setProperty('--dx', (Math.random() * 14 - 7).toFixed(1) + 'px'); el.style.setProperty('--dy', (Math.random() * 14 - 7).toFixed(1) + 'px'); el.style.setProperty('--rot', (Math.random() * 4 - 2).toFixed(1) + 'deg'); };
  const mk = (label, name, on) => {
    const b = pill(label); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('solid', !!on); scatter(b); chips.set(name.toLowerCase(), b);
    b.addEventListener('click', () => {
      if (!obReady) return;
      const sel = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', sel); b.classList.toggle('solid', sel);
      if (sel) { OBS.habits.add(name); fig.play('nod'); } else OBS.habits.delete(name);
      sync();
    });
    return b;
  };
  const add = text => {
    const parts = String(text).split(/,|;|\band\b|&/i).map(x => x.replace(/^(i |i'm |my |playing |doing |also )+/i, '').trim()).filter(x => x.length > 1 && !/^(other|others|something else|misc|more|none|nothing|etc)\.?$/i.test(x)).slice(0, 6);
    if (!parts.length) { obHint('Type the habit itself, like “Chess”. Your picks stay selected.'); return; }
    const added = [];
    parts.forEach(p => {
      const name = titleCase(p), key = name.toLowerCase(), hit = chips.get(key) || [...chips.entries()].find(([k]) => k.startsWith(key.slice(0, 5)) && key.length >= 4)?.[1];
      if (hit) { if (hit.getAttribute('aria-pressed') !== 'true') hit.click(); return; }
      const b = mk(name, name, true); OBS.habits.add(name); wrap.append(b); b.classList.add('popin'); added.push(name);
    });
    sync(); if (added.length) { obHint('Added ' + added.join(', ') + '. Your other picks are still selected.'); fig.play('nod'); }
  };
  HABIT_OPTS.forEach(([l, n], i) => { const c = mk(l, n, false); c.classList.add('pre', 'p' + (i + 1)); wrap.append(c); });
  obChoices.innerHTML = ''; obChoices.className = 'obChoices col';
  const row = document.createElement('div'); row.className = 'nextRow'; row.append(next);
  obChoices.append(wrap, row); popIn([...wrap.children]); popIn([next]);
  if (typeof parkOb === 'function') setTimeout(parkOb, 30);
  obChoices._add = add; sync();
}
/* whatever the user types, at any point */
function obChat(raw) {
  const low = raw.toLowerCase().trim();
  obHint('You: “' + (raw.length > 70 ? raw.slice(0, 70) + '…' : raw) + '”');
  if (/\b(skip|straight|just show|go to (the )?calendar|take me (to|there)|jump|no thanks|not now|later|nevermind|never mind)\b/.test(low) && obStep !== 'goals' && obStep !== 'done') return obSkip();
  if (!obReady) return;
  switch (obStep) {
    case 'hello': if (/^(hi|hey|hello|yo|hiya|howdy|good (morning|afternoon|evening))\b/.test(low) || low.length < 40) return obHi(raw); break;
    case 'offer': if (/\b(skip|no)\b/.test(low)) return obSkip(); return obGo('habits');
    case 'habits': if (obChoices._add) obChoices._add(raw); return;
    case 'daily': {
      const st = /\b(student|class|school|college|university|uni|freshman|sophomore|junior|senior|study)/.test(low), wk = /\b(work|job|intern|office|employ|career|shift)/.test(low), fl = /\b(flex|freelanc|vari|self.?employed|no schedule)/.test(low);
      OBS.free.push(raw); return obPickKind(st && wk ? 'both' : st ? 'student' : wk ? 'work' : 'flex', raw.length > 36 ? raw.slice(0, 36) + '…' : raw);
    }
    case 'hours': {
      const rg = parseTimeRange(raw.replace(/\bto\b/gi, '-'));
      if (rg) { OBS.hours = { start: rg.start, end: rg.end }; return obGo('goals'); }
      const k = /morning/.test(low) ? 'morning' : /afternoon/.test(low) ? 'afternoon' : /evening|night/.test(low) ? 'evening' : /9.*5|day/.test(low) ? 'day' : null;
      if (k) { OBS.hours = k; return obGo('goals'); }
      OBS.free.push(raw); return obGo('goals');
    }
    case 'goals': {
      const r = parseCommand(raw, { now: NOW, pending: null, last: null, awaiting: null });
      if (r.intent === 'create' && r.date && r.title && r.title !== 'Event') {
        const start = r.start != null ? r.start : prefFor(r.title), end = r.end != null ? r.end : Math.min(1440, start + 120);
        OBS.goals.push(mkEvent({ title: r.title, date: r.date, start, end, kind: 'once', milestone: true }));
        obHint('Added milestone: ' + r.title + ', ' + dayLabel(r.date, NOW) + '. Add another, or tap Done.');
        fig.setMood('happy'); fig.play('nod');
        const b = $('.pill', obChoices); if (b) { b.textContent = 'Done'; }
        return;
      }
      if (/\b(nothing|none|that'?s all|done|no)\b/.test(low)) return obFinishSetup();
      if (r.intent === 'ask' || (r.intent === 'create' && !r.date)) { obHint('Which day? Try “' + titleCase(r.title || raw) + ' Nov 20”.'); return; }
      OBS.free.push(raw); obHint('Noted. I will use that.'); return;
    }
    case 'done': if (/personali|look|theme/.test(low)) { obToken++; return show('calendar', { personalize: true }); } obToken++; return show('calendar');
  }
}
$('#obForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const val = obInput.value.trim(); if (!val) return;
  obInput.value = ''; obChat(val);
});
async function obFinishSetup() {
  const token = obToken; obReady = false; obChoices.innerHTML = '';
  obLine.pluck(0.5, 14); fig.setMood('working'); if (HAS3D) fig.setPose('laptop');
  sayEl.textContent = 'Setting things up…'; obHint('');
  const t0 = performance.now();
  S.personalized = true; S.events = []; S.habits = []; S.themes = []; S.weekThemes = {}; S.last = null; S.reminded = false;
  S.profile = { summary: { student: 'a student', work: 'working', both: 'a student who works', flex: 'on a flexible schedule' }[OBS.kind] || '' };
  OBS.habits.forEach(n => addHabit(n, { dur: HAB_DUR[n] }));
  const hrs = OBS.hours && OBS.hours !== 'varies' ? (typeof OBS.hours === 'object' ? [OBS.hours.start, OBS.hours.end] : HOURS[OBS.hours]) : null;
  if (hrs && OBS.kind && OBS.kind !== 'flex') addSeries(OBS.kind === 'student' ? 'Classes' : OBS.kind === 'work' ? 'Work' : 'Classes and work', [1, 2, 3, 4, 5], hrs[0], hrs[1], 'fixed');
  S.events.push(...OBS.goals);
  const free = OBS.free.slice(0, 3);
  if (free.length && await getSample() && !S.aiOff) {
    for (const t of free) { try { const res = await askClaude(chatPrompt(t), 30000); if (res && Array.isArray(res.actions)) applyActions(res.actions); } catch (e) { break; } }
  }
  if (performance.now() - t0 < 1300) await sleep(1300 - (performance.now() - t0));
  if (token !== obToken) return;
  fig.setPose('rest'); fig.setMood('happy'); fig.play(HAS3D ? 'twirl' : 'hop'); obLine.pluck(0.5, 14);
  obStep = 'done';
  const bits = [OBS.habits.size ? OBS.habits.size + ' habit' + (OBS.habits.size > 1 ? 's' : '') : '', OBS.goals.length ? OBS.goals.length + ' milestone' + (OBS.goals.length > 1 ? 's' : '') : ''].filter(Boolean);
  await typeSay(bits.length ? `All set! I added ${bits.join(' and ')}. Ready for your calendar?` : 'All set! Ready for your calendar?', token);
  if (token !== obToken) return;
  obReady = true; obInput.placeholder = 'Type “personalize” to tweak the look';
  setChoices([pill('Take me there', { solid: true, on: () => { obToken++; show('calendar'); } }), pill('Personalize the look', { on: () => { obToken++; show('calendar', { personalize: true }); } })]);
  obHint('You can change anything later, just by telling me.');
}
$('#obSkip').addEventListener('click', () => { obToken++; show('calendar'); });

/* simulated voice */
const micTimers = new Map();
function toggleMic(btn, input, demo, ph) {
  if (micTimers.has(btn)) { micTimers.get(btn).forEach(clearTimeout); micTimers.delete(btn); btn.classList.remove('live'); input.placeholder = ph; return; }
  btn.classList.add('live'); input.placeholder = 'Listening… (voice is simulated here)';
  const ts = [];
  const words = demo.split(' ');
  ts.push(setTimeout(() => {
    words.forEach((w, i) => ts.push(setTimeout(() => { input.value = words.slice(0, i + 1).join(' '); input.dispatchEvent(new Event('input')); }, i * 110)));
    ts.push(setTimeout(() => { btn.classList.remove('live'); input.placeholder = ph; micTimers.delete(btn); input.focus({ preventScroll: true }); }, words.length * 110 + 200));
  }, 1100));
  micTimers.set(btn, ts);
}
$('#obMic').addEventListener('click', () => toggleMic($('#obMic'), obInput, OB_DEMO[obStep] || 'Hi KOIOS!', obInput.placeholder));
/* example sentences are generic and random: they never describe the user */
const EXAMPLES = ['Add lunch with Sam tomorrow at 12:30', 'Block two hours for deep work on Friday morning', 'Move tomorrow’s dentist visit to 5PM', 'Plan a study session for my next exam', 'Make my Reading habit green', 'Add a birthday dinner on Saturday 7PM as a milestone', 'Call Mom every Sunday at 6PM', 'Clear my Wednesday afternoon', 'Add a project deadline next Thursday', 'Remind me to stretch every weekday at 3PM', 'Add a yoga habit and make it purple', 'Show me every 15 minutes'];
const pickExamples = n => { const a = EXAMPLES.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
let demoN = 0, EX = pickExamples(4);
const nextExample = () => EX[demoN++ % EX.length];
$('#chatMic').addEventListener('click', () => toggleMic($('#chatMic'), $('#chatInput'), nextExample(), $('#chatInput').placeholder));
