
/* =========================================================
   CALENDAR DATA
   ========================================================= */
const habitByName = n => { n = String(n || '').trim().toLowerCase(); return S.habits.find(h => h.name.toLowerCase() === n) || S.habits.find(h => h.name.toLowerCase().startsWith(n.slice(0, 5)) && n.length >= 3); };
function addHabit(name, o = {}) {
  name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 28); if (!name) return null;
  const old = habitByName(name); if (old && old.name.toLowerCase() === name.toLowerCase()) return old;
  const id = 'h' + (++uidN);
  const h = { id, name, color: parseColor(o.color) || DEF_HAB[S.habits.length % DEF_HAB.length], dur: clamp(Math.round((+o.dur || durFor(name)) / 15) * 15, 15, 480), pref: prefFor(name) };
  S.habits.push(h); return h;
}
function removeHabit(h, removeEvents) {
  S.habits = S.habits.filter(x => x !== h);
  if (removeEvents) S.events = S.events.filter(e => e.title.toLowerCase() !== h.name.toLowerCase());
}
function addHabitsFromText(t) {
  const words = ['running', 'piano', 'gym', 'reading', 'study', 'yoga', 'meditation', 'swimming', 'guitar', 'violin', 'stretching', 'cycling', 'journaling', 'cooking'];
  const out = [];
  words.forEach(w => { if (new RegExp('\\b' + w.slice(0, 5), 'i').test(t)) out.push(addHabit(w.charAt(0).toUpperCase() + w.slice(1))); });
  renderHabits(); return out.filter(Boolean);
}
function colorOf(e) {
  if (e.color) return e.color;
  const h = S.habits.find(x => x.name.toLowerCase() === e.title.toLowerCase());
  return h ? h.color : null;
}
function mkEvent(o) { if (o.allDay) { o.start = 0; o.end = 1440; } return { id: nid(), title: o.title, date: o.date, start: o.start, end: o.end, kind: o.kind || 'once', milestone: !!o.milestone, series: o.series || null, color: o.color || null, desc: String(o.desc || '').slice(0, 600), allDay: !!o.allDay, endDate: o.allDay ? (o.endDate && o.endDate >= o.date ? o.endDate : o.date) : null, hide: false }; }
function addSeries(title, days, start, end, kind, fromPast) {
  const series = nid(), out = [];
  for (let i = fromPast ? 0 : WIN_BACK; i < N_DAYS; i++) {
    const ds = dateAt(i);
    if (days.includes(fromYmd(ds).getDay())) out.push(mkEvent({ title, date: ds, start, end, kind, series }));
  }
  S.events.push(...out); return out;
}
function seedCalendar() { /* a new calendar starts completely empty: every habit and event is the user's own */ }

/* =========================================================
   WEEK THEMES: every week gets a season or a festival
   ========================================================= */
