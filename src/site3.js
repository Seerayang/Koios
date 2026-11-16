
/* =========================================================
   DRAG TO CREATE, THEN KOIOS OPENS WITH THE CHAT PREFILLED
   ========================================================= */
const chatInput = $('#chatInput');
let drag = null, ghostEl = null, lpTimer = 0, rtagEls = [], hotEl = null;
const snap15 = m => Math.round(m / 15) * 15;
function minAt(body, y) { const r = body.getBoundingClientRect(); return clamp(snap15((y - r.top) / cur.hpx * 60), 0, 1440); }
function setRtags(a, b) {                               // start and end time tags on the ruler, so you always see the time
  if (!rtagEls.length) rtagEls = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'rtag'; rulerEl.append(d); return d; });
  rtagEls[0].style.setProperty('--m', a); rtagEls[0].textContent = fmtTime(a);
  rtagEls[1].style.setProperty('--m', b); rtagEls[1].textContent = fmtTime(b);
}
function clearRtags() { rtagEls.forEach(d => d.remove()); rtagEls = []; }
function hotStrip(strip) { if (hotEl === strip) return; if (hotEl) hotEl.classList.remove('hot'); hotEl = strip; if (strip) strip.classList.add('hot'); }
function paintGhost(body, a, b, o = {}) {
  const s = Math.min(a, b), e = Math.max(Math.max(a, b), s + 15);
  if (!ghostEl) { ghostEl = document.createElement('div'); }
  ghostEl.className = 'ghost' + (o.habit ? ' hab' : '');
  if (o.color) ghostEl.style.setProperty('--ec', o.color); else ghostEl.style.removeProperty('--ec');
  if (ghostEl.parentNode !== body) body.append(ghostEl);
  ghostEl.style.setProperty('--s', s); ghostEl.style.setProperty('--d', Math.max(e - s, 15));
  ghostEl.textContent = '';
  const b1 = document.createElement('b'); b1.textContent = o.title || fmtRange(s, e); ghostEl.append(b1);
  if (o.title) { const i1 = document.createElement('i'); i1.textContent = fmtRange(s, e); ghostEl.append(i1); }
  setRtags(s, e); hotStrip(body.closest('.strip'));
  return { s, e };
}
function clearPending() { S.pending = null; if (ghostEl) { ghostEl.remove(); ghostEl = null; } clearRtags(); hotStrip(null); if (typeof dtHot === 'function') dtHot(null); }
function cancelDrag() { clearTimeout(lpTimer); if (drag) { drag = null; clearPending(); } edgeOff(); }

/* auto-scroll while dragging near the edges */
const edge = { raf: 0, pt: null, cb: null };
function edgeTick() {
  if (!edge.pt) { edge.raf = 0; return; }
  const r = calEl.getBoundingClientRect(), { x, y } = edge.pt; let dx = 0, dy = 0;
  const zt = r.top + HEAD_OFF + 28, zb = r.bottom - 120, zl = r.left + LPAD + 28, zr = r.right - 40;
  if (y < zt) dy = -clamp((zt - y) / 5, 2, 28); else if (y > zb) dy = clamp((y - zb) / 5, 2, 28);
  if (x < zl) dx = -clamp((zl - x) / 5, 2, 24); else if (x > zr) dx = clamp((x - zr) / 5, 2, 24);
  if (dx || dy) { calEl.scrollTop += dy; calEl.scrollLeft += dx; if (edge.cb) edge.cb(); }
  edge.raf = requestAnimationFrame(edgeTick);
}
function edgeOn(pt, cb) { edge.pt = pt; edge.cb = cb; if (!edge.raf) edge.raf = requestAnimationFrame(edgeTick); }
function edgeOff() { edge.pt = null; }

function beginDrag(body, x, y, id) {
  closePops(); clearPending();
  const m = minAt(body, y);
  drag = { body, a: m, b: m, moved: false, id, x, y, date: body.dataset.date, cx: x, cy: y };
  try { body.setPointerCapture(id); } catch (e) { /* ignore */ }
  paintGhost(body, m, m + 30);
}
stripsEl.addEventListener('pointerdown', ev => {
  const body = ev.target.closest('.sbody');
  if (ev.target.closest('.ev')) return;
  const dg = ev.target.closest('.dgap');
  if (dg && ev.button <= 0) { dtBegin('create', ev, null); return; }
  if (!body || ev.button > 0) return;
  if (ev.pointerType === 'touch') {                      // touch: press and hold to place, so you can still scroll
    clearTimeout(lpTimer); const px = ev.clientX, py = ev.clientY, id = ev.pointerId;
    lpTimer = setTimeout(() => { if (touches.size === 1 && !drag) beginDrag(body, px, py, id); }, 380);
    return;
  }
  beginDrag(body, ev.clientX, ev.clientY, ev.pointerId);
});
stripsEl.addEventListener('pointermove', ev => {
  if (!drag) return;
  if (ev.pointerId !== drag.id) return;
  drag.cx = ev.clientX; drag.cy = ev.clientY;
  if (Math.abs(ev.clientY - drag.y) > 4) drag.moved = true;
  updateCreate(); edgeOn({ x: ev.clientX, y: ev.clientY }, updateCreate);
});
function updateCreate() {
  if (!drag) return;
  drag.b = minAt(drag.body, drag.cy);
  if (drag.b === drag.a) paintGhost(drag.body, drag.a, drag.a + 15); else paintGhost(drag.body, drag.a, drag.b);
}
stripsEl.addEventListener('touchmove', ev => { if (drag) ev.preventDefault(); }, { passive: false });
const endDrag = ev => {
  clearTimeout(lpTimer);
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag; drag = null; edgeOff();
  let s = Math.min(d.a, d.b), e = Math.max(d.a, d.b);
  if (e - s < 15) { s = d.a; e = Math.min(1440, s + 60); }
  paintGhost(d.body, s, e);
  S.pending = { date: d.date, start: s, end: e };
  openKoiosFor(S.pending);
};
stripsEl.addEventListener('pointerup', endDrag);
stripsEl.addEventListener('pointercancel', ev => { clearTimeout(lpTimer); if (drag && ev.pointerId === drag.id) { drag = null; clearPending(); edgeOff(); } });

function openKoiosFor(p) {
  const text = p.allDay ? `${dayLabel(p.date, NOW)}${p.endDate && p.endDate !== p.date ? ' to ' + dayLabel(p.endDate, NOW) : ''} · day task… ` : `${dayLabel(p.date, NOW)} ${fmtRangeLong(p.start, p.end)}… `;
  chatInput.value = text; chatInput.focus({ preventScroll: true });
  chatInput.setSelectionRange(text.length, text.length);
  fig.setMood('alert'); setTimeout(() => { if (!S.busy) fig.setMood('neutral'); }, 1200); fig.play('hop');
  bubble(p.allDay ? 'What is the day task?' : 'What goes there?', { ms: 3600 });
}

/* =========================================================
   HABIT RAIL: add, delete, recolour, and drag onto any day with the time visible while you drag
   ========================================================= */
const hiBg = c => `linear-gradient(150deg,color-mix(in srgb,${c} 55%,#fff),${c})`;
function renderHabits() {
  const list = $('#habitList'); list.innerHTML = '';
  S.habits.forEach(h => {
    const row = document.createElement('div'); row.className = 'habit'; row.title = h.name + ' · drag onto a day'; row.dataset.id = h.id;
    row.innerHTML = '<span class="hi"></span><span class="hn"><b></b><small></small></span><button type="button" class="hadd">Ask</button><button type="button" class="hdel" aria-label="Delete habit" title="Delete habit">×</button>';
    const hi = $('.hi', row); hi.textContent = h.name.charAt(0).toUpperCase(); hi.style.background = hiBg(h.color);
    $('b', row).textContent = h.name; $('small', row).textContent = h.dur + ' min · drag onto a day';
    $('.hadd', row).addEventListener('click', () => { chatInput.value = `Put ${h.name} `; chatInput.focus(); $('#rail').classList.remove('open'); });
    $('.hdel', row).addEventListener('click', () => deleteHabitUI(h));
    row.addEventListener('pointerdown', ev => startHabitPointer(h, row, ev));
    list.append(row);
  });
}
function deleteHabitUI(h) {
  const snap = snapshot();
  removeHabit(h, false); refreshAll();
  bubble(`Removed the habit ${h.name}. Its events stay on the calendar.`, { acts: [{ label: 'Undo', fn: () => restore(snap) }, { label: 'Remove its events too', fn: () => { S.events = S.events.filter(e => e.title.toLowerCase() !== h.name.toLowerCase()); refreshAll(); } }], ms: 7000 });
}
$('#habitNew').addEventListener('submit', ev => {
  ev.preventDefault();
  const name = $('#habitName').value.trim(), dur = +$('#habitDur').value || 45;
  if (!name) { $('#habitName').focus(); return; }
  if (S.habits.some(x => x.name.toLowerCase() === name.toLowerCase())) { bubble(`${name} is already a habit.`, { ms: 2600 }); return; }
  const snap = snapshot(), h = addHabit(name, { dur });
  $('#habitName').value = ''; refreshAll();
  bubble(`Added the habit ${h.name}. Drag it onto a day.`, { acts: [{ label: 'Undo', fn: () => restore(snap) }], ms: 4200 });
  fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
});
$('#habitPlus').addEventListener('click', () => { if ($('#habitName').value.trim()) $('#habitNew').requestSubmit(); else $('#habitName').focus(); });

