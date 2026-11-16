/* ---------- Signature blue line: sweeps, then rings like a struck string ---------- */
class StringLine {
  constructor(canvas, opts = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.width = opts.width || 3;
    this.amp = opts.amp || 26;
    this.mode = 'idle';      // idle | sweep | ring
    this.visible = opts.startVisible !== false;
    this.p = this.visible ? 1 : 0;
    this.raf = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ro = new ResizeObserver(() => { this.resize(); this.draw(performance.now()); });
    this.ro.observe(canvas);
    this.resize();
    this.draw(performance.now());
  }
  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.c.clientWidth, h = this.c.clientHeight;
    this.W = w; this.H = h;
    this.c.width = Math.max(1, Math.round(w * dpr));
    this.c.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sweep(ms = 800) {
    this.mode = 'sweep'; this.t0 = performance.now(); this.sweepMs = this.reduced ? 1 : ms; this.p = 0; this.visible = true;
    this.kick();
  }
  pluck(x0 = 0.5, amp = this.amp) {
    if (this.reduced) { this.mode = 'idle'; this.p = 1; this.draw(performance.now()); return; }
    this.mode = 'ring'; this.t0 = performance.now(); this.pAmp = amp; this.x0 = x0; this.p = 1; this.visible = true;
    this.kick();
  }
  hide() { this.visible = false; this.p = 0; this.mode = 'idle'; this.draw(performance.now()); }
  show() { this.visible = true; this.p = 1; this.mode = 'idle'; this.draw(performance.now()); }
  kick() { if (!this.raf) this.raf = requestAnimationFrame(t => this.frame(t)); }
  frame(now) {
    this.raf = 0;
    this.draw(now);
    if (this.mode !== 'idle') this.raf = requestAnimationFrame(t => this.frame(t));
  }
  yAt(u, t) {
    // damped standing waves, plucked at x0 (like a violin string struck)
    const N = 8, f1 = 2.3, g1 = 2.9;
    let y = 0, norm = 0;
    for (let n = 1; n <= N; n++) {
      const a = Math.sin(n * Math.PI * this.x0) / (n * n);
      const decay = Math.exp(-g1 * (1 + 0.4 * (n - 1)) * t);
      y += a * Math.sin(n * Math.PI * u) * Math.cos(2 * Math.PI * f1 * n * t) * decay;
      norm += Math.abs(a) * Math.sin(n * Math.PI * this.x0);
    }
    return (y / (norm || 1)) * this.pAmp;
  }
  draw(now) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    if (!this.visible && this.mode === 'idle') return;
    const y0 = H / 2;
    let xEnd = W;
    if (this.mode === 'sweep') {
      const k = Math.max(0, Math.min(1, (now - this.t0) / this.sweepMs));
      xEnd = W * (1 - Math.pow(1 - k, 3));
      this.p = k;
      if (k >= 1) this.mode = 'idle';
    }
    let t = 0;
    if (this.mode === 'ring') {
      t = Math.max(0, (now - this.t0) / 1000);
      if (t > 2.4) { this.mode = 'idle'; t = 0; this.pAmp = 0; }
    }
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#8FB8FF'); g.addColorStop(0.5, '#2F6BFF'); g.addColorStop(1, '#3DD6FF');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = g; ctx.lineWidth = this.width;
    ctx.shadowColor = 'rgba(61,214,255,.55)'; ctx.shadowBlur = 10;
    ctx.beginPath();
    const step = 4;
    for (let x = 0; x <= xEnd + 0.1; x += step) {
      const xx = Math.min(x, xEnd);
      const y = (this.mode === 'ring') ? y0 + this.yAt(xx / W, t) : y0;
      if (x === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
}