const ICONS = {
  leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4.5l3 2 3-2M9 19.5l3-2 3 2"/>',
  flower: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6 12 3 12 3s2 3 0 6.8zM14.2 12C18 10 21 12 21 12s-3 2-6.8 0zM12 14.2C14 18 12 21 12 21s-2-3 0-6.8zM9.8 12C6 14 3 12 3 12s3-2 6.8 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  wave: '<path d="M3 11c3-4 6 4 9 0s6 4 9 0M3 17c3-4 6 4 9 0s6 4 9 0"/>',
  pumpkin: '<path d="M12 7c-5 0-8 3-8 6s3 6 8 6 8-3 8-6-3-6-8-6zM12 7c0-2 1-3 2-4M9 8c-2 3-2 8 0 11M15 8c2 3 2 8 0 11"/>',
  tree: '<path d="M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  clover: '<circle cx="9" cy="9" r="3"/><circle cx="15" cy="9" r="3"/><circle cx="9" cy="15" r="3"/><circle cx="15" cy="15" r="3"/><path d="M12 12l5 8"/>',
  egg: '<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11zM6 14l3-2 3 2 3-2 3 2"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  firework: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5"/>',
  book: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
  lantern: '<path d="M9 3h6M8 5h8c1 3 1 9 0 12H8c-1-3-1-9 0-12zM10 17v3M14 17v3M12 5v12"/>',
  candle: '<path d="M12 3c1.5 2 1.5 3.5 0 4.5C10.5 6.5 10.5 5 12 3zM12 8v3M6 11h12v9H6z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  harvest: '<path d="M12 21V8M12 8c-3 0-4-2-4-4 3 0 4 2 4 4zM12 8c3 0 4-2 4-4-3 0-4 2-4 4zM12 14c-3 0-4-2-4-4M12 14c3 0 4-2 4-4"/>',
  gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-3 0-4-4-1-4 2 0 1 4 1 4zM12 7c3 0 4-4 1-4-2 0-1 4-1 4z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5.5c3 3 3 10 0 13M18 5.5c-3 3-3 10 0 13"/>'
};
const iconSvg = n => '<svg class="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || ICONS.star) + '</svg>';
const nthDow = (y, m, dow, n) => { let d = new Date(y, m, 1); while (d.getDay() !== dow) d = addDays(d, 1); return addDays(d, 7 * (n - 1)); };
const lastDow = (y, m, dow) => { let d = new Date(y, m + 1, 0); while (d.getDay() !== dow) d = addDays(d, -1); return d; };
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
const LUNAR = { 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3] };
const DIWALI = { 2026: [10, 8], 2027: [9, 29], 2028: [9, 17], 2029: [10, 5], 2030: [9, 26] };
const HANUK = { 2026: [11, 4], 2027: [11, 24], 2028: [11, 12], 2029: [11, 1], 2030: [11, 20] };
function holidaysFor(y) {        // in priority order
  const L = [];
  L.push({ d: nthDow(y, 10, 4, 4), label: 'Thanksgiving week', icon: 'harvest' });
  L.push({ d: new Date(y, 11, 25), label: 'Christmas week', icon: 'tree' });
  L.push({ d: new Date(y, 9, 31), label: 'Halloween week', icon: 'pumpkin' });
  L.push({ d: easter(y), label: 'Easter week', icon: 'egg' });
  if (LUNAR[y]) L.push({ d: new Date(y, LUNAR[y][0], LUNAR[y][1]), label: 'Lunar New Year week', icon: 'lantern' });
  if (DIWALI[y]) L.push({ d: new Date(y, DIWALI[y][0], DIWALI[y][1]), label: 'Diwali week', icon: 'candle' });
  if (HANUK[y]) L.push({ d: new Date(y, HANUK[y][0], HANUK[y][1]), label: 'Hanukkah begins', icon: 'candle' });
  L.push({ d: new Date(y, 0, 1), label: 'New Year week', icon: 'firework' });
  L.push({ d: new Date(y, 6, 4), label: 'Fourth of July week', icon: 'firework' });
  L.push({ d: new Date(y, 1, 14), label: "Valentine's week", icon: 'heart' });
  L.push({ d: new Date(y, 2, 17), label: "St. Patrick's week", icon: 'clover' });
  L.push({ d: nthDow(y, 4, 0, 2), label: "Mother's Day week", icon: 'flower' });
  L.push({ d: lastDow(y, 4, 1), label: 'Memorial Day week', icon: 'flag' });
  L.push({ d: nthDow(y, 8, 1, 1), label: 'Labor Day week', icon: 'flag' });
  L.push({ d: new Date(y, 10, 11), label: 'Veterans Day week', icon: 'flag' });
  L.push({ d: new Date(y, 5, 19), label: 'Juneteenth week', icon: 'star' });
  L.push({ d: nthDow(y, 0, 1, 3), label: 'MLK week', icon: 'star' });
  L.push({ d: new Date(y, 3, 22), label: 'Earth Day week', icon: 'leaf' });
  L.push({ d: new Date(y, 11, 31), label: "New Year's Eve week", icon: 'firework' });
  return L;
}
const SEASONS = [
  [1221, 9999, 'Early Winter', 'snow', '#86B6FF'], [0, 120, 'Early Winter', 'snow', '#86B6FF'], [121, 220, 'Deep Winter', 'snow', '#86B6FF'], [221, 319, 'Late Winter', 'snow', '#86B6FF'],
  [320, 420, 'Early Spring', 'flower', '#1FB9E0'], [421, 520, 'Spring Bloom', 'flower', '#1FB9E0'], [521, 620, 'Late Spring', 'flower', '#1FB9E0'],
  [621, 720, 'Early Summer', 'sun', '#2F6BFF'], [721, 820, 'High Summer', 'sun', '#2F6BFF'], [821, 921, 'Late Summer', 'wave', '#2F6BFF'],
  [922, 1014, 'Early Fall', 'leaf', '#7F8FF4'], [1015, 1108, 'Golden Fall', 'leaf', '#7F8FF4'], [1109, 1220, 'Late Fall', 'leaf', '#7F8FF4']
];
const ICON_EMOJI = { leaf: '🍂', snow: '❄️', flower: '🌸', sun: '☀️', wave: '🌊', pumpkin: '🎃', tree: '🎄', heart: '💝', clover: '☘️', egg: '🐣', star: '⭐', firework: '🎆', book: '📚', cap: '🎓', lantern: '🏮', candle: '🕯️', moon: '🌙', harvest: '🌾', gift: '🎁', flag: '🇺🇸', ball: '🏀' };
const ICON_LOOK = { leaf: ['#F2800C', '#E8B800'], snow: ['#86B6FF', '#C6D8FF'], flower: ['#F7A8D0', '#B8E986'], sun: ['#F5B700', '#1FB9E0'], wave: ['#1FB9E0', '#2F6BFF'], pumpkin: ['#F2800C', '#7A3FD1'], tree: ['#D6454B', '#2FA866'], heart: ['#F06C9B', '#E5484D'], clover: ['#2FA866', '#7CC21A'], egg: ['#F7A8D0', '#B8E986'], star: ['#7F8FF4', '#F5B700'], firework: ['#F5B700', '#7F8FF4'], book: ['#4C57E8', '#86B6FF'], cap: ['#4C57E8', '#F5B700'], lantern: ['#D6454B', '#F5B700'], candle: ['#F5A524', '#E5484D'], moon: ['#4C57E8', '#B05CE6'], harvest: ['#E8780C', '#E8B800'], gift: ['#D6454B', '#2FA866'], flag: ['#E5484D', '#2F6BFF'], ball: ['#F2800C', '#2F6BFF'] };
const LABEL_LOOK = [
  [/christmas/i, ['#D6454B', '#2FA866'], '🎄'], [/thanksgiving/i, ['#E8780C', '#B5651D'], '🦃'], [/halloween/i, ['#F2800C', '#7A3FD1'], '🎃'], [/easter/i, ['#F7A8D0', '#B8E986'], '🐣'],
  [/lunar/i, ['#D6454B', '#F5B700'], '🧧'], [/diwali/i, ['#F5A524', '#E5484D'], '🪔'], [/hanukkah/i, ['#2F6BFF', '#8FB8FF'], '🕎'], [/new year/i, ['#F5B700', '#7F8FF4'], '🎆'],
  [/fourth of july/i, ['#E5484D', '#2F6BFF'], '🎆'], [/valentine/i, ['#F06C9B', '#E5484D'], '💘'], [/patrick/i, ['#2FA866', '#7CC21A'], '☘️'], [/mother/i, ['#F7A8D0', '#F06C9B'], '💐'],
  [/memorial|labor|veterans/i, ['#E5484D', '#2F6BFF'], '🇺🇸'], [/juneteenth/i, ['#E5484D', '#2FA866'], '🎉'], [/mlk/i, ['#7F8FF4', '#2F6BFF'], '🕊️'], [/earth day/i, ['#2FA866', '#1FB9E0'], '🌍'],
  [/march madness/i, ['#F2800C', '#2F6BFF'], '🏀'], [/finals/i, ['#4C57E8', '#86B6FF'], '📚'],
  [/early winter|deep winter|late winter/i, ['#86B6FF', '#C6D8FF'], '❄️'], [/early spring/i, ['#7CC21A', '#F7A8D0'], '🌱'], [/spring bloom/i, ['#F7A8D0', '#B8E986'], '🌸'], [/late spring/i, ['#F06C9B', '#7CC21A'], '🌷'],
  [/early summer/i, ['#F5B700', '#1FB9E0'], '☀️'], [/high summer/i, ['#F2800C', '#F5B700'], '🌞'], [/late summer/i, ['#1FB9E0', '#F5B700'], '🌊'],
  [/early fall/i, ['#F5B700', '#F2800C'], '🍂'], [/golden fall/i, ['#E5484D', '#F5B700'], '🍁'], [/late fall/i, ['#C2531B', '#E8B800'], '🍂']
];
function themeLook(label, icon) {
  const hit = LABEL_LOOK.find(x => x[0].test(label));
  if (hit) return { c1: hit[1][0], c2: hit[1][1], emoji: hit[2] };
  const l = ICON_LOOK[icon] || ['#4C57E8', '#86B6FF'];
  return { c1: l[0], c2: l[1], emoji: ICON_EMOJI[icon] || '⭐' };
}
function weekTheme(mon) {
  const sun = addDays(mon, 6), monS = ymd(mon), ov = S.weekThemes[monS];
  let label, icon;
  if (ov) { label = ov.label; icon = ov.icon || 'star'; }
  else {
    for (const y of new Set([mon.getFullYear(), sun.getFullYear()])) {
      const hit = holidaysFor(y).find(h => h.d >= mon && h.d <= sun);
      if (hit) { label = hit.label; icon = hit.icon; break; }
    }
    if (!label) {
      const md0 = mon.getMonth() * 100 + mon.getDate();
      if (md0 >= 313 && md0 <= 407) { label = 'March Madness'; icon = 'ball'; }
      else { const ref = addDays(mon, 3), md = ref.getMonth() * 100 + ref.getDate(); const sn = SEASONS.find(x => md >= x[0] && md <= x[1]) || SEASONS[0]; label = sn[2]; icon = sn[3]; }
    }
  }
  return { label, icon, ...themeLook(label, icon) };
}

