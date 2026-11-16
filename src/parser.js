/* ---------- Natural-language parser (pure functions, no DOM) ---------- */
const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOW_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';
const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const WD_RE = '(mondays?|mon|tuesdays?|tues|tue|wednesdays?|wed|thursdays?|thurs|thur|thu|fridays?|fri|saturdays?|sat|sundays?|sun)';
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const fromYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dowOf = tok => ({ mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6, su: 0 })[tok.toLowerCase().slice(0, 2)];
const isPluralWd = tok => /^(mon|tues|wednes|thurs|fri|satur|sun)days$/i.test(tok);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function fmtTime(min) {
  if (min === 1440) return '12AM';
  const h24 = Math.floor(min / 60), mm = min % 60, ap = h24 >= 12 ? 'PM' : 'AM', h12 = h24 % 12 || 12;
  return mm ? h12 + ':' + pad2(mm) + ap : h12 + ap;
}
function fmtRange(s, e) { return fmtTime(s) + '–' + fmtTime(e); }
function fmtRangeLong(s, e) {
  const one = m => { if (m === 1440) return ['12', 'AM']; const h24 = Math.floor(m / 60), mm = m % 60; return [(h24 % 12 || 12) + (mm ? ':' + pad2(mm) : ''), h24 >= 12 ? 'PM' : 'AM']; };
  const a = one(s), b = one(e);
  return a[1] === b[1] ? a[0] + '–' + b[0] + ' ' + b[1] : a[0] + ' ' + a[1] + '–' + b[0] + ' ' + b[1];
}
function dayLabel(ds, now) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()), d = fromYmd(ds);
  const diff = Math.round((d - t) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return DOW_LONG[d.getDay()];
  return DOW_NAMES[d.getDay()] + ' ' + MONTH_KEYS[d.getMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + d.getDate();
}
function daysPhrase(days) {
  const names = days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DOW_LONG[d] + 's');
  if (names.length === 5 && !days.includes(0) && !days.includes(6)) return 'weekdays';
  if (names.length === 7) return 'every day';
  return names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
}

const guessAp = h => (h >= 7 && h <= 11) ? 'am' : 'pm';
function toMin(h, m, ap) { h = +h; m = +m || 0; if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; return h * 60 + m; }

function parseTimeRange(s) {
  const R = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const m = s.match(R);
  if (!m) return null;
  let [full, h1, m1, a1, h2, m2, a2] = m;
  a1 = a1 && a1.toLowerCase(); a2 = a2 && a2.toLowerCase();
  if (!a1 && !a2 && !m1 && !m2) return null;           // bare "10-12": not trusted as a time
  if (+h1 > 24 || +h2 > 24) return null;
  let s1, e1;
  if (+h1 >= 13 || +h2 >= 13) { s1 = toMin(h1, m1); e1 = toMin(h2, m2); }
  else {
    // try every am/pm combination the text leaves open; keep the shortest valid span,
    // and on a tie prefer the start that sounds like a normal time of day
    const cands = [];
    for (const sa of (a1 ? [a1] : ['am', 'pm'])) {
      for (const ea of (a2 ? [a2] : ['am', 'pm'])) {
        const st = toMin(h1, m1, sa);
        let en = toMin(h2, m2, ea);
        if (en === 0 && st > 0) en = 1440;
        if (en > st) cands.push({ st, en, sa, d: en - st });
      }
    }
    cands.sort((x, y) => (x.d - y.d) || ((y.sa === guessAp(+h1)) - (x.sa === guessAp(+h1))));
    if (!cands.length) return null;
    s1 = cands[0].st; e1 = cands[0].en;
  }
  if (e1 <= s1) return null;
  return { start: s1, end: e1, match: full };
}
function parseTime(s) {
  let m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) return { t: toMin(m[1], m[2], m[3].toLowerCase()), match: m[0] };
  m = s.match(/\b(\d{1,2}):(\d{2})\b/);
  if (m) { const h = +m[1]; return { t: h >= 13 ? h * 60 + +m[2] : toMin(h, m[2], guessAp(h)), match: m[0] }; }
  m = s.match(/\bat\s+(\d{1,2})\b(?!\s*(?:am|pm|:))/i);
  if (m) { const h = +m[1]; return { t: toMin(h, 0, guessAp(h)), match: m[0] }; }
  m = s.match(/\bnoon\b/i); if (m) return { t: 720, match: m[0] };
  return null;
}