let hd = null;
const chipEl = $('#dragChip');
function startHabitPointer(h, row, ev) {
  if (ev.button > 0 || ev.target.closest('button') || !calReady) return;
  try { row.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
  hd = { h, row, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, on: false, target: null, x: ev.clientX, y: ev.clientY };
}
function beginHabitDrag() {
  hd.on = true; cancelDrag(); closePops(); hideBubble();
  $('#rail').classList.remove('open'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  hd.row.classList.add('dragging'); app.classList.add('habitdrag');
  chipEl.innerHTML = '<span class="hi"></span><span class="ct"></span>';
  $('.hi', chipEl).textContent = hd.h.name.charAt(0).toUpperCase(); $('.hi', chipEl).style.background = hiBg(hd.h.color);
  chipEl.style.borderColor = hd.h.color; chipEl.classList.add('on');
}
function updateHabitDrag(x, y) {
  hd.x = x; hd.y = y;
  chipEl.style.transform = `translate(${x + 16}px,${y - 22}px)`;
  const el = document.elementFromPoint(x, y), strip = el && el.closest && el.closest('.strip');
  const ct = $('.ct', chipEl);
  if (strip && calEl.contains(strip)) {
    const body = $('.sbody', strip), t = minAt(body, y), h = hd.h;
    const s = clamp(snap15(t - h.dur / 2), 0, 1440 - h.dur), e = s + h.dur;
    hd.target = { date: strip.dataset.date, start: s, end: e };
    paintGhost(body, s, e, { habit: true, color: h.color, title: h.name });
    ct.textContent = `${h.name} · ${dayLabel(strip.dataset.date, NOW)} · ${fmtRangeLong(s, e)}`;
  } else {
    hd.target = null;
    if (ghostEl) { ghostEl.remove(); ghostEl = null; } clearRtags(); hotStrip(null);
    ct.textContent = `${hd.h.name} · drop it on a day`;
  }
  edgeOn({ x, y }, () => updateHabitDrag(hd.x, hd.y));
}
function endHabitDrag(commit) {
  const d = hd; hd = null; if (!d) return;
  edgeOff();
  if (d.on) {
    chipEl.classList.remove('on'); d.row.classList.remove('dragging'); app.classList.remove('habitdrag');
    const tg = d.target; clearPending();
    if (commit && tg) createHabitEvent(d.h, tg);
  }
}
async function createHabitEvent(h, tg) {
  const e = mkEvent({ title: h.name, date: tg.date, start: tg.start, end: tg.end, kind: 'habit' });
  S.events.push(e); S.last = e;
  await place([e]);
  bubble(`Added ${h.name}, ${dayLabel(e.date, NOW)} ${fmtRangeLong(e.start, e.end)}.`, { acts: [{ label: 'Undo', fn: () => undoCreate([e]) }], ms: 4200 });
}
document.addEventListener('pointermove', ev => {
  if (!hd || ev.pointerId !== hd.id) return;
  if (!hd.on) { if (Math.hypot(ev.clientX - hd.x0, ev.clientY - hd.y0) < 6) return; beginHabitDrag(); }
  updateHabitDrag(ev.clientX, ev.clientY);
});
document.addEventListener('pointerup', ev => { if (hd && ev.pointerId === hd.id) endHabitDrag(true); });
document.addEventListener('pointercancel', ev => { if (hd && ev.pointerId === hd.id) endHabitDrag(false); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && hd) endHabitDrag(false); });

/* =========================================================
   UNDERSTANDING: every sentence goes to Claude first, with the local parser as the fallback
   ========================================================= */
let SAMPLE;                                         // undefined: not asked yet; null: not available
async function getSample() {
  if (SAMPLE !== undefined) return SAMPLE;
  try { SAMPLE = (window.claude && window.claude.use) ? await window.claude.use('sample') : null; } catch (e) { SAMPLE = null; }
  return SAMPLE || null;
}
function updateAiHint() {
  const on = !!SAMPLE && !S.aiOff, chip = $('#aiChip');
  if (chip) { chip.textContent = on ? 'AI on' : 'Basic mode · connect AI'; chip.className = 'aiChip ' + (on ? 'on' : 'off'); chip.title = on ? 'KOIOS reads every sentence with Claude.' : 'Tap to connect the AI. Basic mode understands simple sentences only.'; }
  $('#chatHint').textContent = on ? 'Ask anything, or drag a time range.' : 'Try “move tomorrow’s dentist visit to 5PM”, or drag a time range.';
}
$('#aiChip').addEventListener('click', async () => {
  const chip = $('#aiChip');
  if (SAMPLE && !S.aiOff) { bubble('The AI is on. I read every sentence you type.', { ms: 2600 }); return; }
  S.aiOff = false; SAMPLE = undefined; chip.textContent = 'Connecting…';
  const smp = await getSample();
  if (!smp) { updateAiHint(); return bubble('The AI is not available in this view. I will keep using basic understanding.', { ms: 4500 }); }
  try { await smp('Reply with the single word: ok', { modelTier: 'quick', cache: false }); bubble('AI connected. Ask me anything.', { ms: 2800 }); }
  catch (e) { if (e && e.code === 'not_granted') S.aiOff = true; bubble(e && e.code === 'not_granted' ? 'AI access was declined. Tap the chip any time to try again.' : 'The AI did not answer. Basic mode stays on.', { ms: 4500 }); }
  updateAiHint();
});
function snapshot() { return JSON.stringify({ events: S.events.map(({ hide, ...e }) => e), habits: S.habits, themes: S.themes, weekThemes: S.weekThemes, pref: S.pref }); }
function restore(js) {
  const o = JSON.parse(js);
  S.events = o.events.map(e => ({ ...e, hide: false })); S.habits = o.habits; S.themes = o.themes; S.weekThemes = o.weekThemes; S.pref = o.pref; S.last = null;
  syncPrefUI(); setAnim(S.pref.anim); refreshAll();
}
const cleanStr = (v, n = 60) => (typeof v === 'string' || typeof v === 'number') ? String(v).replace(/\s+/g, ' ').trim().slice(0, n) : '';
const aiMin = v => { if (typeof v === 'string') { const m = v.match(/^(\d{1,2}):(\d{2})$/); if (m) return +m[1] * 60 + +m[2]; v = +v; } return Number.isFinite(v) ? clamp(Math.round(v), 0, 1440) : null; };
const okDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= WIN_START_S && s <= WIN_END_S;
const dayList = v => Array.isArray(v) ? [...new Set(v.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
const KINDS = ['once', 'fixed', 'habit'];
function findEvents(m) {
  m = m || {};
  if (m.id) { const e = S.events.find(x => x.id === m.id); return e ? [e] : []; }
  const t = cleanStr(m.title).toLowerCase(); if (!t) return [];
  let list = S.events.filter(e => e.title.toLowerCase() === t || e.title.toLowerCase().includes(t));
  if (okDate(m.date)) return list.filter(e => e.date === m.date);
  if (m.all === true) return list;
  if (list.length && list.every(e => e.series && e.series === list[0].series)) return list;
  const up = list.filter(e => e.date >= TODAY_S).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  return up.length ? [up[0]] : list.slice(0, 1);
}
function normTimes(a, b, title) {
  let s = aiMin(a), e = aiMin(b);
  if (s == null) s = prefFor(title); if (s >= 1440) s = 1380;
  if (e == null || e <= s) e = Math.min(1440, s + durFor(title));
  if (e <= s) s = Math.max(0, e - 15);
  return [s, e];
}
function mondayOf(ds) { const d = fromYmd(ds); return addDays(d, -mondayIdx(d)); }
function syncPrefUI() { $('#pThemes').checked = S.pref.themes; $('#pSeasons').checked = S.pref.seasons; $('#pRemind').checked = S.pref.remind; if ($('#aRemind')) $('#aRemind').checked = S.pref.remind; }

/* applies a list of actions from the AI (or the local setup). Everything is validated first */
function applyActions(actions, { onlyEvents = false } = {}) {
  const out = { created: [], changed: 0, notes: [], ask: null, touched: [] };
  if (!Array.isArray(actions)) return out;
  for (const a of actions.slice(0, 40)) {
    if (!a || typeof a !== 'object') continue;
    try {
      switch (a.type) {
        case 'create_event': {
          const title = cleanStr(a.title, 70); if (!title) break;
          if (!okDate(a.date)) { out.notes.push(`${title} is outside the 90 days shown`); break; }
          if (a.allDay === true) {
            let end = okDate(a.endDate) && a.endDate >= a.date ? a.endDate : a.date;
            if (S.events.some(x => x.allDay && x.title === title && x.date === a.date)) break;
            const ev = mkEvent({ title, date: a.date, endDate: end, allDay: true, milestone: !!a.milestone, color: parseColor(a.color), desc: cleanStr(a.desc, 600) });
            S.events.push(ev); out.created.push(ev); out.changed++; break;
          }
          const [s, e] = normTimes(a.start, a.end, title);
          if (S.events.some(x => x.title === title && x.date === a.date && x.start === s)) break;
          const ev = mkEvent({ title, date: a.date, start: s, end: e, kind: KINDS.includes(a.kind) ? a.kind : 'once', milestone: !!a.milestone, color: parseColor(a.color), desc: cleanStr(a.desc, 600) });
          S.events.push(ev); out.created.push(ev); out.changed++; break;
        }
        case 'create_series': {
          const title = cleanStr(a.title, 70), days = dayList(a.days); if (!title || !days.length) break;
          const [s, e] = normTimes(a.start, a.end, title), series = nid(), kind = KINDS.includes(a.kind) ? a.kind : 'fixed', color = parseColor(a.color);
          for (let i = WIN_BACK; i < N_DAYS; i++) {
            const ds = dateAt(i); if (!days.includes(fromYmd(ds).getDay())) continue;
            if (S.events.some(x => x.title === title && x.date === ds && x.start === s)) continue;
            const ev = mkEvent({ title, date: ds, start: s, end: e, kind, series, color }); S.events.push(ev); out.created.push(ev);
          }
          out.changed++; break;
        }
        case 'update_event': {
          const set = a.set || {}, list = findEvents(a.match); if (!list.length) { out.notes.push('I could not find that event'); break; }
          for (const ev of list) {
            if (set.title) ev.title = cleanStr(set.title, 70) || ev.title;
            if (!ev.allDay && (set.start != null || set.end != null)) {
              const s = set.start != null ? aiMin(set.start) : ev.start, e = set.end != null ? aiMin(set.end) : (set.start != null ? ev.end + (aiMin(set.start) - ev.start) : ev.end);
              if (s != null && e != null && e > s && s < 1440) { ev.start = s; ev.end = Math.min(1440, e); }
            }
            if (list.length === 1 && okDate(set.date)) {
              if (ev.allDay) { const len = daysBetween(ev.date, ev.endDate || ev.date); ev.date = set.date; ev.endDate = okDate(set.endDate) && set.endDate >= set.date ? set.endDate : ymd(addDays(fromYmd(set.date), len)); if (ev.endDate > WIN_END_S) ev.endDate = WIN_END_S; }
              else ev.date = set.date;
            } else if (ev.allDay && okDate(set.endDate) && set.endDate >= ev.date) ev.endDate = set.endDate;
            if (set.color != null) ev.color = set.color === 'none' ? null : (parseColor(set.color) || ev.color);
            if (KINDS.includes(set.kind)) ev.kind = set.kind;
            if (typeof set.milestone === 'boolean') ev.milestone = set.milestone;
            if (typeof set.desc === 'string') ev.desc = cleanStr(set.desc, 600);
            out.touched.push(ev); out.changed++;
          }
          S.last = list[0]; break;
        }
        case 'delete_event': {
          const list = findEvents(a.match); if (!list.length) { out.notes.push('I could not find that event'); break; }
          S.events = S.events.filter(e => !list.includes(e)); if (S.last && list.includes(S.last)) S.last = null; out.changed++; break;
        }
        case 'add_habit': { if (onlyEvents) break; const h = addHabit(a.name, { dur: a.dur, color: a.color }); if (h) out.changed++; break; }
        case 'update_habit': {
          const h = habitByName(cleanStr(a.name)); const set = a.set || {}; if (!h) { out.notes.push(`I do not have a habit called ${cleanStr(a.name)}`); break; }
          if (set.name) { const nn = cleanStr(set.name, 28); if (nn) { S.events.forEach(e => { if (e.title.toLowerCase() === h.name.toLowerCase()) e.title = nn; }); h.name = nn; } }
          if (set.dur) h.dur = clamp(Math.round(+set.dur / 15) * 15 || h.dur, 15, 480);
          if (set.color) { const c = parseColor(set.color); if (c) h.color = c; else out.notes.push('I did not know that colour'); }
          out.changed++; break;
        }
        case 'delete_habit': { const h = habitByName(cleanStr(a.name)); if (h) { removeHabit(h, !!a.removeEvents); out.changed++; } break; }
        case 'day_theme': {
          const days = dayList(a.days), word = cleanStr(a.word, 14).toLowerCase().replace(/\s*day$/, '').split(' ')[0]; if (!days.length || !word) break;
          S.themes = S.themes.filter(t => !days.includes(t.dow)); days.forEach(d => S.themes.push({ dow: d, word })); S.pref.themes = true; out.changed++; break;
        }
        case 'clear_day_themes': S.themes = []; out.changed++; break;
        case 'week_theme': {
          if (!okDate(a.date)) break; const label = cleanStr(a.label, 32); if (!label) break;
          S.weekThemes[ymd(mondayOf(a.date))] = { label, icon: ICONS[a.icon] ? a.icon : 'star' }; S.pref.seasons = true; out.changed++; break;
        }
        case 'zoom': if (Z[a.level] && calReady) { setZoom(a.level); } break;
        case 'time_zoom': if (calReady) setTimeStep(+a.every); break;
        case 'goto': if (okDate(a.date) && calReady) scrollToDate(a.date, { ms: 380, min: a.minute != null ? aiMin(a.minute) : null }); break;
        case 'pref': if (['themes', 'seasons', 'remind'].includes(a.key)) { S.pref[a.key] = !!a.value; out.changed++; } break;
        case 'ask': { const q = cleanStr(a.question, 140); if (q) out.ask = { question: q, options: (Array.isArray(a.options) ? a.options : []).map(o => cleanStr(o, 30)).filter(Boolean).slice(0, 4) }; break; }
        default: break;
      }
    } catch (err) { console.warn('action failed', a, err); }
  }
  if (out.created.length) S.last = out.created[0];
  return out;
}

const ACTION_DOC = `Actions (use as many as needed, at most 30):
{"type":"create_event","title":"","date":"YYYY-MM-DD","start":1080,"end":1140,"kind":"once|fixed|habit","milestone":false,"color":"#hex (only if asked)","desc":"(only if asked)"}
{"type":"create_event","title":"","date":"YYYY-MM-DD","endDate":"YYYY-MM-DD","allDay":true}   (a DAY TASK: whole days, no time; endDate is the last day, inclusive)
{"type":"create_series","title":"","days":[1,3],"start":540,"end":615,"kind":"fixed|habit"}   (repeats weekly through the visible window)
{"type":"update_event","match":{"id":"","title":"","date":"","all":false},"set":{"title":"","date":"YYYY-MM-DD","start":0,"end":0,"color":"#hex|none","kind":"","milestone":true,"desc":"","endDate":"YYYY-MM-DD"}}   (this MOVES or EDITS an event that already exists; never create a new one for that)
{"type":"delete_event","match":{"id":"","title":"","date":"","all":false}}
{"type":"add_habit","name":"","dur":45,"color":"#hex (only if asked)"}
{"type":"update_habit","name":"","set":{"name":"","dur":30,"color":"#hex"}}   (a habit's colour recolours all its events)
{"type":"delete_habit","name":"","removeEvents":false}
{"type":"day_theme","days":[1],"word":"run"}   {"type":"clear_day_themes"}
{"type":"week_theme","date":"YYYY-MM-DD","label":"Finals week","icon":"book|star|leaf|snow|flower|sun|wave|heart|flag|firework|cap|gift|moon|ball|candle|tree|lantern|clover|egg|harvest|pumpkin"}
{"type":"zoom","level":"day|3|week|month"}   (how many days are on screen)
{"type":"time_zoom","every":15|30|60|120|240}   (minutes per label on the time axis)
{"type":"goto","date":"YYYY-MM-DD"}
{"type":"pref","key":"themes|seasons|remind","value":true}
{"type":"ask","question":"","options":["",""]}   (only when something essential is missing)`;

function ctxJson() {
  const seen = new Map(), series = [], once = [];
  for (const e of S.events) {
    if (e.series) { if (!seen.has(e.series)) { const s = { title: e.title, kind: e.kind, days: new Set(), start: e.start, end: e.end }; seen.set(e.series, s); series.push(s); } seen.get(e.series).days.add(fromYmd(e.date).getDay()); }
    else once.push(e);
  }
  const lo = ymd(addDays(TODAY, -1)), hi = ymd(addDays(TODAY, 45));
  return JSON.stringify({
    today: TODAY_S, weekday: DOW_LONG[TODAY.getDay()], visibleWindow: [WIN_START_S, WIN_END_S],
    habits: S.habits.map(h => ({ name: h.name, dur: h.dur, color: h.color })),
    recurring: series.map(s => ({ title: s.title, kind: s.kind, days: [...s.days].sort(), start: s.start, end: s.end })),
    events: once.filter(e => e.date >= lo && e.date <= hi).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 60).map(e => ({ id: e.id, title: e.title, date: e.date, start: e.start, end: e.end, kind: e.kind, milestone: e.milestone, desc: e.desc || undefined, allDay: e.allDay || undefined, endDate: e.allDay ? e.endDate : undefined })),
    dayThemes: S.themes, draggedRange: S.pending || null,
    lastEvent: S.last ? { id: S.last.id, title: S.last.title, date: S.last.date, start: S.last.start, end: S.last.end } : null,
    about: S.profile.summary || ''
  });
}
function chatPrompt(raw) {
  const convo = (S.convo || []).slice(-6).map(m => (m.role === 'user' ? 'USER: ' : 'KOIOS: ') + m.content).join('\n');
  return `You are KOIOS, the AI agent inside a calendar app. Read the user's message, understand what they want in any wording, and change their calendar.
Reply with ONLY one JSON object: {"say":"<=160 characters, warm and direct, no emoji, says what you did or answers the question","actions":[...]}.
Times are integers: minutes after midnight (6AM=360, 6:30PM=1110, midnight end=1440). Dates are YYYY-MM-DD. Days of the week: 0=Sunday ... 6=Saturday.
${ACTION_DOC}
Rules:
- Resolve "today", "tomorrow", "next Tuesday" from today's date in the calendar state. Only use dates inside visibleWindow.
- If no time is given, choose a sensible one (classes in the morning, study 17:30 to 19:30, gym 17:30). If the user dragged a range (draggedRange) and gives only a title, use that range.
- A study plan or prep request ("help create a study plan for tomorrow's chem session") means: create 2 to 5 'Study: <subject>' blocks (kind habit) in free time before it, never overlapping existing events, between 6AM and 11PM, and say what the plan is in one sentence.
- Colour requests ("make Piano red") use update_habit when it is a habit, else update_event with all:true. Accept any colour name.
- MOVE / RESCHEDULE / RENAME / CANCEL sentences ("move tomorrow's econ session to 8PM", "push the dentist to Friday", "cancel my 3PM") are edits of an event that already exists: use update_event or delete_event with match {title, date} taken from the calendar state (title keywords like "econ" match "Econ 101"; "tomorrow's" gives the date). NEVER create_event for them. If no existing event matches, use "ask" or say so in "say" with "actions":[].
- A DAY TASK is something that covers whole days with no time ("I will be writing my Lit essay for the next two days", "trip to Boston Friday to Sunday", "all day Thursday"): create_event with allDay true, date, endDate (inclusive; same as date for one day), and no start or end. If draggedRange has allDay true, put the day task on exactly that range. Timed events keep start and end.
- "milestone" means an important dated goal: set milestone true (create_event, or update_event set.milestone). A description or note goes in "desc".
- Do not add anything the user did not ask for. For questions or chat, answer in "say" with "actions":[].
- If the message refers to the last thing ("move it to 5", "make it longer"), use lastEvent.
CALENDAR STATE: ${ctxJson()}
${convo ? 'RECENT CONVERSATION:\n' + convo + '\n' : ''}USER MESSAGE: ${JSON.stringify(raw)}`;
}
function setupPrompt(a) {
  return `You are KOIOS, the AI agent inside a calendar app, setting up a new user's calendar from three onboarding answers.
Reply with ONLY one JSON object: {"say":"two short sentences, personal, mentioning one concrete thing they told you, no emoji","profile":"one sentence summary of the user","actions":[...]}.
Times are integers: minutes after midnight (6AM=360, midnight=1440). Dates are YYYY-MM-DD. Days of the week: 0=Sunday ... 6=Saturday. Today is ${TODAY_S} (${DOW_LONG[TODAY.getDay()]}). Only use dates between ${WIN_START_S} and ${WIN_END_S}.
${ACTION_DOC}
Rules:
- add_habit for every habit they mention (sensible dur in minutes). If they gave days or times for a habit, also create_series with kind "habit" for it.
- create_series (kind "fixed") only for recurring commitments they stated or clearly implied (classes, work, practice, club). If you must assume times, say so in "say".
- day_theme when a habit clearly owns a weekday ("Mondays I run" -> days [1], word "run").
- create_event with milestone true for dated goals or deadlines ("midterm in three weeks" -> compute the date). Never invent events they did not mention. Honour "keep Sundays free" or similar by not scheduling there.
- Do not set colours.
ANSWERS:
1. What do you do day to day? ${JSON.stringify(a.work || '')}
2. Which habits should I protect? ${JSON.stringify(a.habits || '')}
3. Anything else? ${JSON.stringify(a.more || '')}`;
}
async function askClaude(prompt, ms = 40000) {
  const smp = await getSample(); if (!smp || S.aiOff) return null;
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
  try { return await smp.json(prompt, { modelTier: 'default', cache: false, signal: ac.signal }); }
  catch (e) { if (e && e.code === 'not_granted') { S.aiOff = true; updateAiHint(); } console.warn('AI unavailable:', e && (e.code || e.message)); throw e; }
  finally { clearTimeout(to); }
}
async function aiSetup(a) {
  let res; try { res = await askClaude(setupPrompt(a)); } catch (e) { return null; }
  if (!res || !Array.isArray(res.actions) || !res.actions.length) return null;
  return { actions: res.actions, say: cleanStr(res.say, 220), summary: cleanStr(res.profile, 200), source: 'ai' };
}
/* local fallback for onboarding */
function localSetup(a) {
  const all = ((a.work || '') + ' ' + (a.habits || '') + ' ' + (a.more || '')).toLowerCase(), acts = [], parts = [];
  const words = ['running', 'piano', 'gym', 'reading', 'study', 'yoga', 'meditation', 'swimming', 'guitar', 'violin', 'stretching', 'cycling', 'journaling', 'cooking'];
  const habs = words.filter(w => new RegExp('\\b' + w.slice(0, 5), 'i').test(all));
  habs.forEach(w => acts.push({ type: 'add_habit', name: w.charAt(0).toUpperCase() + w.slice(1) }));
  if (/run|jog/.test(all)) acts.push({ type: 'day_theme', days: [1], word: 'run' });
  if (/gym|lift|workout/.test(all)) acts.push({ type: 'day_theme', days: [5], word: 'gym' });
  const student = /student|class|college|school|freshman|sophomore|junior|senior|university|duke/.test(all);
  if (student) { acts.push({ type: 'create_series', title: 'Classes', days: [1, 2, 3, 4, 5], start: 540, end: 900, kind: 'fixed' }); parts.push('a weekday Classes block (9AM to 3PM, change it any time)'); }
  else if (/work|job|intern|office/.test(all)) { acts.push({ type: 'create_series', title: 'Work', days: [1, 2, 3, 4, 5], start: 540, end: 1020, kind: 'fixed' }); parts.push('a weekday Work block (9AM to 5PM)'); }
  const say = `Set up ${habs.length ? habs.length + ' habit' + (habs.length > 1 ? 's' : '') : 'your calendar'}${parts.length ? ' and ' + parts.join(' and ') : ''}.`;
  return { actions: acts, say, summary: cleanStr(a.work, 160), source: 'local' };
}
function applyProfileResult(r) {
  S.personalized = true;
  S.events = []; S.habits = []; S.themes = []; S.weekThemes = {}; S.last = null; S.reminded = false;
  S.profile.summary = r.summary || '';
  const out = applyActions(r.actions);
  if (!S.habits.length) addHabitsFromText((S.profile.habits || ''));
  if (calReady) refreshAll();
  return out;
}

/* =========================================================
   CHAT: every sentence is read, no double confirmation
   ========================================================= */
let typingT = 0;
chatInput.addEventListener('input', () => {
  S.typing = true; clearTimeout(typingT); typingT = setTimeout(() => { S.typing = false; }, 5000);
  if (!S.busy && !S.aiBusy) fig.setMood(chatInput.value ? 'thinking' : 'neutral');
  if (!chatInput.value && S.pending) clearPending();
});
chatInput.addEventListener('blur', () => { if (!S.busy && !S.aiBusy) fig.setMood('neutral'); S.typing = false; });
$('#chat').addEventListener('submit', ev => { ev.preventDefault(); const raw = chatInput.value.trim(); if (!raw) return; chatInput.value = ''; S.typing = false; handle(raw); });

async function handle(raw) {
  if (S.aiBusy) return bubble('One moment, I am still reading your last message.', { ms: 2200 });
  if (S.awaitingStudy && studyAnswer(raw)) return;
  const smp = await getSample();
  if (smp && !S.aiOff) { const done = await handleAI(raw); if (done) return; }
  return handleLocal(raw);
}
async function handleAI(raw) {
  S.aiBusy = true; fig.setMood('thinking'); bubble('Reading that…', { ms: 0 });
  const snap = snapshot();
  let res;
  try {
    const st = S.awaitingStudy; S.awaitingStudy = null; chatInput.placeholder = nextPlaceholder();
    res = await askClaude(chatPrompt(st ? '(KOIOS asked when to block revision sessions before "' + st.title + '" on ' + st.date + '. This is the answer: create Study blocks before that date at that time, kind habit.) ' + raw : raw), 35000);
  }
  catch (e) {
    S.aiBusy = false; fig.setMood('neutral'); hideBubble();
    if (e && e.code === 'rate_limited') bubble('The AI is busy right now, so I will use my basic understanding.', { ms: 3000 });
    return false;
  }
  S.aiBusy = false;
  if (!res || typeof res !== 'object') { fig.setMood('neutral'); hideBubble(); return false; }
  const say = cleanStr(res.say, 200);
  const out = applyActions(res.actions);
  S.convo = [...(S.convo || []), { role: 'user', content: raw }, { role: 'assistant', content: say || '(done)' }].slice(-8);
  if (out.created.length) clearPending();
  refreshAll();
  fig.setMood(out.changed ? 'happy' : 'neutral');
  if (out.touched.length) { out.touched.slice(0, 6).forEach((e, i) => setTimeout(() => ripple(e.date), i * 60)); scrollToDate(out.touched[0].date, { ms: placeAnim() ? 320 : 0, min: out.touched[0].start }); }
  if (out.created.length) await place(out.created);
  const note = out.notes.length ? ' ' + out.notes.join('. ') + '.' : '';
  if (out.ask) {
    S.convo.push({ role: 'assistant', content: out.ask.question });
    bubble(out.ask.question, { acts: out.ask.options.map(o => ({ label: o, fn: () => handle(o) })), ms: 12000 });
  } else {
    const acts = out.changed ? [{ label: 'Undo', fn: () => restore(snap) }] : [];
    bubble((say || (out.changed ? 'Done.' : 'I did not change anything.')) + note, { acts, ms: out.changed ? 6000 : 5000 });
  }
  setTimeout(() => { if (!S.busy && !S.aiBusy) fig.setMood('neutral'); }, 1200);
  return true;
}

/* ---------- local fallback ---------- */
function periodWord(days, start, end) { return `${daysPhrase(days)}, ${fmtRangeLong(start, end)}`; }
function localExtras(raw) {
  let m;
  const colorRe = new RegExp(`\\b(?:make|turn|change|set|paint|colou?r|switch)\\s+(?:the\\s+)?(?:habit\\s+(?:of\\s+)?)?(.+?)\\s+(?:habit\\s+)?(?:into|to|in|as|=)?\\s*(?:the\\s+)?(?:colou?r\\s+)?(${COLOR_WORDS}|#[0-9a-f]{3,6})(?:\\s+colou?r)?\\s*[.!]?$`, 'i');
  if ((m = raw.match(colorRe))) {
    const target = m[1].replace(/\b(into|to|in|as|color|colour|the)\b/gi, '').replace(/\s+/g, ' ').trim(), col = parseColor(m[2]);
    if (col && target) {
      const snap = snapshot(), h = habitByName(target);
      if (h) { h.color = col; } else { const list = findEvents({ title: target, all: true }); if (!list.length) { fig.setMood('neutral'); bubble(`I could not find “${target}”.`, { ms: 3200 }); return true; } list.forEach(e => { e.color = col; }); }
      refreshAll(); fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
      bubble(`${h ? h.name : target} is ${m[2].toLowerCase()} now.`, { acts: [{ label: 'Undo', fn: () => restore(snap) }], ms: 4800 }); return true;
    }
  }
  if ((m = raw.match(/\b(?:add|create|new|start)\s+(?:a\s+)?(?:new\s+)?habit(?:\s+(?:of|called|named))?\s+(.+?)[.!]?$/i))) {
    const snap = snapshot(), h = addHabit(m[1]); refreshAll(); bubble(h ? `Added the habit ${h.name}.` : 'What should the habit be called?', { acts: h ? [{ label: 'Undo', fn: () => restore(snap) }] : [], ms: 4000 }); return true;
  }
  if ((m = raw.match(/\b(?:delete|remove|drop)\s+(?:the\s+)?habit(?:\s+(?:of|called))?\s+(.+?)[.!]?$/i))) {
    const h = habitByName(m[1]); if (h) deleteHabitUI(h); else bubble(`I do not have a habit called ${m[1]}.`, { ms: 3000 }); return true;
  }
  if (/\bzoom\s+(in|out)\b/i.test(raw) && !/\b(day|week|month)\b/i.test(raw)) { zoomTime(/in/i.test(raw.match(/\bzoom\s+(in|out)/i)[1]) ? 1 : -1); bubble('Time axis zoomed.', { ms: 1600 }); return true; }
  if ((m = raw.match(/\b(15|30)\s*(?:min|minutes)\b/i)) && /zoom|interval|detail|show|every/i.test(raw)) { setTimeStep(+m[1]); bubble(`Showing every ${m[1]} minutes.`, { ms: 2000 }); return true; }
  if ((m = raw.match(/\b(?:every|show)\s+(1|2|4)\s*(?:h|hr|hrs|hour|hours)\b/i)) && /zoom|interval|show|every/i.test(raw)) { setTimeStep(+m[1] * 60); bubble(`Showing every ${m[1]} hours.`, { ms: 2000 }); return true; }
  if (/\b(study\s+plan|plan\s+(?:my\s+)?study|study\s+schedule)\b/i.test(raw) || (/\bhelp\b/i.test(raw) && /\bstudy\b/i.test(raw))) {
    const day = /\btoday\b/i.test(raw) ? TODAY_S : ymd(addDays(TODAY, 1));
    const sm = raw.match(/\bfor\s+(?:(?:tomorrow|today)['’]?s?\s+|the\s+|my\s+)*([a-z0-9 &.-]+?)(?:\s+(?:session|exam|test|midterm|class|lecture|final|quiz))?\s*[.!?]?$/i);
    const subject = cleanStr(sm ? sm[1] : 'session', 28).replace(/^(a|an)\s+/i, '') || 'session';
    const evs = [[1050, 1140], [1200, 1260]].map(([s, e]) => mkEvent({ title: 'Study: ' + subject, date: day, start: s, end: e, kind: 'habit' }));
    const snap = snapshot(); S.events.push(...evs); S.last = evs[0]; fig.setMood('happy');
    place(evs).then(() => bubble(`Planned ${subject}: two focused blocks, 5:30–7PM and 8–9PM, ${dayLabel(day, NOW).toLowerCase()}. For a smarter plan, turn on the AI.`, { acts: [{ label: 'Undo', fn: () => restore(snap) }], ms: 7000 })); return true;
  }
  return false;
}
/* ---------- local edits: "move tomorrow’s econ session to 8PM" changes the event that exists, it never makes a new one ---------- */
const EDIT_START = /^(?:(?:please|pls|kindly|can you|could you|would you|hey koios,?|koios,?)\s+)*(move|reschedule|shift|push|postpone|delay|bump|rename|retitle|delete|remove|cancel|drop|change|update|edit)\b/i;
const T_STOP = new Set(['the', 'my', 'a', 'an', 'session', 'sessions', 'class', 'classes', 'meeting', 'meetings', 'event', 'events', 'appointment', 'task', 'tasks', 'one', 'that', 'this', 'of', 'for', 'on', 'at', 'to', 'all', 'and', 'time', 'slot', 'block', 'next', 'every', 'visit']);
function resolveTarget(txt) {
  let t = txt.replace(/[’]/g, "'").replace(/'s\b/g, '').replace(/\b(please|pls)\b/gi, ' ');
  const d = parseDay(t, NOW); let date = null;
  if (d) { date = d.date; t = t.replace(d.match, ' '); }
  const rg = parseTimeRange(t); let at = null;
  if (rg) { at = rg.start; t = t.replace(rg.match, ' '); } else { const tm = parseTime(t); if (tm) { at = tm.t; t = t.replace(tm.match, ' '); } }
  const words = t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !T_STOP.has(w));
  return { date, at, words, text: words.join(' ') };
}
function matchEvents(tg) {
  let list = S.events.filter(e => !e.hide);
  if (tg.date) list = list.filter(e => e.date === tg.date);
  if (tg.words.length) list = list.filter(e => { const ti = e.title.toLowerCase(); return tg.words.every(w => ti.includes(w) || (w.length >= 4 && ti.split(/[^a-z0-9]+/).some(x => x.startsWith(w.slice(0, 4))))); });
  else if (!tg.date && tg.at == null) return [];
  if (tg.at != null) { const near = list.filter(e => Math.abs(e.start - tg.at) <= 30); if (near.length) list = near; }
  list.sort((a, b) => (a.date >= TODAY_S ? 0 : 1) - (b.date >= TODAY_S ? 0 : 1) || a.date.localeCompare(b.date) || a.start - b.start);
  return tg.date ? list : (list.length ? [list[0]] : []);
}
function notFound(tg, raw) {
  fig.setMood('neutral');
  const what = tg.words.length ? `“${tg.words.join(' ')}”` : 'that';
  bubble(`I could not find ${what}${tg.date ? ' on ' + dayLabel(tg.date, NOW).toLowerCase() : ''}. Which event do you mean?`, { ms: 5200 });
  chatInput.value = raw; chatInput.focus();
  return true;
}
function localEdit(raw) {
  const vm = raw.match(EDIT_START); if (!vm) return false;
  const verb = vm[1].toLowerCase(), rest = raw.slice(vm[0].length).trim();
  if (/^(it|that|this|the last one)\b/i.test(rest) && S.last) return false;             // handled as “adjust the last event”
  if (/^(the\s+)?habits?\b/i.test(rest) || /^(the\s+)?(day|week)\s+themes?\b/i.test(rest) || /\b(zoom|view|colou?r)\b/i.test(rest)) return false;
  const finish = (ev, before, msg) => {
    S.drop.add(ev.id); refreshAll(); S.drop.clear(); S.last = ev;
    scrollToDate(ev.date, { ms: placeAnim() ? 320 : 0, min: ev.start }); ripple(ev.date);
    fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
    bubble(msg, { acts: [{ label: 'Undo', fn: () => { Object.assign(ev, before); refreshAll(); } }], ms: 5600 });
  };
  if (/^(delete|remove|cancel|drop)$/.test(verb)) {
    const tg = resolveTarget(rest), list = matchEvents(tg); if (!list.length) return notFound(tg, raw);
    const snap = snapshot(); S.events = S.events.filter(e => !list.includes(e)); S.last = null; refreshAll(); fig.setMood('neutral');
    bubble(`Removed ${list[0].title}${list.length > 1 ? ' (' + list.length + ' events)' : ''}.`, { acts: [{ label: 'Undo', fn: () => restore(snap) }], ms: 5200 }); return true;
  }
  // “<verb> TARGET <to|at|until|for|on> DEST”
  const sp = rest.match(/^(.+?)\s+(?:to|until|till|onto|for|at|by|into|->)\s+(.+)$/i);
  if (/^(rename|retitle)$/.test(verb) || (verb === 'change' && sp && !parseDay(sp[2], NOW) && !parseTime(sp[2]) && !parseTimeRange(sp[2]))) {
    if (!sp) return false;
    const tg = resolveTarget(sp[1]), list = matchEvents(tg); if (!list.length) return notFound(tg, raw);
    const ev = list[0], before = { ...ev }, nt = sp[2].replace(/^["“']|["”']$/g, '').trim().replace(/^./, c => c.toUpperCase()).slice(0, 70);
    ev.title = nt; finish(ev, before, `Renamed to ${nt}.`); return true;
  }
  if (!sp) {                                                       // “move the dentist visit tomorrow 5PM” has no joiner
    const full = resolveTarget(rest);
    if (full.at == null) return false;
    const tg = { date: null, at: null, words: full.words, text: full.text };
    return doMove(tg, full, raw, finish);
  }
  const tg = resolveTarget(sp[1]), dest = sp[2];
  const dd = parseDay(dest, NOW), rg = parseTimeRange(dest), tm = rg ? null : parseTime(/am|pm|:|noon/i.test(dest) ? dest : 'at ' + dest.replace(/[^0-9:]/g, ''));
  if (!dd && !rg && !tm) return false;
  return doMove(tg, { date: dd && dd.date, start: rg && rg.start, end: rg && rg.end, at: tm && tm.t }, raw, finish, !!(dd && /next|this/i.test(dest)));
}
function doMove(tg, to, raw, finish) {
  const list = matchEvents(tg); if (!list.length) return notFound(tg, raw);
  const ev = list[0], before = { ...ev }, dur = ev.end - ev.start;
  if (to.start != null) { ev.start = to.start; ev.end = to.end; }
  else if (to.at != null) { ev.start = Math.min(to.at, 1440 - 15); ev.end = Math.min(1440, ev.start + dur); }
  if (to.date) ev.date = to.date;
  if (ev.date < WIN_START_S || ev.date > WIN_END_S) { Object.assign(ev, before); fig.setMood('neutral'); bubble('That day is outside the 90 days this calendar shows.', { ms: 4200 }); return true; }
  finish(ev, before, `Moved ${ev.title} to ${dayLabel(ev.date, NOW)}, ${fmtRangeLong(ev.start, ev.end)}.`);
  return true;
}
function localMilestone(raw) {
  let m;
  if ((m = raw.match(/^(?:please\s+)?(?:make|mark|set|turn)\s+(.+?)\s+(?:as\s+)?(?:a\s+|an\s+)?milestone\s*[.!]?$/i))) {
    const tg = resolveTarget(m[1].replace(/^(it|that)$/i, S.last ? S.last.title : '')), list = S.last && /^(it|that)$/i.test(m[1].trim()) ? [S.last] : matchEvents(tg);
    if (!list.length) return notFound(tg, raw);
    const ev = list[0], before = { ...ev }; ev.milestone = true; S.drop.add(ev.id); refreshAll(); S.drop.clear(); fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
    bubble(`${ev.title} is a milestone now.`, { acts: [{ label: 'Undo', fn: () => { Object.assign(ev, before); refreshAll(); } }], ms: 4200 }); return true;
  }
  return false;
}
/* the answer to “what time suits you?” */
function studyAnswer(raw) {
  const m = S.awaitingStudy; if (!m) return false;
  const low = raw.toLowerCase();
  if (/^(no|nope|cancel|never ?mind|not now|skip|forget it)\b/.test(low)) { S.awaitingStudy = null; chatInput.placeholder = nextPlaceholder(); bubble('No problem. Just ask whenever you want it.', { ms: 2800 }); return true; }
  let start = null, end = null;
  const rg = parseTimeRange(raw.replace(/\bto\b/gi, '-'));
  if (rg) { start = rg.start; end = rg.end; } else { const t = parseTime(raw); if (t) { start = t.t; end = Math.min(1440, start + 90); } }
  if (start == null) { if (/morning/.test(low)) { start = 540; end = 630; } else if (/afternoon/.test(low)) { start = 840; end = 960; } else if (/evening|night/.test(low)) { start = 1080; end = 1200; } }
  if (start == null) return false;                                // let the AI (or the basic parser) read it
  const rep = parseRepeat(raw) || (/\bweekday/i.test(raw) ? { days: [1, 2, 3, 4, 5] } : /\bweekend/i.test(raw) ? { days: [0, 6] } : /\b(every\s*day|daily|each day)\b/i.test(raw) ? { days: [0, 1, 2, 3, 4, 5, 6] } : null);
  const cm = raw.match(/\b(\d{1,2})\s+(?:sessions?|blocks?|times?|slots?)\b/i);
  S.awaitingStudy = null; chatInput.placeholder = nextPlaceholder();
  blockStudy(m, { start, end, days: rep && rep.days, count: cm ? clamp(+cm[1], 1, 12) : (rep ? 6 : 3) });
  return true;
}
const nextPlaceholder = () => 'Try: “' + EX[Math.floor(Math.random() * EX.length)] + '”';

const NUMW = { one: 1, a: 1, two: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
function createExtras(raw) {
  // "... as a milestone", "... in red", "description: ..." are read out of the sentence before the title is cleaned
  let text = raw, milestone = false, color = null, desc = '', m;
  if ((m = text.match(/\s*[,;]?\s*(?:with\s+(?:the\s+)?)?(?:description|details?|notes?)\s*[:\-]\s*(.+)$/i))) { desc = m[1].trim(); text = text.slice(0, m.index); }
  if (/\bmilestones?\b/i.test(text)) { milestone = true; text = text.replace(/\b(?:as\s+)?(?:an?\s+)?(?:important\s+)?milestones?\b/gi, ' '); }
  if ((m = text.match(new RegExp('\\b(?:in|colou?red|as)\\s+(' + COLOR_WORDS + ')\\b(?:\\s+colou?r)?', 'i')))) { color = parseColor(m[1]); text = text.replace(m[0], ' '); }
  // day tasks: "for the next two days", "all day", "day task", "from Monday to Wednesday"
  let allDay = false, days = 1, endDate = null, rdate = null;
  if ((m = text.match(/\b(?:for\s+)?(?:the\s+)?next\s+(\d+|one|two|three|four|five|six|seven)\s+days?\b|\bfor\s+(\d+|two|three|four|five|six|seven)\s+(?:whole\s+|full\s+)?days?\b|\b(?:over|across)\s+(\d+|two|three|four|five|six|seven)\s+days?\b/i))) {
    const n = m[1] || m[2] || m[3]; days = +n || NUMW[n.toLowerCase()] || 1; allDay = true; text = text.replace(m[0], ' ');
  }
  if ((m = text.match(/\b(?:as\s+)?(?:an?\s+)?(?:day[- ]?tasks?|all[- ]?day(?:\s+task|\s+event)?|whole[- ]day)\b/i))) { allDay = true; text = text.replace(m[0], ' '); }
  if ((m = text.match(/\bfrom\s+(.+?)\s+(?:to|until|through|thru)\s+(.+?)\s*[.!]?$/i))) {
    const d1 = parseDay(m[1], NOW), d2 = parseDay(m[2], NOW);
    if (d1 && d2 && !/\d\s*(am|pm)\b/i.test(m[0])) { allDay = true; rdate = d1.date; endDate = d2.date; text = text.replace(m[0], ' ' + d1.match + ' '); }
  }
  text = text.replace(/^\s*(?:i(?:'ll| will| am|'m)\s+)?(?:be\s+)?(?:going to\s+)?(?:be\s+)?/i, '');
  return { text: text.replace(/\s{2,}/g, ' ').trim(), milestone, color, desc, allDay, days, endDate, rdate };
}
async function handleLocal(raw) {
  if (!placing) fig.setMood('thinking');
  if (S.awaitingStudy && studyAnswer(raw)) return;
  if (localMilestone(raw) || localEdit(raw) || localExtras(raw)) return;
  const x = createExtras(raw);
  if (S.pending && S.pending.allDay) return doPendingDayTask(raw, x);
  const r = parseCommand(x.text || raw, { now: NOW, pending: S.pending, last: S.last, awaiting: S.awaiting });
  if (x.allDay || (S.zoom === 'month' && r.start == null && !r.days && (r.intent === 'create' || r.intent === 'ask') && r.title)) {
    r.intent = 'create'; r.allDay = true; r.date = r.date || x.rdate || TODAY_S; r.endDate = x.endDate || ymd(addDays(fromYmd(r.date), (x.days || 1) - 1)); r.start = null; r.end = null; r.kind = 'once'; delete r.days;
  }
  if (x.milestone) { r.milestone = true; if (!r.days) r.kind = 'once'; }
  if (x.color) r.color = x.color;
  if (x.desc) r.desc = x.desc;
  if (EDIT_START.test(raw) && (r.intent === 'create' || r.intent === 'ask' || r.intent === 'unknown')) {
    fig.setMood('neutral');
    return bubble('I am not sure which event you mean. Try "move tomorrow\u2019s dentist visit to 5PM", or turn on the AI for free-form requests.', { ms: 6000 });
  }
  if (r.intent !== 'ask') S.awaiting = null;
  switch (r.intent) {
    case 'create': return doCreate(r, raw);
    case 'adjust': return doAdjust(r, raw);
    case 'delete': return doDelete();
    case 'theme': return doTheme(r);
    case 'themesOff': S.pref.themes = false; $('#pThemes').checked = false; applyThemes(); fig.setMood('neutral'); return bubble('Done. Day labels are off.', { acts: [{ label: 'Undo', fn: () => { S.pref.themes = true; $('#pThemes').checked = true; applyThemes(); } }] });
    case 'zoom': fig.setMood('neutral'); setZoom(r.level); return bubble({ day: 'One day.', '3': 'Three days.', week: 'A week.', month: 'The whole month.' }[r.level], { ms: 1800 });
    case 'ask': {
      S.awaitingKept = { color: r.color, desc: r.desc };
      S.awaiting = { title: r.title, start: r.start, end: r.end, kind: r.kind, milestone: r.milestone };
      fig.setMood('neutral');
      return bubble(`Which day for ${r.title}?`, { acts: [{ label: 'Today', fn: () => handle('today') }, { label: 'Tomorrow', fn: () => handle('tomorrow') }], ms: 9000 });
    }
    default:
      fig.setMood('neutral');
      return bubble('I did not catch that. Try “put running every Monday 3PM” or “conference next Monday 2PM”.', { ms: 5200 });
  }
}
async function doPendingDayTask(raw, x) {
  const p = S.pending, body = x.text.includes('…') ? x.text.split('…').pop().trim() : x.text;
  const title = (typeof cleanTitle === 'function' ? cleanTitle(body.replace(/^.*·\s*day task\s*/i, '')) : body) || body || 'Day task';
  if (!title || /^event$/i.test(title)) { fig.setMood('neutral'); chatInput.value = raw + ' '; return bubble('What should I call it?', { ms: 3000 }); }
  const ev = mkEvent({ title: title.replace(/^./, c => c.toUpperCase()), date: p.date, endDate: p.endDate || p.date, allDay: true, milestone: x.milestone, color: x.color, desc: x.desc });
  clearPending(); S.events.push(ev); S.last = ev; await place([ev]);
  bubble(`Added ${ev.title}, ${dtRangeText(ev)}.`, { acts: [{ label: 'Undo', fn: () => undoCreate([ev]) }], ms: 5200 });
}
const dtRangeText = e => e.endDate && e.endDate !== e.date ? `${dayLabel(e.date, NOW)} to ${dayLabel(e.endDate, NOW)}` : dayLabel(e.date, NOW);
async function doCreate(r, raw) {
  if (r.allDay) {
    if (r.date < WIN_START_S || r.date > WIN_END_S) { fig.setMood('neutral'); return bubble('That day is outside the 90 days this calendar shows.', { ms: 4200 }); }
    if (r.endDate > WIN_END_S) r.endDate = WIN_END_S;
    const ev = mkEvent({ title: r.title, date: r.date, endDate: r.endDate, allDay: true, milestone: r.milestone, color: r.color, desc: r.desc });
    if (S.events.some(x => x.allDay && x.title === ev.title && x.date === ev.date)) { fig.setMood('neutral'); return bubble(`${ev.title} is already there.`, { ms: 3000 }); }
    clearPending(); S.events.push(ev); S.last = ev; await place([ev]);
    return bubble(`Added ${ev.title}, ${dtRangeText(ev)}.`, { acts: [{ label: 'Undo', fn: () => undoCreate([ev]) }], ms: 5200 });
  }
  r = { ...r, color: r.color || (S.awaitingKept && S.awaitingKept.color), desc: r.desc || (S.awaitingKept && S.awaitingKept.desc) }; S.awaitingKept = null;
  const cleanedRaw = raw.replace(/[–—-]/g, ' ');
  if (S.pending && r.title === 'Event' && !/[a-z]{3,}/i.test(cleanedRaw.replace(/\b(today|tomorrow|tonight|am|pm|mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, ''))) {
    fig.setMood('neutral'); chatInput.value = raw + ' '; chatInput.focus();
    return bubble('What should I call it?', { ms: 3200 });
  }
  const start = r.start != null ? r.start : prefFor(r.title);
  const end = r.end != null ? r.end : Math.min(1440, start + durFor(r.title));
  const evs = [];
  if (r.days) {
    const series = nid();
    for (let i = WIN_BACK; i < N_DAYS; i++) { const ds = dateAt(i); if (r.days.includes(fromYmd(ds).getDay())) evs.push(mkEvent({ title: r.title, date: ds, start, end, kind: r.kind, milestone: r.milestone, series, color: r.color, desc: r.desc })); }
  } else {
    if (r.date < WIN_START_S || r.date > WIN_END_S) { fig.setMood('neutral'); return bubble('That day is outside the 90 days this prototype shows.', { ms: 4200 }); }
    evs.push(mkEvent({ title: r.title, date: r.date, start, end, kind: r.kind, milestone: r.milestone, color: r.color, desc: r.desc }));
  }
  const fresh = evs.filter(e => !S.events.some(x => x.title === e.title && x.date === e.date && x.start === e.start));
  if (!fresh.length) { fig.setMood('neutral'); return bubble(`${r.title} is already there.`, { ms: 3000 }); }
  clearPending(); S.events.push(...fresh); S.last = fresh[0];
  await place(fresh);
  const when = r.days ? periodWord(r.days, start, end) : `${dayLabel(r.date, NOW)} ${fmtRangeLong(start, end)}`;
  bubble(`Added ${r.title}, ${when}.`, { acts: [{ label: 'Undo', fn: () => undoCreate(fresh) }], ms: 5200 });
}
function undoCreate(evs) { const ids = new Set(evs.map(e => e.id)); S.events = S.events.filter(e => !ids.has(e.id)); if (S.last && ids.has(S.last.id)) S.last = null; refreshAll(); }
async function doAdjust(r, raw = '') {
  const e = S.events.find(x => S.last && x.id === S.last.id);
  if (!e) { fig.setMood('neutral'); return bubble('Nothing to change yet.', { ms: 2600 }); }
  const before = { ...e };
  r = { ...r };
  if (r.start != null && r.end != null && before.start >= 720 && r.start < 720 && !/[ap]\.?m/i.test(raw)) { r.start += 720; r.end += 720; }   // “10-12:30” on an evening event means evening
  if (r.title) e.title = r.title;
  if (r.startShift != null) { const dur = e.end - e.start; e.start = r.startShift; e.end = Math.min(1440, e.start + dur); }
  if (r.start != null) e.start = r.start;
  if (r.end != null) e.end = r.end;
  if (r.extend) e.end = Math.min(1440, e.end + r.extend);
  let note = '';
  if (e.end <= e.start && r.end != null) {
    const alt = r.end + 720;                                       // "end at 11" after a 9PM start means 11PM
    if (alt > e.start && alt <= 1440) e.end = alt;
    else if (r.end <= 780) { e.end = 1440; note = ' Events stop at midnight in this prototype.'; }   // "12:30" after a 10PM start means just past midnight
  }
  if (e.end <= e.start) { Object.assign(e, before); fig.setMood('neutral'); return bubble('That would end before it starts. Tell me the end time again.', { ms: 4200 }); }
  if (r.date) e.date = r.date;
  else if (r.dow != null) { let d = TODAY; while (d.getDay() !== r.dow) d = addDays(d, 1); e.date = ymd(d); }
  if (e.date < WIN_START_S || e.date > WIN_END_S) { Object.assign(e, before); return bubble('That day is outside the 90 days this prototype shows.', { ms: 4200 }); }
  S.drop.add(e.id); refreshAll(); S.drop.clear();
  scrollToDate(e.date, { ms: placeAnim() ? 320 : 0, min: e.start }); ripple(e.date);
  fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
  bubble(`Updated ${e.title}, ${dayLabel(e.date, NOW)} ${fmtRangeLong(e.start, e.end)}.${note}`, { acts: [{ label: 'Undo', fn: () => { Object.assign(e, before); refreshAll(); } }], ms: 5200 });
}
function doDelete() {
  const e = S.events.find(x => S.last && x.id === S.last.id);
  fig.setMood('neutral');
  if (!e) return bubble('Nothing to remove yet.', { ms: 2600 });
  S.events = S.events.filter(x => x !== e); S.last = null; refreshAll();
  bubble(`Removed ${e.title}.`, { acts: [{ label: 'Undo', fn: () => { S.events.push(e); S.last = e; refreshAll(); } }], ms: 5200 });
}
function doTheme(r) {
  S.themes = S.themes.filter(t => !r.dows.includes(t.dow));
  r.dows.forEach(d => S.themes.push({ dow: d, word: r.word }));
  S.pref.themes = true; $('#pThemes').checked = true;
  applyThemes(); renderThemeChips();
  stripEls.filter(s => r.dows.includes(fromYmd(s.date).getDay())).slice(0, 14).forEach((s, i) => setTimeout(() => ripple(s.date), i * 50));
  fig.setMood('happy'); fig.play('hop'); setTimeout(() => fig.setMood('neutral'), 900);
  bubble(`${r.dows.map(d => DOW_LONG[d] + 's').join(' and ')} are ${r.word.toUpperCase()} DAY now.`, { ms: 4200 });
}

/* =========================================================
   EVENT POPOVER: edit by hand
   ========================================================= */
const evPop = $('#evPop'), pPanel = $('#pPanel'), mPanel = $('#mPanel'), aPanel = $('#aPanel');
let popEvent = null;
const toTime = m => m >= 1440 ? '23:59' : String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const fromTime = s => { if (!s) return null; const [h, m] = s.split(':').map(Number); return (h === 23 && m === 59) ? 1440 : h * 60 + m; };
function placePop(pop, anchorRect) {
  const a = $('#calendar').getBoundingClientRect(), W = a.width, H = a.height, w = pop.offsetWidth || 272, h = pop.offsetHeight || 260;
  let x = anchorRect.right - a.left + 8; if (x + w > W - 8) x = anchorRect.left - a.left - w - 8;
  pop.style.left = clamp(x, 8, W - w - 8) + 'px'; pop.style.top = clamp(anchorRect.top - a.top, 60, H - h - 8) + 'px'; pop.style.right = 'auto';
}
stripsEl.addEventListener('click', ev => {
  if (Date.now() - justDragged < 300) return;
  const el = ev.target.closest('.ev'); if (!el) return;
  const e = S.events.find(x => x.id === el.dataset.id); if (!e) return;
  openPop(e, el);
});
stripsEl.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList.contains('ev')) { ev.preventDefault(); ev.target.click(); } });
const SWATCHES = ['#2F6BFF', '#1FB9E0', '#7F8FF4', '#4C57E8', '#2FA866', '#7CC21A', '#E8B800', '#F2800C', '#E5484D', '#C2203C', '#B05CE6', '#7A869A'];
(function buildSwatches() {
  const box = $('#pSwatches');
  const none = document.createElement('button'); none.type = 'button'; none.className = 'sw none'; none.dataset.c = ''; none.title = 'Default'; none.setAttribute('aria-label', 'Default colour'); box.append(none);
  SWATCHES.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.dataset.c = c; b.style.setProperty('--c', c); b.setAttribute('aria-label', 'Colour ' + c); box.append(b); });
  box.addEventListener('click', ev => {
    const b = ev.target.closest('.sw'); if (!b || !popEvent) return;
    popEvent.color = b.dataset.c || null; markSwatch(); refreshAll();
  });
})();
function markSwatch() {
  const cur = popEvent && popEvent.color ? popEvent.color.toLowerCase() : '';
  $$('#pSwatches .sw').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.c || '').toLowerCase() === cur)));
}
let popNew = false;
function syncPopMode(e) {
  const ad = !!e.allDay;
  $('#pTimes').hidden = ad; $('#pDate2Wrap').hidden = !ad; $('#pDateLbl').textContent = ad ? 'From' : 'Day';
  $('#pAll').checked = ad; $('#pAllWrap').hidden = popNew && S.zoom === 'month';
}
function fillPop(e) {
  $('#pTitle').value = e.title; $('#pDate').value = e.date; $('#pDate').min = WIN_START_S; $('#pDate').max = WIN_END_S;
  $('#pDate2').value = e.endDate || e.date; $('#pDate2').min = WIN_START_S; $('#pDate2').max = WIN_END_S;
  $('#pStart').value = toTime(e.allDay ? 540 : e.start); $('#pEnd').value = toTime(e.allDay ? 600 : e.end);
  $('#pMile').checked = !!e.milestone; $('#pDesc').value = e.desc || ''; markSwatch(); syncPopMode(e);
  const n = e.series ? S.events.filter(x => x.series === e.series).length : 0;
  $('#pNote').textContent = popNew ? 'KOIOS will place it on your calendar.' : e.allDay ? 'Day task: covers the whole day, no time. Drag its edges to stretch it over more days.' : e.series ? `Part of a series of ${n}. Edits change this one only.` : (e.milestone ? 'Milestone: KOIOS counts down to it.' : 'One-off event. Drag it to move it, drag its top or bottom edge to change its length.');
  $('#pDel').textContent = popNew ? 'Cancel' : 'Delete'; $('#pDone').textContent = popNew ? 'Create' : 'Done';
}
function openPop(e, anchor, isNew = false) {
  closePops(); popEvent = e; popNew = isNew; fillPop(e);
  evPop.classList.add('on'); placePop(evPop, anchor.getBoundingClientRect());
  $('#pTitle').focus({ preventScroll: true }); if (isNew) $('#pTitle').select();
}
function closePops() { evPop.classList.remove('on'); pPanel.classList.remove('on'); mPanel.classList.remove('on'); aPanel.classList.remove('on'); popEvent = null; popNew = false; }
function applyPop() {
  if (!popEvent) return;
  const e = popEvent, t = $('#pTitle').value.trim(), d = $('#pDate').value.trim();
  if (t) e.title = t;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= WIN_START_S && d <= WIN_END_S) e.date = d;
  if (e.allDay) {
    const d2 = $('#pDate2').value.trim();
    e.endDate = /^\d{4}-\d{2}-\d{2}$/.test(d2) && d2 >= e.date && d2 <= WIN_END_S ? d2 : e.date;
    $('#pDate2').value = e.endDate; e.start = 0; e.end = 1440;
  } else {
    const s0 = fromTime($('#pStart').value), en = fromTime($('#pEnd').value);
    if (s0 != null && en != null && en > s0) { e.start = s0; e.end = en; }
    else if (s0 != null && en != null) { $('#pEnd').value = toTime(e.end); $('#pStart').value = toTime(e.start); }
  }
  e.milestone = $('#pMile').checked; e.desc = $('#pDesc').value.trim().slice(0, 600);
  if (!popNew) refreshAll();
}
function newEventPop(preset = {}) {
  if (S.view !== 'calendar') return;
  const p = S.pending, month = S.zoom === 'month' || (p && p.allDay);
  const e = month
    ? mkEvent({ title: preset.milestone ? 'New milestone' : 'New day task', date: p ? p.date : TODAY_S, endDate: p && p.endDate, allDay: true, milestone: !!preset.milestone })
    : mkEvent({ title: preset.milestone ? 'New milestone' : 'New event', date: p ? p.date : TODAY_S, start: p ? p.start : 9 * 60, end: p ? p.end : 10 * 60, kind: 'once', milestone: !!preset.milestone });
  openPop(e, $('#tNew'), true);
}
$('#tNew').addEventListener('click', ev => { ev.stopPropagation(); newEventPop(); });
['pTitle', 'pDate', 'pDate2', 'pStart', 'pEnd', 'pDesc'].forEach(id => $('#' + id).addEventListener('change', applyPop));
$('#pMile').addEventListener('change', applyPop);
$('#pAll').addEventListener('change', () => {
  const e = popEvent; if (!e) return; applyPop();
  if ($('#pAll').checked) { e.allDay = true; e.endDate = e.endDate || e.date; e.start = 0; e.end = 1440; }
  else { e.allDay = false; e.endDate = null; e.start = 9 * 60; e.end = 10 * 60; $('#pStart').value = '09:00'; $('#pEnd').value = '10:00'; }
  syncPopMode(e); if (!popNew) refreshAll();
});
$('#pDone').addEventListener('click', async () => {
  applyPop();
  if (popNew && popEvent) {
    const e = popEvent; if (!e.title.trim()) { $('#pTitle').focus(); return; }
    closePops(); clearPending(); S.events.push(e); S.last = e;
    await place([e]); bubble(`Added ${e.title}, ${e.allDay ? dtRangeText(e) : dayLabel(e.date, NOW) + ' ' + fmtRangeLong(e.start, e.end)}.`, { acts: [{ label: 'Undo', fn: () => undoCreate([e]) }], ms: 5200 }); return;
  }
  closePops();
});
$('#pDel').addEventListener('click', () => {
  const e = popEvent; if (!e) return;
  if (popNew) { closePops(); return; }
  S.events = S.events.filter(x => x !== e); if (S.last === e) S.last = null; closePops(); refreshAll();
  bubble(`Removed ${e.title}.`, { acts: [{ label: 'Undo', fn: () => { S.events.push(e); refreshAll(); } }], ms: 4200 });
});
document.addEventListener('pointerdown', ev => {
  if (evPop.classList.contains('on') && !evPop.contains(ev.target) && !ev.target.closest('.ev, .dt, .mbar') && ev.target !== $('#tNew')) { if (!popNew) applyPop(); evPop.classList.remove('on'); popEvent = null; popNew = false; }
  if (pPanel.classList.contains('on') && !pPanel.contains(ev.target) && ev.target !== $('#tPers')) pPanel.classList.remove('on');
  if (mPanel.classList.contains('on') && !mPanel.contains(ev.target) && !ev.target.closest('#tPrism, .bubble')) mPanel.classList.remove('on');
  if (aPanel.classList.contains('on') && !aPanel.contains(ev.target) && !ev.target.closest('#tAcct')) aPanel.classList.remove('on');
  if ($('#rail').classList.contains('open') && !$('#rail').contains(ev.target) && ev.target !== $('#tHabits')) $('#rail').classList.remove('open');
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { closePops(); clearPending(); hideBubble(); if (document.activeElement === chatInput) chatInput.value = ''; }
  else if (ev.key === '/' && S.view === 'calendar' && !/input|textarea|select/i.test(document.activeElement.tagName)) { ev.preventDefault(); chatInput.focus(); }
});