/* =========================================================
   CALENDAR VIEW: strips, ruler, bands, themes
   ========================================================= */
const calEl = $('#cal'), stripsEl = $('#strips'), bandsEl = $('#bands'), contentEl = $('#content'), rulerEl = $('#ruler');
const stripEls = [];
const Z = { day: { n: 1, gap: 14 }, '3': { n: 3, gap: 12 }, week: { n: 7, gap: 10 }, month: { n: 31, gap: 3 } };
let cur = { dayW: 140, gap: 10, hpx: HPX_DEF };

function buildStrips() {
  const frag = document.createDocumentFragment();
  const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  for (let i = 0; i < N_DAYS; i++) {
    const d = addDays(WIN_START, i), ds = ymd(d);
    const el = document.createElement('div');
    el.className = 'strip' + (ds === TODAY_S ? ' today' : '') + (d < TODAY ? ' past' : '');
    el.dataset.date = ds;
    const mo = (d.getDate() === 1 || i === 0) ? `<span class="mo">${MONTH_SHORT[d.getMonth()]}</span>` : '';
    el.innerHTML = `<div class="shead">${mo}<span class="wd">${DOW_NAMES[d.getDay()]}</span><span class="dn">${d.getDate()}</span><span class="tl"></span></div>` +
      `<div class="dgap" data-date="${ds}"></div>` +
      `<div class="sbody" data-date="${ds}"><div class="evs"></div>${ds === TODAY_S ? `<div class="now" style="--m:${nowMin}"></div>` : ''}</div>`;
    frag.append(el);
    stripEls.push({ date: ds, el, body: $('.sbody', el), evs: $('.evs', el), tl: $('.tl', el), sig: '' });
  }
  stripsEl.append(frag);
}

/* day themes: blue family by default */
const THEME_STYLE = { run: ['#1FB9E0', 'run'], jog: ['#1FB9E0', 'run'], gym: ['#4C57E8', 'pulse'], lift: ['#4C57E8', 'pulse'], hyrox: ['#4C57E8', 'pulse'], piano: ['#7F8FF4', 'keys'], music: ['#7F8FF4', 'keys'], study: ['#86B6FF', 'pulse'], read: ['#86B6FF', 'pulse'] };
function applyThemes() {
  stripEls.forEach(s => { s.el.classList.remove('themed'); s.el.removeAttribute('data-motion'); s.tl.textContent = ''; });
  if (!S.pref.themes) return;
  stripEls.forEach(s => {
    const dow = fromYmd(s.date).getDay();
    const th = S.themes.find(t => t.dow === dow);
    if (!th) return;
    const st = THEME_STYLE[th.word] || ['#2F6BFF', 'pulse'];
    s.el.classList.add('themed'); s.el.style.setProperty('--tint', st[0]); s.el.dataset.motion = st[1];
    s.tl.textContent = th.word.toUpperCase() + ' DAY';
  });
}

/* the head of the calendar: one week-theme lane (can be hidden), then the day-task lane. Everything below refits. */
let dtRows = 1;
function layoutHead() {
  const band = S.pref.seasons ? 28 : 0, dl = 10 + Math.max(1, dtRows) * 27, headH = 62;
  HEAD_OFF = band + headH + dl;
  app.style.setProperty('--bandH', band + 'px'); app.style.setProperty('--dlaneH', dl + 'px');
  bandsEl.style.display = band ? '' : 'none';
}
function renderBands() {
  bandsEl.innerHTML = '';
  if (!S.pref.seasons) return;
  let i = 0;
  while (i < N_DAYS) {
    const d = addDays(WIN_START, i), len = Math.min(N_DAYS - i, 7 - mondayIdx(d));
    const mon = addDays(d, -mondayIdx(d)), wt = weekTheme(mon);
    const b = document.createElement('div'); b.className = 'band';
    b.style.setProperty('--i', i); b.style.setProperty('--len', len); b.style.setProperty('--c1', wt.c1); b.style.setProperty('--c2', wt.c2);
    const inn = document.createElement('div'); inn.className = 'bin';
    const em = document.createElement('span'); em.className = 'be'; em.textContent = wt.emoji;
    const sp = document.createElement('span'); sp.textContent = wt.label; inn.append(em, sp); b.append(inn); b.title = wt.label; bandsEl.append(b);
    i += len;
  }
}