function parseRepeat(s) {
  let m;
  const listRe = new RegExp('\\bevery\\s+(' + WD_RE + '(?:\\s*(?:,|and|&|/)\\s*' + WD_RE + ')*)\\b', 'i');
  if ((m = s.match(listRe))) {
    const toks = m[1].match(new RegExp(WD_RE, 'gi'));
    return { days: [...new Set(toks.map(dowOf))], match: m[0] };
  }
  if ((m = s.match(/\bevery\s*day\b|\bdaily\b/i))) return { days: [0, 1, 2, 3, 4, 5, 6], match: m[0] };
  if ((m = s.match(/\bevery\s+weekday\b|\bweekdays\b/i))) return { days: [1, 2, 3, 4, 5], match: m[0] };
  if ((m = s.match(/\bevery\s+weekend\b|\bweekends\b/i))) return { days: [0, 6], match: m[0] };
  const plRe = new RegExp('\\b(?:on\\s+)?((?:' + WD_RE + ')(?:\\s*(?:,|and|&|/)\\s*' + WD_RE + ')*)\\b', 'i');
  const all = [...s.matchAll(new RegExp(WD_RE, 'gi'))];
  if (all.length && all.every(x => isPluralWd(x[0]))) {
    const m2 = s.match(plRe);
    return { days: [...new Set(all.map(x => dowOf(x[0])))], match: m2 ? m2[0] : all[0][0] };
  }
  if ((m = s.match(/\b(?:every\s+)?week(?:ly)?\b/i)) && all.length) return { days: [dowOf(all[0][0])], match: m[0], weeklyWord: true };
  return null;
}