/* =========================================================
   PERSONALIZE: optional, defaults already applied
   ========================================================= */
function openPersonalize() { closePops(); pPanel.classList.add('on'); renderThemeChips(); syncPrefUI(); }
$('#tPers').addEventListener('click', () => { if (pPanel.classList.contains('on')) pPanel.classList.remove('on'); else openPersonalize(); });
$('#pClose').addEventListener('click', () => pPanel.classList.remove('on'));
function renderThemeChips() {
  const box = $('#themeChips'); box.innerHTML = '';
  S.themes.slice().sort((a, b) => mondayIdx({ getDay: () => a.dow }) - mondayIdx({ getDay: () => b.dow })).forEach(t => {
    const c = document.createElement('span'); c.className = 'chipx'; c.textContent = DOW_NAMES[t.dow] + ' · ' + t.word.toUpperCase() + ' DAY ';
    const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Remove'); x.textContent = '×';
    x.addEventListener('click', () => { S.themes = S.themes.filter(y => y !== t); applyThemes(); renderThemeChips(); });
    c.append(x); box.append(c);
  });
  if (!S.themes.length) box.textContent = 'No day themes.';
}
(function initPanel() {
  const sel = $('#thDow');
  [1, 2, 3, 4, 5, 6, 0].forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = DOW_LONG[d]; sel.append(o); });
  const bind = (id, key) => $('#' + id).addEventListener('change', e => { S.pref[key] = e.target.checked; if (key === 'themes') applyThemes(); else if (key === 'seasons') { renderBands(); layoutHead(); fitCalendar(); } else syncPrefUI(); });
  bind('pThemes', 'themes'); bind('pSeasons', 'seasons'); bind('pRemind', 'remind');
  $('#thAdd').addEventListener('click', () => {
    const w = $('#thWord').value.trim().toLowerCase().replace(/\s*day$/, ''); if (!w) return;
    doTheme({ dows: [+sel.value], word: w.split(' ')[0] }); $('#thWord').value = '';
  });
  $$('#animSeg button').forEach(b => b.addEventListener('click', () => setAnim(b.dataset.a)));
  $('#pReset').addEventListener('click', () => {
    S.pref = { ...DEFAULT_PREF }; S.themes = DEFAULT_THEMES(); S.weekThemes = {};
    syncPrefUI(); setAnim('full'); refreshAll();
  });
})();
function setAnim(a) {
  S.pref.anim = a; app.dataset.anim = a;
  $$('#animSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.a === a));
  idle.setLevel(a === 'full' ? 'full' : 'off');
  if (fig.setMotion) fig.setMotion(a === 'full' ? 1 : a === 'calm' ? 0.4 : 0);
}

/* =========================================================
   DAY TASKS: create by dragging across days, move them, stretch either end
   ========================================================= */
let dtd = null, justDragged = 0;
const dayIdxAtX = x => { const r = calEl.getBoundingClientRect(); return clamp(Math.floor((x - r.left + calEl.scrollLeft - LPAD) / (cur.dayW + cur.gap)), 0, N_DAYS - 1); };
function mDateAt(x, y) {
  const rows = $$('#mgrid .mw'); if (!rows.length) return null;
  const rects = rows.map(r => r.getBoundingClientRect());
  let i = rects.findIndex(b => y >= b.top && y <= b.bottom + 6); if (i < 0) i = y < rects[0].top ? 0 : rows.length - 1;
  const b = rects[i], c = clamp(Math.floor((x - b.left) / (b.width / 7)), 0, 6);
  return rows[i].children[c].dataset.date;
}
const dtDateAt = (x, y) => S.zoom === 'month' ? mDateAt(x, y) : dateAt(dayIdxAtX(x));
function dtHot(lo, hi) {
  if (S.zoom === 'month') $$('#mgrid .mc').forEach(c => c.classList.toggle('hot', !!lo && c.dataset.date >= lo && c.dataset.date <= hi));
  stripEls.forEach(st => { const g = $('.dgap', st.el); if (g) g.classList.toggle('hotd', !!lo && st.date >= lo && st.date <= hi); });
}
function dtBegin(mode, ev, e) {
  closePops(); clearPending(); hideBubble();
  const d0 = dtDateAt(ev.clientX, ev.clientY); if (!d0) return;
  if (mode === 'create' && (d0 < WIN_START_S || d0 > WIN_END_S)) return;
  dtd = { mode, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, a: d0, cur: d0, last: d0, e, moved: false, before: e ? { ...e } : null, snap: snapshot(), lo: d0, hi: d0, anchor: ev.target };
  if (mode === 'create') dtHot(d0, d0);
}
function dtMove(x, y) {
  const d = dtd; if (!d.moved && Math.hypot(x - d.x0, y - d.y0) < 5) return;
  d.moved = true; app.classList.add('evdrag');
  const dt = dtDateAt(x, y); if (!dt) return; d.cur = dt;
  if (d.mode === 'create') { d.lo = d.a < dt ? d.a : dt; d.hi = d.a < dt ? dt : d.a; dtHot(d.lo, d.hi); return; }
  if (dt === d.last) return; d.last = dt;
  const e = d.e, b = d.before, len = b.allDay ? daysBetween(b.date, b.endDate || b.date) : 0;
  if (d.mode === 'move') {
    let nd = ymd(addDays(fromYmd(b.date), daysBetween(d.a, dt)));
    if (nd < WIN_START_S) nd = WIN_START_S;
    let ne = ymd(addDays(fromYmd(nd), len)); if (ne > WIN_END_S) { ne = WIN_END_S; nd = ymd(addDays(fromYmd(ne), -len)); }
    e.date = nd; if (e.allDay) e.endDate = ne;
  } else if (d.mode === 'l') e.date = dt > (b.endDate || b.date) ? (b.endDate || b.date) : dt;
  else if (d.mode === 'r') e.endDate = dt < b.date ? b.date : dt;
  renderDayTasks(); renderMonth();
  $$(`[data-id="${e.id}"]`).forEach(el => el.classList.add('drag'));
}
function dtEnd(ev, cancel) {
  const d = dtd; if (!d || (ev && ev.pointerId !== d.id)) return; dtd = null; app.classList.remove('evdrag');
  if (d.mode === 'create') {
    if (cancel) { dtHot(null); return; }
    const lo = d.moved ? d.lo : d.a, hi = d.moved ? d.hi : d.a;
    dtHot(lo, hi); S.pending = { allDay: true, date: lo, endDate: hi }; openKoiosFor(S.pending); return;
  }
  const e = d.e;
  if (cancel) { Object.assign(e, d.before); refreshAll(); return; }
  if (!d.moved) { const el = document.querySelector(`#dlane [data-id="${e.id}"], #mgrid [data-id="${e.id}"]`); if (el) openPop(e, el); return; }
  justDragged = Date.now(); S.last = e; refreshAll();
  bubble(`${e.title}: ${e.allDay ? dtRangeText(e) : dayLabel(e.date, NOW)}.`, { acts: [{ label: 'Undo', fn: () => restore(d.snap) }], ms: 4200 });
}
$('#dlane').addEventListener('pointerdown', ev => {
  const el = ev.target.closest('.dt'); if (!el || ev.button > 0) return;
  const e = S.events.find(x => x.id === el.dataset.id); if (!e) return;
  dtBegin(ev.target.closest('.h.l') ? 'l' : ev.target.closest('.h.r') ? 'r' : 'move', ev, e);
});
$('#mgrid').addEventListener('pointerdown', ev => {
  if (ev.button > 0) return;
  const bar = ev.target.closest('.mbar');
  if (bar) { const e = S.events.find(x => x.id === bar.dataset.id); if (e) dtBegin(ev.target.closest('.h.l') ? 'l' : ev.target.closest('.h.r') ? 'r' : 'move', ev, e); return; }
  const n = ev.target.closest('.n'); if (n) return;
  const cell = ev.target.closest('.mc'); if (cell && !cell.classList.contains('out')) dtBegin('create', ev, null);
});
$('#mgrid').addEventListener('click', ev => {
  const n = ev.target.closest('.n'); if (!n) return;
  const cell = n.closest('.mc'); if (cell && !cell.classList.contains('out')) setZoom('week', { centerIdx: idxOf(cell.dataset.date) + 0.5 });
});
document.addEventListener('pointermove', ev => { if (dtd && ev.pointerId === dtd.id) dtMove(ev.clientX, ev.clientY); });
document.addEventListener('pointerup', ev => dtEnd(ev, false));
document.addEventListener('pointercancel', ev => dtEnd(ev, true));
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && dtd) dtEnd(null, true); });