/* ---------- day tasks: whole-day items on top of each day; they can stretch across days ---------- */
const dayTasks = () => S.events.filter(e => e.allDay && !e.hide);
const daysBetween = (a, b) => Math.round((fromYmd(b) - fromYmd(a)) / 864e5);
function packLanes(items) {                  // greedy: each item gets the first row where it does not touch another
  const rows = [], out = [];
  items.slice().sort((x, y) => x.a.localeCompare(y.a) || y.b.localeCompare(x.b)).forEach(it => {
    let r = 0; while (rows[r] != null && rows[r] >= it.a) r++;
    rows[r] = it.b; out.push({ ...it, r });
  });
  return out;
}
function renderDayTasks() {
  const lane = $('#dlane'); lane.innerHTML = '';
  const items = packLanes(dayTasks().map(e => ({ e, a: e.date, b: e.endDate || e.date })));
  const rows = items.reduce((m, it) => Math.max(m, it.r + 1), 1), changed = rows !== dtRows;
  dtRows = clamp(rows, 1, 4);
  items.forEach(it => {
    if (it.r >= 4 || it.b < WIN_START_S || it.a > WIN_END_S) return;
    const a = it.a < WIN_START_S ? WIN_START_S : it.a, b = it.b > WIN_END_S ? WIN_END_S : it.b;
    const el = document.createElement('div'), col = colorOf(it.e);
    el.className = 'dt' + (it.e.milestone ? ' ms' : '') + (S.drop.has(it.e.id) ? ' drop' : '') + (it.a < a ? ' cl-l' : '') + (it.b > b ? ' cl-r' : '');
    if (col) el.style.setProperty('--ec', col);
    el.dataset.id = it.e.id; el.tabIndex = 0; el.setAttribute('role', 'button'); if (it.e.desc) el.title = it.e.desc;
    el.style.setProperty('--i', idxOf(a)); el.style.setProperty('--len', daysBetween(a, b) + 1); el.style.setProperty('--r', it.r);
    el.innerHTML = '<span class="h l"></span><b></b><span class="h r"></span>'; $('b', el).textContent = it.e.title;
    lane.append(el);
  });
  if (changed) { layoutHead(); if (calReady) fitCalendar(); }
}

/* ---------- month: an ordinary grid. Only day tasks and milestones live here ---------- */
let mMon = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
const monthNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function renderMonth() {
  const g = $('#mgrid'); if (!g) return;
  g.innerHTML = '';
  const first = mMon, last = new Date(first.getFullYear(), first.getMonth() + 1, 0), lead = mondayIdx(first), weeks = Math.ceil((lead + last.getDate()) / 7);
  const head = document.createElement('div'); head.className = 'mhead'; head.innerHTML = monthNames.map(n => `<span>${n}</span>`).join(''); g.append(head);
  const wk = document.createElement('div'); wk.className = 'mweeks'; g.append(wk);
  const start = addDays(first, -lead);
  const items = S.events.filter(e => !e.hide && (e.allDay || e.milestone)).map(e => ({ e, a: e.date, b: e.allDay ? (e.endDate || e.date) : e.date }));
  const bars = [];
  for (let w = 0; w < weeks; w++) {
    const row = document.createElement('div'); row.className = 'mw'; row.dataset.w = w;
    const ws = addDays(start, w * 7), wsS = ymd(ws), weS = ymd(addDays(ws, 6));
    for (let c = 0; c < 7; c++) {
      const d = addDays(ws, c), ds = ymd(d), cell = document.createElement('div');
      cell.className = 'mc' + (ds === TODAY_S ? ' today' : '') + (d.getMonth() !== first.getMonth() ? ' dim' : '') + (ds < WIN_START_S || ds > WIN_END_S ? ' out' : '');
      cell.dataset.date = ds; cell.dataset.c = c;
      const n = document.createElement('span'); n.className = 'n'; n.textContent = d.getDate() === 1 ? MONTH_SHORT[d.getMonth()] + ' 1' : d.getDate(); n.title = 'Open this day';
      cell.append(n); row.append(cell);
    }
    g.querySelector('.mweeks').append(row);
    const inWeek = packLanes(items.filter(it => it.b >= wsS && it.a <= weS).map(it => ({ ...it })));
    bars.push({ row, ws, wsS, weS, inWeek });
  }
  // second pass (needs layout): how many lanes fit in a row
  bars.forEach(({ row, wsS, weS, inWeek }) => {
    const fit = Math.max(1, Math.floor((row.clientHeight - 34) / 24)), hidden = {};
    inWeek.forEach(it => {
      const a = it.a < wsS ? wsS : it.a, b = it.b > weS ? weS : it.b, c0 = daysBetween(wsS, a), c1 = daysBetween(wsS, b);
      if (it.r >= fit) { for (let c = c0; c <= c1; c++) hidden[c] = (hidden[c] || 0) + 1; return; }
      const el = document.createElement('div'), col = colorOf(it.e);
      el.className = 'mbar' + (it.e.milestone ? ' ms' : '') + (S.drop.has(it.e.id) ? ' drop' : '') + (it.a < wsS ? ' cl-l' : '') + (it.b > weS ? ' cl-r' : '');
      if (col) el.style.setProperty('--ec', col);
      el.dataset.id = it.e.id; el.tabIndex = 0; el.setAttribute('role', 'button'); if (it.e.desc) el.title = it.e.desc;
      el.style.left = `calc((100% + 6px) / 7 * ${c0} + 1px)`; el.style.width = `calc((100% + 6px) / 7 * ${c1 - c0 + 1} - 8px)`; el.style.top = (32 + it.r * 24) + 'px';
      el.innerHTML = (it.e.allDay ? '<span class="h l"></span>' : '') + '<b></b>' + (it.e.allDay ? '<span class="h r"></span>' : ''); $('b', el).textContent = it.e.title;
      row.append(el);
    });
    Object.entries(hidden).forEach(([c, n]) => { const m = document.createElement('span'); m.className = 'more'; m.textContent = '+' + n; m.style.right = 'auto'; m.style.left = `calc((100% + 6px) / 7 * ${c} + 10px)`; row.append(m); });
  });
  updateRange();
}
const monthShift = n => { mMon = new Date(mMon.getFullYear(), mMon.getMonth() + n, 1); renderMonth(); };

