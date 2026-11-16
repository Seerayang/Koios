/* ---------- KOIOS character controller ---------- */
const KOIOS_SVG = document.getElementById('koios-svg-template').innerHTML;
let koiosUid = 0;

class KoiosFigure {
  constructor(host, opts = {}) {
    this.host = host;
    const uid = 'u' + (++koiosUid);
    host.innerHTML = KOIOS_SVG.replace(/__U__/g, uid);
    this.svg = host.querySelector('svg');
    this.hop = this.svg.querySelector('.k-hop');
    this.mood = 'neutral';
    this.busy = false;
    this.timers = new Set();
    if (opts.skin) this.setSkin(opts.skin);
    if (opts.mood) this.setMood(opts.mood);
    if (opts.blink !== false) this.startBlink();
    if (opts.follow !== false) this.startFollow();
  }
  setSkin(s) { if (s === 'blue') this.svg.removeAttribute('data-skin'); else this.svg.setAttribute('data-skin', s); }
  setMood(m) { this.mood = m; this.svg.setAttribute('data-mood', m); }
  setPose(p) { this.svg.setAttribute('data-pose', p); }
  later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
  wait(ms) { return new Promise(res => this.later(res, ms)); }

  startBlink() {
    const tick = () => {
      this.svg.classList.add('blink');
      this.later(() => this.svg.classList.remove('blink'), 150);
      this.later(tick, 3000 + Math.random() * 3000);
    };
    this.later(tick, 1500 + Math.random() * 2000);
  }
  startFollow() {
    this._mv = e => {
      if (this.mood === 'thinking' || this.mood === 'sleepy') return;
      const r = this.svg.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.28;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth * 0.45)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight * 0.45)));
      this.svg.style.setProperty('--lx', dx.toFixed(2));
      this.svg.style.setProperty('--ly', dy.toFixed(2));
    };
    addEventListener('pointermove', this._mv, { passive: true });
  }
  lookAt(dx, dy) { this.svg.style.setProperty('--lx', dx); this.svg.style.setProperty('--ly', dy); }
  lean(deg) { this.svg.style.setProperty('--lean', deg); }

  /* one-off actions. each resolves when finished */
  async play(name) {
    const s = this.svg;
    if (name === 'spin') { s.classList.add('spin'); await this.wait(1250); s.classList.remove('spin'); }
    else if (name === 'laptop') {
      const prev = this.mood; this.setMood('working'); this.setPose('laptop');
      await this.wait(6500);
      this.setPose('laptop-out'); await this.wait(500);
      this.setPose('rest'); this.setMood(prev);
    }
    else if (name === 'wave') {
      const prev = this.mood; this.setMood('happy'); this.setPose('wave');
      await this.wait(1900); this.setPose('rest'); this.setMood(prev);
    }
    else if (name === 'look') {
      this.lookAt(-1, 0.2); await this.wait(650);
      this.lookAt(1, -0.2); await this.wait(750);
      this.lookAt(0, 0);
    }
    else if (name === 'hop') {
      this.hop.classList.remove('hop'); void this.hop.getBoundingClientRect(); this.hop.classList.add('hop');
      await this.wait(560); this.hop.classList.remove('hop');
    }
  }
}

/* picks one idle action at a time, never while the user is busy */
class IdleDirector {
  constructor(fig, { isBusy = () => false, first = 7000, min = 15000, max = 40000 } = {}) {
    this.fig = fig; this.isBusy = isBusy; this.on = true; this.level = 'full';
    this.min = min; this.max = max; this.running = false;
    this.schedule(first);
    document.addEventListener('visibilitychange', () => {});
  }
  schedule(ms) {
    clearTimeout(this.t);
    this.t = setTimeout(() => this.step(), ms);
  }
  async step() {
    if (!this.on || this.level !== 'full' || document.hidden || this.isBusy() || this.fig.busy) {
      return this.schedule(2500);
    }
    const acts = this.fig.idleActs || ['spin', 'look', 'laptop', 'wave', 'spin', 'look'];
    const pick = acts[Math.floor(Math.random() * acts.length)];
    this.fig.busy = true;
    try { await this.fig.play(pick); } finally { this.fig.busy = false; }
    this.schedule(this.min + Math.random() * (this.max - this.min));
  }
  setLevel(l) { this.level = l; }
}