function nextDow(now, dow, strictAfter) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let diff = (dow - d.getDay() + 7) % 7;
  if (strictAfter && diff === 0) diff = 7;
  return addDays(d, diff);
}
function parseDay(s, now) {
  let m;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if ((m = s.match(/\b(tonight)\b/i))) return { date: ymd(today), match: m[0], tonight: true };
  if ((m = s.match(/\b(today)\b/i))) return { date: ymd(today), match: m[0] };
  if ((m = s.match(/\b(tomorrow|tmrw)\b/i))) return { date: ymd(addDays(today, 1)), match: m[0] };
  if ((m = s.match(/\bin\s+(\d+)\s+(day|days|week|weeks)\b/i))) return { date: ymd(addDays(today, +m[1] * (/week/i.test(m[2]) ? 7 : 1))), match: m[0] };
  if ((m = s.match(new RegExp('\\b' + MONTH_RE + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b', 'i')))) {
    const mon = MONTH_KEYS.indexOf(m[1].toLowerCase().slice(0, 3));
    let d = new Date(today.getFullYear(), mon, +m[2]);
    if (d < today) d = new Date(today.getFullYear() + 1, mon, +m[2]);
    return { date: ymd(d), match: m[0] };
  }
  if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    let d = new Date(today.getFullYear(), +m[1] - 1, +m[2]);
    if (d < today) d = new Date(today.getFullYear() + 1, +m[1] - 1, +m[2]);
    return { date: ymd(d), match: m[0] };
  }
  const re = new RegExp('\\b(next|this|on)?\\s*' + WD_RE + '\\b', 'i');
  if ((m = s.match(re))) {
    const dow = dowOf(m[2]);
    const d = nextDow(today, dow, /next/i.test(m[1] || ''));
    return { date: ymd(d), match: m[0], dow };
  }
  return null;
}

const MILESTONE_RE = /\b(exam|midterm|final|finals|interview|deadline|due|conference|trip|flight|presentation|recital|defense)\b/i;
const HABIT_RE = /\b(run|running|jog|jogging|piano|practice|gym|workout|work out|lift|lifting|read|reading|study|studying|yoga|meditat\w*|swim\w*|walk\w*|stretch\w*|hyrox|guitar|violin)\b/i;
function durFor(title) {
  const t = title.toLowerCase();
  if (/run|jog/.test(t)) return 45;
  if (/piano|practice|guitar|violin/.test(t)) return 45;
  if (/gym|lift|workout|training|hyrox/.test(t)) return 60;
  if (/read|meditat|stretch/.test(t)) return 30;
  if (/study|homework/.test(t)) return 90;
  if (/class|lecture|lab\b/.test(t)) return 75;
  if (/exam|midterm|final/.test(t)) return 120;
  return 60;
}
function prefFor(title) {
  const t = title.toLowerCase();
  if (/run|jog/.test(t)) return 17 * 60;
  if (/piano|practice|guitar|violin/.test(t)) return 19 * 60;
  if (/gym|lift|workout|hyrox/.test(t)) return 17 * 60 + 30;
  if (/read/.test(t)) return 21 * 60;
  if (/study|homework/.test(t)) return 19 * 60;
  if (/meditat|stretch|yoga/.test(t)) return 7 * 60;
  return 10 * 60;
}
function cleanTitle(s) {
  let t = s;
  const filler = [
    /\b(please|kindly)\b/gi, /\b(can|could|would) you\b/gi, /\b(put|add|schedule|book|create|set up|set|log|remind me to|remind me)\b/gi,
    /\bfor me\b/gi, /\b(on|to|in|into) my (calendar|schedule)\b/gi, /\b(i have an?|i've got an?|i have|i've got|i've|i need to|i want to|i will|i'll|i am|i'm)\b/gi,
    /\b(starting|starts|starting from|from)\b/gi, /\b(every|each|next|this|on|at|by)\b/gi, /\b(the|a|an|my)\b(?=\s)/gi, /\bgo to\b/gi, /\b(weekly|daily)\b/gi
  ];
  filler.forEach(r => { t = t.replace(r, ' '); });
  t = t.replace(/[…]|\.{2,}/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,.:;\-–]+|[\s,.:;\-–]+$/g, '').trim();
  t = t.replace(/^(and|then|with)\s+/i, '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}
function strip(s, match) { return match ? s.replace(match, ' ') : s; }

/* ctx: { now, pending: {date,start,end}|null, last: event|null, awaiting: {title,start,end,days,kind}|null } */
function parseCommand(raw, ctx) {
  const now = ctx.now;
  let text = raw.replace(/[–—]/g, '-').replace(/…/g, ' ').trim();
  const low = text.toLowerCase();

  // day themes: "mondays are run day", "my run day is every monday", "make fridays gym day"
  let m;
  const wdAny = '(' + WD_RE + '(?:\\s*(?:,|and|&|/)\\s*' + WD_RE + ')*)';
  const themeRes = [
    new RegExp('\\b(?:make|mark|label|call|set|name)\\s+(?:every\\s+)?' + wdAny + '\\s+(?:as\\s+|a\\s+|an\\s+|my\\s+|the\\s+)*([a-z]+)\\s+day\\b', 'i'),
    new RegExp('\\b' + wdAny + '\\s+(?:are|is|will be|should be)\\s+(?:my\\s+|the\\s+)?([a-z]+)\\s+days?\\b', 'i'),
    new RegExp('\\b(?:my\\s+)?([a-z]+)\\s+day\\s+(?:is|will be|=|falls on)\\s*(?:every\\s+)?' + wdAny + '\\b', 'i')
  ];
  for (let i = 0; i < themeRes.length; i++) {
    m = low.match(themeRes[i]);
    if (m) {
      const wds = i === 2 ? m[2] : m[1], word = i === 2 ? m[1] : m[m.length - 1];
      const toks = wds.match(new RegExp(WD_RE, 'gi')) || [];
      const stop = ['my', 'the', 'a', 'an', 'every', 'each'];
      if (toks.length && !stop.includes(word)) return { intent: 'theme', dows: [...new Set(toks.map(dowOf))], word };
    }
  }
  if (/\b(stop|no more|turn off|disable|remove)\b.*\b(label|labels|labeling|labelling|themes?|names)\b/i.test(low)) return { intent: 'themesOff' };

  if (/^(please\s+)?(delete|remove|cancel|scrap|undo)\b.*\b(it|that|last|event)\b/i.test(low) && !ctx.pending) return { intent: 'delete' };

  if (/^(please\s+)?(zoom|show|switch|go)\b.*\b(day|3 ?days?|three days|week|month)\b/i.test(low) && !/\d\s*(am|pm)/.test(low)) {
    const lv = /month/.test(low) ? 'month' : /3 ?days?|three days/.test(low) ? '3' : /week/.test(low) ? 'week' : 'day';
    return { intent: 'zoom', level: lv };
  }

  // adjust the event just made
  if (ctx.last && !ctx.pending && !ctx.awaiting) {
    const rn = text.match(/^(?:please\s+)?(?:rename|call|name)\s+(?:it|that)\s+(?:to\s+|as\s+)?(.+)$/i);
    if (rn) return { intent: 'adjust', title: rn[1].trim().replace(/^./, c => c.toUpperCase()) };
    const ex = low.match(/\b(extend|longer)\b\s*(?:it\s*)?(?:by\s+)?(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hr|hrs)/);
    if (ex) return { intent: 'adjust', extend: Math.round(+ex[2] * (/^h/.test(ex[3]) ? 60 : 1)) };
    const en = low.match(/\b(?:end|ends|finish|finishes)\b.*?\b(?:at|by)\s+(.+)$/);
    if (en) { const t = parseTime(en[1].match(/am|pm|:/) ? en[1] : 'at ' + en[1]); if (t) return { intent: 'adjust', end: t.t }; }
    const stt = low.match(/\b(?:start|starts|begin|begins)\b.*?\bat\s+(.+)$/);
    if (stt) { const t = parseTime(stt[1].match(/am|pm|:/) ? stt[1] : 'at ' + stt[1]); if (t) return { intent: 'adjust', start: t.t }; }
    const mv = low.match(/^(?:please\s+)?(?:make|set|change|move|shift|push|put)\s+(?:it|that)\b(.*)$/);
    if (mv) {
      const rest = mv[1];
      const rg = parseTimeRange(rest);
      if (rg) return { intent: 'adjust', start: rg.start, end: rg.end };
      const d = parseDay(rest, now), t = parseTime(rest);
      if (d || t) return { intent: 'adjust', date: d && d.date, dow: d && d.dow, startShift: t ? t.t : null };
    }
  }

  // create
  let s = text;
  const out = { intent: 'create' };
  const rep = parseRepeat(s);
  if (rep) { out.days = rep.days; s = strip(s, rep.match); }
  const day = parseDay(s, now);
  if (day) { out.date = day.date; s = strip(s, day.match); if (day.tonight) out.tonight = true; }
  const rg = parseTimeRange(s);
  if (rg) { out.start = rg.start; out.end = rg.end; s = strip(s, rg.match); }
  else { const t = parseTime(s); if (t) { out.start = t.t; s = strip(s, t.match); } }

  if (ctx.awaiting) {                       // answering "which day?"
    const a = ctx.awaiting;
    if (out.date || out.days) return { intent: 'create', title: a.title, start: a.start, end: a.end, date: out.date, days: out.days, kind: a.kind, milestone: a.milestone };
  }
  let title = cleanTitle(s);
  if (ctx.pending) {                        // drag context fills what is missing
    if (out.start == null) { out.start = ctx.pending.start; out.end = ctx.pending.end; }
    if (!out.date && !out.days) out.date = ctx.pending.date;
  }
  if (out.tonight && out.start == null) out.start = 20 * 60;
  if (!title && !ctx.pending && out.start == null && !out.date && !out.days) return { intent: 'unknown' };
  if (!title) title = 'Event';
  if (out.start != null && out.end == null) out.end = Math.min(1440, out.start + durFor(title));
  out.title = title;
  out.milestone = MILESTONE_RE.test(title);
  out.kind = out.days ? (HABIT_RE.test(title) ? 'habit' : 'fixed') : (HABIT_RE.test(title) && !out.milestone ? 'habit' : 'once');
  if (!out.date && !out.days) {
    // no day at all: ask one short question
    return { intent: 'ask', title, start: out.start, end: out.end, kind: out.kind, milestone: out.milestone };
  }
  if (out.days && !out.date) out.date = null;
  return out;
}

if (typeof module !== 'undefined') module.exports = { parseCommand, fmtTime, fmtRange, fmtRangeLong, dayLabel, daysPhrase, parseTimeRange, parseTime, durFor, prefFor, ymd, fromYmd, addDays, MILESTONE_RE, HABIT_RE };