/* =========================================================
   TIMED EVENTS: drag to another time or day, drag the top or bottom edge to change the length
   ========================================================= */
let ed = null;
stripsEl.addEventListener('pointerdown', ev => {
  const el = ev.target.closest('.ev'); if (!el || ev.button > 0 || !calReady) return;
  const e = S.events.find(x => x.id === el.dataset.id); if (!e || e.allDay) return;
  const body = el.closest('.sbody'), m = (ev.clientY - body.getBoundingClientRect().top) / cur.hpx * 60;
  ed = { el, e, mode: ev.target.closest('.rz.t') ? 'rt' : ev.target.closest('.rz.b') ? 'rb' : 'mv', id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, cx: ev.clientX, cy: ev.clientY, on: false, before: { ...e }, grab: m - e.start, touch: ev.pointerType === 'touch', snap: snapshot() };
  if (ed.touch) ed.t = setTimeout(() => { if (ed && !ed.on) edStart(); }, 380);
});
function edStart() {
  ed.on = true; closePops(); hideBubble(); ed.el.classList.add('moving'); app.classList.add(ed.mode === 'mv' ? 'evdrag' : 'evrz');
  try { ed.el.setPointerCapture(ed.id); } catch (e) { /* ignore */ }
}
function edUpdate() {
  if (!ed || !ed.on) return;
  const e = ed.e, b = ed.before, dur = b.end - b.start;
  const st = stripEls[dayIdxAtX(ed.cx)], r = st.body.getBoundingClientRect(), raw = (ed.cy - r.top) / cur.hpx * 60;
  if (ed.mode === 'mv') {
    const s0 = clamp(snap15(raw - ed.grab), 0, 1440 - dur); e.start = s0; e.end = s0 + dur; e.date = st.date;
    if (ed.el.parentNode !== st.evs) st.evs.append(ed.el);
    ed.el.style.setProperty('--lane', 0); ed.el.style.setProperty('--lanes', 1);
  } else if (ed.mode === 'rt') e.start = clamp(snap15(raw), 0, b.end - 15);
  else e.end = clamp(snap15(raw), b.start + 15, 1440);
  ed.el.style.setProperty('--s', e.start); ed.el.style.setProperty('--d', Math.max(e.end - e.start, 15)); ed.el.dataset.d = Math.max(e.end - e.start, 15);
  const i = $('i', ed.el); if (i) i.textContent = fmtRange(e.start, e.end);
  setRtags(e.start, e.end); markShort();
}
document.addEventListener('pointermove', ev => {
  if (!ed || ev.pointerId !== ed.id) return;
  ed.cx = ev.clientX; ed.cy = ev.clientY;
  if (!ed.on) {
    const dist = Math.hypot(ev.clientX - ed.x0, ev.clientY - ed.y0);
    if (ed.touch) { if (dist > 8) { clearTimeout(ed.t); ed = null; } return; }
    if (dist < 5) return; edStart();
  }
  edUpdate(); edgeOn({ x: ev.clientX, y: ev.clientY }, edUpdate);
});
function edEnd(ev, cancel) {
  if (!ed || (ev && ev.pointerId !== ed.id)) return;
  const d = ed; ed = null; clearTimeout(d.t); if (!d.on) return;
  edgeOff(); clearRtags(); app.classList.remove('evdrag', 'evrz'); d.el.classList.remove('moving');
  if (cancel) { Object.assign(d.e, d.before); refreshAll(); return; }
  justDragged = Date.now(); S.last = d.e; const e = d.e;
  S.drop.clear(); refreshAll(); ripple(e.date);
  bubble(`${d.mode === 'mv' ? 'Moved' : 'Resized'} ${e.title}: ${dayLabel(e.date, NOW)} ${fmtRangeLong(e.start, e.end)}.`, { acts: [{ label: 'Undo', fn: () => restore(d.snap) }], ms: 4600 });
}
document.addEventListener('pointerup', ev => edEnd(ev, false));
document.addEventListener('pointercancel', ev => edEnd(ev, true));
stripsEl.addEventListener('touchmove', ev => { if (ed && ed.on) ev.preventDefault(); }, { passive: false });