function renderEvents() {
  const by = {};
  for (const e of S.events) { if (e.hide || e.allDay) continue; (by[e.date] = by[e.date] || []).push(e); }
  for (const s of stripEls) {
    const list = (by[s.date] || []).sort((a, b) => a.start - b.start || a.end - b.end);
    const sig = list.map(e => [e.id, e.title, e.start, e.end, e.kind, e.milestone, colorOf(e), e.desc || '', S.drop.has(e.id)].join('|')).join(';');
    if (sig === s.sig) continue;
    s.sig = sig; s.evs.innerHTML = '';
    // lane layout: overlapping events share the strip width
    let cluster = [], clusterEnd = 0;
    const flush = () => { const n = Math.max(1, ...cluster.map(c => c.lane + 1)); cluster.forEach(c => c.el.style.setProperty('--lanes', n)); cluster = []; };
    for (const e of list) {
      if (e.start >= clusterEnd) { flush(); clusterEnd = 0; }
      const used = cluster.filter(c => c.end > e.start).map(c => c.lane);
      let lane = 0; while (used.includes(lane)) lane++;
      const el = document.createElement('div'), col = colorOf(e);
      el.className = `ev k-${e.kind}${e.milestone ? ' milestone' : ''}${col ? ' hasc' : ''}${S.drop.has(e.id) ? ' drop' : ''}`;
      if (col) el.style.setProperty('--ec', col);
      if (e.desc) el.title = e.desc;
      el.dataset.id = e.id; el.dataset.d = Math.max(e.end - e.start, 15); el.tabIndex = 0; el.setAttribute('role', 'button');
      el.style.setProperty('--s', e.start); el.style.setProperty('--d', Math.max(e.end - e.start, 15)); el.style.setProperty('--lane', lane);
      const b = document.createElement('b'); b.textContent = e.title;
      const t = document.createElement('i'); t.textContent = fmtRange(e.start, e.end);
      const r1 = document.createElement('span'); r1.className = 'rz t'; const r2 = document.createElement('span'); r2.className = 'rz b';
      el.append(b, t, r1, r2); s.evs.append(el);
      cluster.push({ el, lane, end: e.end }); clusterEnd = Math.max(clusterEnd, e.end);
    }
    flush();
  }
  markShort();
}
function markShort() { $$('.ev', stripsEl).forEach(el => el.classList.toggle('short', +el.dataset.d * cur.hpx / 60 < 40)); }
function refreshAll() { layoutHead(); renderEvents(); renderBands(); renderDayTasks(); renderMonth(); applyThemes(); renderHabits(); renderThemeChips(); renderPrism(); }

/* ---------- the time axis: label step follows the zoom ---------- */
const STEPS = [{ hrs: 4, minor: 2 }, { hrs: 2, minor: 1 }, { hrs: 1, minor: .5 }, { hrs: .5, minor: .25 }, { hrs: .25, minor: .25 }];
function stepFor(hpx) {
  if (hpx <= HPX_MIN * 1.12) return STEPS[0];                       // fully zoomed out: every 4 hours
  let p = STEPS[1]; for (const s of STEPS.slice(1)) if (s.hrs * hpx >= 44) p = s; return p;
}
/* fully zoomed out, the 24 hours fit the page exactly: no blank space under the day */
function fitMin() {
  const h = (calEl.clientHeight - HEAD_OFF) / 24;
  if (h > 5) { HPX_MIN = Math.floor(h * 100) / 100 - .02; HPX_DEF = Math.max(40, HPX_MIN * 1.45); }
}
function stepName(s) { return s.hrs >= 1 ? s.hrs + ' h' : Math.round(s.hrs * 60) + ' min'; }
function rulerLabel(m) { const h = Math.floor(m / 60) % 24, mm = m % 60, h12 = h % 12 || 12; return mm ? h12 + ':' + String(mm).padStart(2, '0') : h12 + ' ' + (h < 12 ? 'AM' : 'PM'); }
let curStep = null;
function renderRuler() {
  const st = stepFor(cur.hpx);
  calEl.style.setProperty('--stepH', st.hrs); calEl.style.setProperty('--minH', st.minor);
  $('#tzLabel').textContent = 'every ' + stepName(st);
  if (curStep === st) return;
  curStep = st; rulerEl.innerHTML = '';
  for (let m = 0; m <= 1440; m += st.hrs * 60) {
    const d = document.createElement('div'); d.className = 'rl' + (m % 60 === 0 ? ' major' : '') + (m === 0 ? ' start' : '') + (m === 1440 ? ' end' : ''); d.style.setProperty('--m', m); d.textContent = rulerLabel(m); rulerEl.append(d);
  }
}
function applyVars(v) {
  calEl.style.setProperty('--dayW', v.dayW.toFixed(2) + 'px'); calEl.style.setProperty('--gap', v.gap.toFixed(2) + 'px');
  calEl.style.setProperty('--hpx', v.hpx.toFixed(2) + 'px'); calEl.style.setProperty('--n', N_DAYS);
  calEl.classList.toggle('fit', v.hpx <= HPX_MIN * 1.03);
  renderRuler(); markShort();
}
/* zoom the time axis, keeping the minute under anchorY fixed */
function applyHpx(h, anchorY) {
  fitMin(); h = clamp(h, HPX_MIN, HPX_MAX);
  const ay = anchorY != null ? anchorY : (HEAD_OFF + (calEl.clientHeight - HEAD_OFF) / 2);
  const hours = (calEl.scrollTop + ay - HEAD_OFF) / cur.hpx;
  cur.hpx = h; S.hpx = h; applyVars(cur);
  calEl.scrollTop = hours * h + HEAD_OFF - ay;
}
let hAnim = 0;
function tweenHpx(target, anchorY, ms = 240) {
  fitMin(); target = clamp(target, HPX_MIN, HPX_MAX);
  cancelAnimationFrame(hAnim);
  const from = cur.hpx, t0 = performance.now();
  if (!ms || REDUCED) { applyHpx(target, anchorY); return; }
  const step = now => {
    const k = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3);
    applyHpx(from * Math.pow(target / from, e), anchorY);
    if (k < 1) hAnim = requestAnimationFrame(step);
  };
  hAnim = requestAnimationFrame(step);
}
function zoomTime(dir) {
  fitMin(); const Z = [HPX_MIN, HPX_DEF, 60, 120, 240];   // 4 h (fits the page), 2 h, 1 h, 30 min, 15 min
  let t;
  if (dir > 0) t = Z.find(v => v > cur.hpx * 1.05) || HPX_MAX;
  else t = [...Z].reverse().find(v => v < cur.hpx * .95) || HPX_MIN;
  tweenHpx(t);
}
function setTimeStep(everyMin) {
  fitMin(); const hpx = { 240: HPX_MIN, 120: HPX_DEF, 60: 60, 30: 120, 15: 240 }[everyMin];
  if (hpx) tweenHpx(hpx);
}
$('#tzIn').addEventListener('click', () => zoomTime(1));
$('#tzOut').addEventListener('click', () => zoomTime(-1));
$('#tzLabel').addEventListener('click', () => { fitMin(); tweenHpx(HPX_DEF); setTimeout(() => scrollToMinute(360, 300), 260); });
calEl.addEventListener('wheel', ev => {
  if (!(ev.ctrlKey || ev.metaKey)) return;
  ev.preventDefault();
  const d = clamp(ev.deltaY, -80, 80), y = ev.clientY - calEl.getBoundingClientRect().top;
  cancelAnimationFrame(hAnim); applyHpx(cur.hpx * Math.exp(-d * 0.012), y);
}, { passive: false });
/* touch: two fingers pinch the time axis */
const touches = new Map(); let pinch = null;
calEl.addEventListener('pointerdown', ev => {
  if (ev.pointerType !== 'touch') return;
  touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (touches.size === 2) { cancelDrag(); const [a, b] = [...touches.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, h0: cur.hpx }; }
});
calEl.addEventListener('pointermove', ev => {
  if (!touches.has(ev.pointerId)) return;
  touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && touches.size >= 2) {
    const [a, b] = [...touches.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    applyHpx(pinch.h0 * d / pinch.d0, (a.y + b.y) / 2 - calEl.getBoundingClientRect().top);
  }
});
['pointerup', 'pointercancel'].forEach(t => calEl.addEventListener(t, ev => { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; }));