/* =========================================================
   PRISM: every milestone, nearest first, with a countdown in months, weeks and days
   ========================================================= */
function renderPrism() {
  const box = $('#mList'); if (!box) return;
  box.innerHTML = '';
  const list = upcomingMilestones();
  if (!list.length) { const p = document.createElement('div'); p.className = 'mempty'; p.textContent = 'No milestones yet. Add one with the button below, or tell KOIOS: “Chem midterm Nov 20”.'; box.append(p); return; }
  list.forEach(e => {
    const row = document.createElement('div'), days = daysBetween(TODAY_S, e.date), col = colorOf(e);
    row.className = 'mrow' + (days <= 7 ? ' soon' : ''); if (col) row.style.setProperty('--ec', col);
    row.innerHTML = '<span class="dm"></span><span class="mt"><b></b><small></small></span><span class="cd"></span>';
    $('b', row).textContent = e.title;
    $('small', row).textContent = e.allDay ? dtRangeText(e) : dayLabel(e.date, NOW) + ' · ' + fmtRangeLong(e.start, e.end);
    $('.cd', row).textContent = countdown(e.date);
    row.addEventListener('click', () => {
      mPanel.classList.remove('on');
      if (S.zoom === 'month') { mMon = new Date(fromYmd(e.date).getFullYear(), fromYmd(e.date).getMonth(), 1); renderMonth(); }
      else scrollToDate(e.date, { ms: 380, min: e.allDay ? null : e.start });
      setTimeout(() => ripple(e.date), 400);
    });
    box.append(row);
  });
}
function openPrism() { closePops(); renderPrism(); mPanel.classList.add('on'); }
$('#tPrism').addEventListener('click', ev => { ev.stopPropagation(); if (mPanel.classList.contains('on')) mPanel.classList.remove('on'); else openPrism(); });
$('#mClose').addEventListener('click', () => mPanel.classList.remove('on'));
$('#mAdd').addEventListener('click', () => { mPanel.classList.remove('on'); newEventPop({ milestone: true }); });
$('#tPers').addEventListener('click', () => { mPanel.classList.remove('on'); aPanel.classList.remove('on'); });