/* ---------- day-count zoom + layout ---------- */
function targetFor(level) {
  const z = Z[level], W = Math.max(200, calEl.clientWidth - LPAD - PAD);
  const dayW = level === 'day' ? clamp(W, 240, 640) : (W - (z.n - 1) * z.gap) / z.n;
  return { dayW, gap: z.gap };
}
const centerIndex = () => (calEl.scrollLeft + (calEl.clientWidth - LPAD) / 2) / (cur.dayW + cur.gap);
const scrollForCenter = c => clamp(c * (cur.dayW + cur.gap) - (calEl.clientWidth - LPAD) / 2, 0, Math.max(0, calEl.scrollWidth - calEl.clientWidth));
function setZoomClass(level) { calEl.classList.remove('z-day', 'z-3', 'z-week', 'z-month'); calEl.classList.add('z-' + level); }
let zAnim = 0;
function setZoom(level, { animate = true, centerIdx } = {}) {
  if (!Z[level]) return;
  const wasGrid = calEl.classList.contains('m-grid');
  if (level === 'month') {                                   // an ordinary month grid, not the strips
    const c = centerIdx != null ? centerIdx : centerIndex();
    mMon = new Date(...(d => [d.getFullYear(), d.getMonth(), 1])(addDays(WIN_START, clamp(Math.round(c), 0, N_DAYS - 1))));
    S.zoom = 'month'; $$('#zoomSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.z === 'month'));
    closePops(); clearPending(); calEl.classList.add('m-grid'); renderMonth(); return;
  }
  if (wasGrid) { calEl.classList.remove('m-grid'); closePops(); clearPending(); if (centerIdx == null) { const d = new Date(mMon); const t = (TODAY.getFullYear() === d.getFullYear() && TODAY.getMonth() === d.getMonth()) ? TODAY : d; centerIdx = clamp(idxOf(ymd(t)) + 0.5, 0, N_DAYS - 1); } }
  const from = { ...cur }, to = targetFor(level), c0 = centerIdx != null ? centerIdx : centerIndex();
  S.zoom = level;
  $$('#zoomSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.z === level));
  cancelAnimationFrame(zAnim);
  const dur = animate && placeAnim() ? 520 : 0, t0 = performance.now();
  let classSet = false;
  const step = now => {
    const k = dur ? clamp((now - t0) / dur, 0, 1) : 1, e = 1 - Math.pow(1 - k, 3);
    cur = { dayW: lerp(from.dayW, to.dayW, e), gap: lerp(from.gap, to.gap, e), hpx: cur.hpx };
    applyVars(cur);
    if (!classSet && k >= 0.5) { setZoomClass(level); classSet = true; }
    calEl.scrollLeft = scrollForCenter(c0);
    if (k < 1) zAnim = requestAnimationFrame(step); else { setZoomClass(level); updateRange(); markShort(); }
  };
  step(performance.now());
  if (dur) zAnim = requestAnimationFrame(step);
}
function fitCalendar() { if (!stripEls.length) return; if (S.zoom === 'month') { renderMonth(); return; } const c = centerIndex(), wasMin = cur.hpx <= HPX_MIN * 1.03; fitMin(); cur = { ...targetFor(S.zoom), hpx: wasMin ? HPX_MIN : Math.max(cur.hpx, HPX_MIN) }; applyVars(cur); calEl.scrollLeft = scrollForCenter(c); updateRange(); }
let sAnim = 0;
/* scroll to a day (and, if given, make a minute of the day visible). Resolves when done */
function scrollToDate(ds, { ms = 0, align = 'center', min = null } = {}) {
  const i = idxOf(ds), w = cur.dayW + cur.gap;
  const want = align === 'start' ? i * w - w * 0.6 + 8 : (i + 0.5) * w - (calEl.clientWidth - LPAD) / 2;
  const to = clamp(want, 0, Math.max(0, calEl.scrollWidth - calEl.clientWidth)), from = calEl.scrollLeft;
  let vTo = calEl.scrollTop;
  if (min != null) {
    const y = HEAD_OFF + min * cur.hpx / 60 - calEl.scrollTop;
    if (y < HEAD_OFF + 12 || y > calEl.clientHeight - 130) vTo = clamp(min * cur.hpx / 60 - (calEl.clientHeight - HEAD_OFF - 110) / 2, 0, Math.max(0, calEl.scrollHeight - calEl.clientHeight));
  }
  const vFrom = calEl.scrollTop;
  cancelAnimationFrame(sAnim);
  if (!ms || !placeAnim()) { calEl.scrollLeft = to; calEl.scrollTop = vTo; return Promise.resolve(); }
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / ms, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      calEl.scrollLeft = lerp(from, to, e); calEl.scrollTop = lerp(vFrom, vTo, e);
      if (k < 1) sAnim = requestAnimationFrame(step); else res();
    };
    sAnim = requestAnimationFrame(step);
  });
}
function scrollToMinute(min, ms = 0) {      // put a time near the top, below the day headers
  const to = clamp(min * cur.hpx / 60 - 8, 0, Math.max(0, calEl.scrollHeight - calEl.clientHeight)), from = calEl.scrollTop;
  if (!ms || !placeAnim()) { calEl.scrollTop = to; return; }
  const t0 = performance.now();
  const step = now => { const k = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3); calEl.scrollTop = lerp(from, to, e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function updateRange() {
  if (S.zoom === 'month') { $('#tRange').textContent = MONTH_LONG[mMon.getMonth()] + ' ' + mMon.getFullYear(); return; }
  const w = cur.dayW + cur.gap;
  const i0 = clamp(Math.floor(calEl.scrollLeft / w + 0.3), 0, N_DAYS - 1);
  const i1 = clamp(Math.ceil((calEl.scrollLeft + calEl.clientWidth - LPAD) / w - 0.3) - 1, i0, N_DAYS - 1);
  const a = addDays(WIN_START, i0), b = addDays(WIN_START, i1);
  let t;
  if (S.zoom === 'month') { const m = addDays(WIN_START, Math.round((i0 + i1) / 2)); t = MONTH_LONG[m.getMonth()] + ' ' + m.getFullYear(); }
  else if (i0 === i1) t = MONTH_SHORT[a.getMonth()] + ' ' + a.getDate();
  else t = MONTH_SHORT[a.getMonth()] + ' ' + a.getDate() + ' – ' + (a.getMonth() === b.getMonth() ? '' : MONTH_SHORT[b.getMonth()] + ' ') + b.getDate();
  $('#tRange').textContent = t;
}
let rangeRaf = 0;
calEl.addEventListener('scroll', () => { if (!rangeRaf) rangeRaf = requestAnimationFrame(() => { rangeRaf = 0; updateRange(); }); }, { passive: true });
$$('#zoomSeg button').forEach(b => b.addEventListener('click', () => setZoom(b.dataset.z)));
$('#tToday').addEventListener('click', () => { if (S.zoom === 'month') { mMon = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); renderMonth(); } else scrollToDate(TODAY_S, { ms: 420, align: 'start' }); });
const stepDays = dir => { if (S.zoom === 'month') return monthShift(dir); const n = { day: 1, '3': 3, week: 7, month: 28 }[S.zoom]; const c = centerIndex() + dir * n; scrollToDate(dateAt(clamp(Math.round(c), 0, N_DAYS - 1)), { ms: 380 }); };
$('#tPrev').addEventListener('click', () => stepDays(-1)); $('#tNext').addEventListener('click', () => stepDays(1));
$('#tHabits').addEventListener('click', () => $('#rail').classList.toggle('open'));

/* ---------- ENTER CALENDAR ---------- */
let calReady = false;
async function enterCal(q, opts) {
  if (!calReady) {
    if (!S.personalized) seedCalendar();
    layoutHead(); buildStrips(); refreshAll(); calReady = true;
    const z0 = innerWidth < 760 ? '3' : 'week'; S.zoom = z0; $$('#zoomSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.z === z0));
    fitMin(); cur = { ...targetFor(z0), hpx: HPX_DEF }; applyVars(cur); setZoomClass(z0);
    scrollToDate(TODAY_S, { align: 'start' }); scrollToMinute(360); updateRange();     // the day opens at 6 AM, the rest is a scroll away
  } else { fitCalendar(); refreshAll(); }
  updateAiHint(); if (!S.awaitingStudy) chatInput.placeholder = nextPlaceholder();
  const was = agentEl.classList.contains('on');
  agentEl.classList.add('on'); fig.setMood('neutral'); fig.setPose('rest');
  await nextFrame();
  if (!was) park($('#agentHome'), 0); else park($('#agentHome'), 1000);
  if (opts.personalize) { await q.sleep(900); openPersonalize(); }
  await q.sleep(opts.personalize ? 500 : 3800);
  maybeRemind();
}
function countdown(ds) {                              // "2 months, 1 week, 3 days" counted on the calendar
  const a = TODAY, b = fromYmd(ds); if (b < a) return 'passed'; if (+b === +a) return 'today';
  let mo = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  let anchor = new Date(a.getFullYear(), a.getMonth() + mo, a.getDate()); if (anchor > b) { mo--; anchor = new Date(a.getFullYear(), a.getMonth() + mo, a.getDate()); }
  const days = Math.round((b - anchor) / 864e5), wk = Math.floor(days / 7), d = days % 7, out = [];
  if (mo) out.push(mo + (mo > 1 ? ' months' : ' month')); if (wk) out.push(wk + (wk > 1 ? ' weeks' : ' week')); if (d) out.push(d + (d > 1 ? ' days' : ' day'));
  return out.join(', ');
}
const upcomingMilestones = () => S.events.filter(e => e.milestone && (e.allDay ? (e.endDate || e.date) : e.date) >= TODAY_S).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
function maybeRemind() {
  if (S.reminded || !S.pref.remind || S.view !== 'calendar') return;
  const list = upcomingMilestones(); if (!list.length) return;
  S.reminded = true; const m = list[0];
  fig.setMood('alert'); setTimeout(() => fig.setMood('neutral'), 1800);
  const lines = list.slice(0, 3).map(e => `${e.title}: ${countdown(e.date)}`).join('\n');
  bubble(list.length > 1 ? `${list.length} milestones ahead.\n${lines}` : `${m.title} is ${countdown(m.date) === 'today' ? 'today' : 'in ' + countdown(m.date)}. Want me to block time to prepare?`, {
    acts: [{ label: 'Block prep time', fn: () => askStudyTime(m) }, ...(list.length > 1 ? [{ label: 'Open Prism', fn: () => openPrism() }] : []), { label: 'Not now', fn: () => { } }], ms: 12000
  });
}
/* KOIOS asks WHEN, and the answer can be typed in the chatbox (or tapped) */
function askStudyTime(m) {
  S.awaitingStudy = m;
  fig.setMood('thinking'); setTimeout(() => fig.setMood('neutral'), 1200);
  bubble('What time suits you? Type it below, like “weekday evenings 6 to 8PM”, or tap one.', {
    acts: [{ label: 'Evenings 6–8PM', fn: () => handle('weekday evenings 6 to 8PM') }, { label: 'Afternoons 2–4PM', fn: () => handle('weekday afternoons 2 to 4PM') }, { label: 'Never mind', fn: () => { S.awaitingStudy = null; } }], ms: 20000
  });
  chatInput.placeholder = 'e.g. “weekday evenings 6 to 8PM” or “3 sessions at 4PM”';
  chatInput.focus({ preventScroll: true });
}
async function blockStudy(m, o = {}) {
  const subject = m.title.replace(/\b(midterm|exam|final|test|quiz|deadline)\b/i, '').trim() || m.title;
  const evs = [], mdate = fromYmd(m.date), start = o.start, end = o.end;
  if (o.days && o.days.length) {
    const lim = o.count || 6;
    for (let back = 1; back <= 21 && evs.length < lim; back++) {
      const d = addDays(mdate, -back), ds = ymd(d);
      if (ds < TODAY_S || !o.days.includes(d.getDay())) continue;
      evs.push(mkEvent({ title: 'Study: ' + subject, date: ds, start, end, kind: 'habit' }));
    }
  } else {
    const backs = [7, 4, 2].slice(0, o.count || 3);
    backs.forEach((back, n) => {
      const ds = ymd(addDays(mdate, -back));
      if (ds < TODAY_S) return;
      evs.push(mkEvent({ title: 'Study: ' + subject, date: ds, start: start != null ? start : [17 * 60 + 30, 20 * 60, 20 * 60][n], end: end != null ? end : [19 * 60, 21 * 60 + 30, 21 * 60 + 30][n], kind: 'habit' }));
    });
  }
  evs.sort((a, b) => a.date.localeCompare(b.date));
  if (!evs.length) { bubble('There is no room before that date. Try another day or time.', { ms: 4200 }); return false; }
  S.events.push(...evs); S.last = evs[0];
  await place(evs);
  bubble(`Blocked ${evs.length} session${evs.length > 1 ? 's' : ''} before ${m.title}, ${fmtRangeLong(evs[0].start, evs[0].end)}.`, { acts: [{ label: 'Undo', fn: () => undoCreate(evs) }], ms: 5200 });
  return true;
}

/* =========================================================
   BUBBLE
   ========================================================= */
let bTimer = 0;
function bubble(text, { acts = [], ms = 5200 } = {}) {
  const b = $('#bubble'); b.innerHTML = '';
  const p = document.createElement('div'); p.textContent = text; p.style.whiteSpace = 'pre-line'; b.append(p);
  if (acts.length) {
    const w = document.createElement('div'); w.className = 'acts';
    acts.forEach(a => { const x = document.createElement('button'); x.type = 'button'; x.textContent = a.label; x.addEventListener('click', () => { hideBubble(); a.fn(); }); w.append(x); });
    b.append(w);
  }
  b.classList.add('on'); clearTimeout(bTimer);
  if (ms) bTimer = setTimeout(hideBubble, acts.length ? Math.max(ms, 9000) : ms);
}
function hideBubble() { clearTimeout(bTimer); $('#bubble').classList.remove('on'); }

/* =========================================================
   PLACEMENT ANIMATION: KOIOS flies to each day and puts the task in its slot
   ========================================================= */
let placing = false, skipFlag = false, placeChain = Promise.resolve();
['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => { if (placing) skipFlag = true; }, true));
const place = evs => (placeChain = placeChain.then(() => doPlace(evs)).catch(e => console.error(e)));
function slotPoint(e) {
  const s = stripEls[idxOf(e.date)], r = s.body.getBoundingClientRect(), a = app.getBoundingClientRect(), c = calEl.getBoundingClientRect();
  const y = r.top - a.top + e.start * cur.hpx / 60;
  return { x: clamp(r.left - a.left + r.width / 2, c.left - a.left + LPAD + 30, c.right - a.left - 30), y: clamp(y, c.top - a.top + HEAD_OFF + 10, c.bottom - a.top - 130) };
}
const reveal = e => { e.hide = false; S.drop.add(e.id); renderEvents(); S.drop.clear(); };
function ripple(ds) {
  const s = stripEls[idxOf(ds)]; if (!s) return;
  const r = document.createElement('span'); r.className = 'ripple'; s.el.append(r); setTimeout(() => r.remove(), 700);
}
async function doPlace(evs) {
  evs = evs.filter(e => S.events.includes(e));
  const dts = evs.filter(e => e.allDay); evs = evs.filter(e => !e.allDay);
  if (dts.length) {                                          // day tasks drop straight into their lane
    dts.forEach(e => { e.hide = false; S.drop.add(e.id); }); refreshAll(); S.drop.clear();
    if (S.view === 'calendar' && S.zoom !== 'month') { scrollToDate(dts[0].date, { ms: placeAnim() ? 300 : 0 }); dts.slice(0, 6).forEach((e, i) => setTimeout(() => ripple(e.date), i * 70)); }
    if (!evs.length) return;
  }
  evs.forEach(e => { e.hide = true; });
  renderEvents();
  const sorted = [...evs].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  if (!placeAnim() || S.view !== 'calendar' || S.zoom === 'month' || !sorted.length) {
    sorted.forEach(e => { e.hide = false; }); renderEvents();
    if (sorted.length && S.view === 'calendar') scrollToDate(sorted[0].date, { ms: 0, min: sorted[0].start });
    return;
  }
  placing = true; skipFlag = false; S.busy = true;
  const t0 = performance.now(), over = () => skipFlag || performance.now() - t0 > 3600;
  try {
    fig.setMood('working'); fig.setPose('laptop');             // pulls out the computer and works
    await sleep(520); fig.setPose('laptop-out'); await sleep(300); fig.setPose('rest');
    const showN = Math.min(3, sorted.length);
    let i = 0;
    for (; i < showN && !over(); i++) {
      const e = sorted[i];
      document.getElementById('carry').textContent = e.title; agentEl.classList.add('carrying');
      const cal = rectIn(calEl);
      await Promise.all([scrollToDate(e.date, { ms: 300, min: e.start }), agentTo(cal.x + cal.w / 2 - 28, cal.y + cal.h * 0.4, 56, 300)]);
      const p = slotPoint(e);
      await agentTo(p.x - 28, p.y - 30, 56, 240);
      agentEl.classList.remove('carrying'); reveal(e); ripple(e.date); fig.play('hop');
      await sleep(170);
    }
    const rest = sorted.slice(i);
    if (rest.length) {                                           // the rest sweep in as the calendar scrolls on
      const T = clamp(rest.length * 70, 350, 1100), stepMs = T / rest.length;
      scrollToDate(rest[rest.length - 1].date, { ms: T, min: rest[rest.length - 1].start });
      agentEl.classList.remove('carrying');
      for (const e of rest) {
        if (skipFlag) { rest.forEach(x => { x.hide = false; }); renderEvents(); break; }
        reveal(e); ripple(e.date);
        const p = slotPoint(e); agentTo(p.x - 28, p.y - 30, 56, stepMs, false);
        await sleep(stepMs);
      }
      if (skipFlag) scrollToDate(rest[rest.length - 1].date, { ms: 0 });
    }
    sorted.forEach(e => { e.hide = false; }); renderEvents();
  } finally {
    agentEl.classList.remove('carrying');
    fig.setPose('rest'); fig.setMood('happy');
    await agentHomeNow(over() ? 250 : 520);
    placing = false; S.busy = false;
    setTimeout(() => { if (!S.busy && !S.aiBusy) fig.setMood('neutral'); }, 900);
  }
}