/* =========================================================
   ACCOUNT: profile, calendar colour, KOIOS colour, and the usual settings
   ========================================================= */
const ACCENTS = [['blue', 'Blue (default)', '#2F6BFF'], ['indigo', 'Indigo', '#4C57E8'], ['violet', 'Violet', '#8E5CF0'], ['rose', 'Rose', '#E0507A'], ['coral', 'Coral', '#F2674A'], ['amber', 'Amber', '#E08A00'], ['emerald', 'Emerald', '#10A37F'], ['teal', 'Teal', '#14A3A8'], ['slate', 'Slate', '#4A5C8A']];
const BOTS = [['blue', 'Blue (default)', null], ['aqua', 'Aqua', '#1FB9E0'], ['violet', 'Violet', '#8E5CF0'], ['rose', 'Rose', '#E0507A'], ['coral', 'Coral', '#F2674A'], ['amber', 'Amber', '#F2A100'], ['mint', 'Mint', '#10A37F']];
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, sat = 0; if (mx !== mn) { const d = mx - mn; sat = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, sat, l];
}
const hsl = (h, sat, l) => `hsl(${((h % 360) + 360) % 360} ${Math.round(clamp(sat, 0, 1) * 100)}% ${Math.round(clamp(l, 0, 1) * 100)}%)`;
const rgbStr = hex => { const n = parseInt(hex.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
function hslHex(h, sat, l) { const a = sat * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * c).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
const ACCT = { name: '', mail: '', accent: 'blue', bot: 'blue', tz: 'auto', digest: false, conn: {} };
function applyAccent(key) {
  const R = document.documentElement.style, hit = ACCENTS.find(a => a[0] === key) || ACCENTS[0];
  const names = ['--blue', '--blue2', '--sky', '--ion', '--mist', '--pearl', '--pearl2', '--pearl3', '--ink', '--ink2', '--brgb', '--irgb', '--t-aqua', '--t-indigo', '--t-peri', '--t-ice', '--t-blue', '--t-ion'];
  if (hit[0] === 'blue') { names.forEach(n => R.removeProperty(n)); return; }
  const [h] = hexToHsl(hit[2]), ion = hslHex(h - 31, 1, .62);
  const set = { '--blue': hit[2], '--t-blue': hit[2], '--blue2': hsl(h, .72, .38), '--sky': hsl(h, 1, .78), '--t-ice': hsl(h, 1, .76), '--ion': ion, '--t-ion': ion, '--brgb': rgbStr(hit[2]), '--irgb': rgbStr(ion),
    '--t-aqua': hsl(h - 34, .78, .5), '--t-indigo': hsl(h + 22, .72, .58), '--t-peri': hsl(h + 10, .85, .72), '--mist': hsl(h, .5, .86), '--pearl': hsl(h, .45, .975), '--pearl2': hsl(h, .5, .945), '--pearl3': hsl(h, .52, .91), '--ink': hsl(h, .62, .17), '--ink2': hsl(h, .25, .4) };
  Object.entries(set).forEach(([k, v]) => R.setProperty(k, v));
}
function applyBot(key) { const hit = BOTS.find(b => b[0] === key) || BOTS[0]; if (fig && fig.setTint) fig.setTint(hit[2]); }
function saveAcct() { try { localStorage.setItem('koios.acct', JSON.stringify(ACCT)); } catch (e) { /* ignore */ } }
function loadAcct() { try { const o = JSON.parse(localStorage.getItem('koios.acct') || 'null'); if (o && typeof o === 'object') Object.assign(ACCT, o); } catch (e) { /* ignore */ } }
function syncAcctUI() {
  const nm = ACCT.name.trim(), init = (nm.charAt(0) || 'K').toUpperCase();
  $('#acctInit').textContent = init; $('#acctInit2').textContent = init;
  $('#acctName').textContent = nm || 'Your name'; $('#acctMail').textContent = ACCT.mail || 'Add your email below';
  $('#aName').value = ACCT.name; $('#aMail').value = ACCT.mail; $('#aTz').value = ACCT.tz; $('#aDigest').checked = !!ACCT.digest; $('#aRemind').checked = S.pref.remind;
  $$('#aTheme .sw').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === ACCT.accent)); $$('#aBot .sw').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === ACCT.bot));
  $$('.conn .pill[data-conn]').forEach(b => { const on = !!ACCT.conn[b.dataset.conn]; b.classList.toggle('on', on); b.textContent = on ? 'Connected' : 'Connect'; });
}
(function initAcct() {
  loadAcct();
  const mk = (box, list, attr, fn) => list.forEach(([k, label, hex]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.dataset.k = k; b.title = label; b.setAttribute('aria-label', label);
    b.style.setProperty('--c', hex || '#2F6BFF'); b.addEventListener('click', () => { ACCT[attr] = k; fn(k); saveAcct(); syncAcctUI(); }); box.append(b); });
  mk($('#aTheme'), ACCENTS, 'accent', applyAccent); mk($('#aBot'), BOTS, 'bot', applyBot);
  $('#aName').addEventListener('input', e => { ACCT.name = e.target.value; saveAcct(); syncAcctUI(); });
  $('#aMail').addEventListener('input', e => { ACCT.mail = e.target.value.trim(); saveAcct(); syncAcctUI(); });
  $('#aTz').addEventListener('change', e => { ACCT.tz = e.target.value; saveAcct(); bubble(ACCT.tz === 'auto' ? 'Time zone follows this device.' : 'Time zone set to ' + ACCT.tz.replace('_', ' ') + '.', { ms: 2800 }); });
  $('#aRemind').addEventListener('change', e => { S.pref.remind = e.target.checked; syncPrefUI(); });
  $('#aDigest').addEventListener('change', e => { ACCT.digest = e.target.checked; saveAcct(); });
  $$('.conn .pill[data-conn]').forEach(b => b.addEventListener('click', () => { ACCT.conn[b.dataset.conn] = !ACCT.conn[b.dataset.conn]; saveAcct(); syncAcctUI(); bubble(ACCT.conn[b.dataset.conn] ? 'Connected in this prototype. Real syncing arrives with the backend.' : 'Disconnected.', { ms: 3200 }); }));
  $('#aUpgrade').addEventListener('click', () => bubble('Plans are not part of this prototype yet. Everything is free here.', { ms: 3200 }));
  $('#aCopy').addEventListener('click', async () => {
    const txt = S.events.slice().sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).map(e => e.allDay ? `${e.date}${e.endDate !== e.date ? ' to ' + e.endDate : ''}  ${e.title} (day task)` : `${e.date}  ${fmtRange(e.start, e.end)}  ${e.title}`).join('\n') || 'No events yet.';
    try { await navigator.clipboard.writeText(txt); bubble('Copied your calendar as text.', { ms: 2600 }); } catch (e) { bubble('Your browser would not let me copy. Select the text from the calendar instead.', { ms: 3600 }); }
  });
  let wipeArmed = 0;
  $('#aWipe').addEventListener('click', () => {
    const b = $('#aWipe');
    if (!wipeArmed) { wipeArmed = 1; b.textContent = 'Tap again to confirm'; b.classList.add('on'); setTimeout(() => { wipeArmed = 0; b.textContent = 'Delete…'; b.classList.remove('on'); }, 4000); return; }
    wipeArmed = 0; b.textContent = 'Delete…'; b.classList.remove('on'); const snap = snapshot(); S.events = []; S.last = null; refreshAll(); aPanel.classList.remove('on');
    bubble('All events deleted.', { acts: [{ label: 'Undo', fn: () => restore(snap) }], ms: 7000 });
  });
  $('#aOut').addEventListener('click', () => { aPanel.classList.remove('on'); show('home'); });
  $('#aClose').addEventListener('click', () => aPanel.classList.remove('on'));
  $('#aPers').addEventListener('click', () => { aPanel.classList.remove('on'); $('#tPers').click(); });
  $('#tAcct').addEventListener('click', ev => { ev.stopPropagation(); if (aPanel.classList.contains('on')) aPanel.classList.remove('on'); else { closePops(); syncAcctUI(); aPanel.classList.add('on'); } });
  applyAccent(ACCT.accent); applyBot(ACCT.bot); syncAcctUI();
})();

/* ---------- boot ---------- */
window.__koios = { S, show, handle, setZoom, refreshAll, layoutHead, renderMonth, countdown, place, fig, parseCommand, stripEls, applyActions, applyHpx, tweenHpx, setTimeStep, getSample, cur: () => cur, weekTheme };
(function boot() {
  getSample().then(updateAiHint);
  const n = location.hash.slice(1);
  show(NAMES.includes(n) ? n : 'home');
})();
