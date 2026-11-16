/* =========================================================
   KOIOS in 3D. A small WebGL engine written for this page (no libraries).
   One shared GL canvas draws every figure and copies the frame into each figure's own canvas.
   Same public API as the old SVG figure: setSkin, setMood, setPose, play, lookAt, lean, wait, later, busy.
   ========================================================= */
const K3 = (() => {
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const damp = (c, t, k, dt) => c + (t - c) * (1 - Math.exp(-k * dt));
  const ease = k => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1);
  const sgp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  const outBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  /* ---------- math (column-major 4x4) ---------- */
  function mmul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  }
  function trs(p, r, s) {
    const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
    const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
    return new Float32Array([
      r00 * s[0], r10 * s[0], r20 * s[0], 0,
      r01 * s[1], r11 * s[1], r21 * s[1], 0,
      r02 * s[2], r12 * s[2], r22 * s[2], 0,
      p[0], p[1], p[2], 1]);
  }
  function persp(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  }
  function cofactor3(m) {   // normal matrix (cofactors of the upper 3x3), column-major for uniformMatrix3fv
    const a = (r, c) => m[c * 4 + r];
    const C = (r, c) => {
      const rs = [0, 1, 2].filter(i => i !== r), cs = [0, 1, 2].filter(i => i !== c);
      const det = a(rs[0], cs[0]) * a(rs[1], cs[1]) - a(rs[0], cs[1]) * a(rs[1], cs[0]);
      return ((r + c) % 2 ? -1 : 1) * det;
    };
    const o = new Float32Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[c * 3 + r] = C(r, c);
    return o;
  }

  /* ---------- scene nodes ---------- */
  class Node {
    constructor(parent, pos, sc) {
      this.pos = pos || [0, 0, 0]; this.rot = [0, 0, 0]; this.sc = sc || [1, 1, 1];
      this.world = new Float32Array(16); this.kids = []; this.parent = parent || null;
      if (parent) parent.kids.push(this);
    }
    update(pw) {
      const l = trs(this.pos, this.rot, this.sc);
      this.world = pw ? mmul(pw, l) : l;
      for (const k of this.kids) k.update(this.world);
    }
  }

  /* ---------- parametric geometry ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function grid(nu, nv, fn, opt = {}) {
    const pos = [], nor = [], uv = [], idx = [], e = 1e-3;
    const epsV = v => Math.min(Math.max(v, 0.004), 0.996);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, p = fn(u, v), vv = epsV(v);
        const du = sub(fn(u + e, vv), fn(u - e, vv)), dv = sub(fn(u, Math.min(vv + e, 1)), fn(u, Math.max(vv - e, 0)));
        let n = cross(du, dv); const l = Math.hypot(n[0], n[1], n[2]) || 1;
        pos.push(p[0], p[1], p[2]); nor.push(n[0] / l, n[1] / l, n[2] / l); uv.push(u, v);
      }
    }
    // orient normals outward
    let flip = 1;
    if (opt.out) {
      const i = opt.out[0] * (nu + 1) + opt.out[1], d = opt.out[2];   // [vertex row*? no: direct index], dir
      flip = (nor[i * 3] * d[0] + nor[i * 3 + 1] * d[1] + nor[i * 3 + 2] * d[2]) >= 0 ? 1 : -1;
    } else {
      const c = [0, 0, 0]; const cnt = pos.length / 3;
      for (let i = 0; i < pos.length; i += 3) { c[0] += pos[i]; c[1] += pos[i + 1]; c[2] += pos[i + 2]; }
      c[0] /= cnt; c[1] /= cnt; c[2] /= cnt;
      let s = 0; for (let i = 0; i < pos.length; i += 3) s += nor[i] * (pos[i] - c[0]) + nor[i + 1] * (pos[i + 1] - c[1]) + nor[i + 2] * (pos[i + 2] - c[2]);
      flip = s >= 0 ? 1 : -1;
    }
    if (flip < 0) for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      if (flip > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);   // counter-clockwise seen from outside
    }
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx: new Uint16Array(idx), n: idx.length };
  }
  const GEO = {
    ball: () => grid(36, 22, (u, v) => { const t = u * TAU, p = v * PI; return [Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t)]; }),
    sq: (e1, e2) => grid(40, 24, (u, v) => { const t = u * TAU + .0123, p = v * PI, s = Math.sin(p); return [sgp(s, e1) * sgp(Math.cos(t), e2), sgp(Math.cos(p), e1), sgp(s, e1) * sgp(Math.sin(t), e2)]; }),
    cap: () => grid(28, 30, (u, v) => { const t = u * TAU, y = Math.cos(v * PI), r = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y), 4)), .25); return [r * Math.cos(t), y, r * Math.sin(t)]; }),
    band: (y0, y1) => grid(28, 3, (u, v) => { const t = u * TAU, y = y0 + (y1 - y0) * v, r = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y), 4)), .25) * 1.05; return [r * Math.cos(t), y, r * Math.sin(t)]; }),
    shield2: () => grid(44, 30, (u, v) => { const t = u * TAU + .0123, p = v * PI, [w, n] = shieldW(p), e = 2 / n; return [w * sgp(Math.cos(t), e), Math.cos(p), w * sgp(Math.sin(t), e) * .66]; }),
    tube: (...a) => tube(...a),
    shield: () => grid(36, 26, (u, v) => { const t = u * TAU, p = v * PI, y = Math.cos(p), k = .42 + .58 * (y + 1) / 2, s = Math.pow(Math.sin(p), .85); return [k * s * Math.cos(t), y, k * s * Math.sin(t) * .8]; }),
    torus: (R, r) => grid(40, 12, (u, v) => { const t = u * TAU, q = v * TAU; return [(R + r * Math.cos(q)) * Math.cos(t), r * Math.sin(q), (R + r * Math.cos(q)) * Math.sin(t)]; }, { out: [0, 0, [1, 0, 0]] }),
    lens: () => grid(32, 8, (u, v) => {
      const t = u * TAU, c = Math.cos(t), s = Math.sin(t), w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(c), 2.6)), .7);
      const x = v * c, y = v * s * w, z = .5 * Math.sqrt(Math.max(0, 1 - v * v));
      return [x, y, z];
    }, { out: [0, 0, [0, 0, 1]] }),
    rect: () => grid(1, 1, (u, v) => [u * 2 - 1, 1 - v * 2, 0], { out: [0, 0, [0, 0, 1]] })
  };


  /* ---- the KOIOS parts ---- */
  const HEAD = { ax: .5, ay: .46, az: .42, e1: .62, e2: .74 };
  // height of the head surface (front, +z) at x,y: used to lay decals flush on it
  function headZ(x, y) {
    const { ax, ay, az, e1, e2 } = HEAD, X = Math.abs(x / ax), Y = Math.abs(y / ay);
    const inside = 1 - Math.pow(Y, 2 / e1); if (inside <= 0) return 0;
    const rad = Math.pow(inside, e1 / e2) - Math.pow(X, 2 / e2);
    return rad <= 0 ? 0 : az * Math.pow(rad, e2 / 2);
  }
  // the torso: a heater shield, flat shoulders, soft point at the bottom. Unit coordinates, scaled by the node.
  function shieldW(p) { const q = (1 - Math.cos(p)) / 2; return [Math.pow(Math.sin(p), .3 + .3 * q) * (1 - .55 * Math.pow(q, 1.2)), 2.6 - .7 * q]; }
  function shieldZ(x, y) {
    y = clamp(y, -.999, .999); const [w, n] = shieldW(Math.acos(y)), r = Math.abs(x) / w;
    return r >= 1 ? 0 : .66 * w * Math.pow(1 - Math.pow(r, n), 1 / n);
  }
  const chaikin = (pts, n) => { for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } pts = o; } return pts; };
  function boundary(pts) {
    const n = pts.length, len = [0]; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; len.push(len[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const tot = len[n];
    return u => { u = ((u % 1) + 1) % 1; const d = u * tot; let i = 0; while (i < n - 1 && len[i + 1] < d) i++; const a = pts[i], b = pts[(i + 1) % n], k = (d - len[i]) / ((len[i + 1] - len[i]) || 1); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  }
  // a flat patch of paint that follows a surface: polygon outline, height function, tiny offset
  function decal(poly, hf, delta, smooth = 3, cx = 0, cy = 0, nu = 80, nv = 5) {
    const bf = boundary(smooth ? chaikin(poly, smooth) : poly);
    return grid(nu, nv, (u, v) => { const b = bf(u), x = cx + (b[0] - cx) * v, y = cy + (b[1] - cy) * v; return [x, y, hf(x, y) + delta]; }, { out: [0, 0, [0, 0, 1]] });
  }
  // a soft tube along y with bend, taper and rounded ends (ears, arms), optionally only the slice s0..s1 (for stripes)
  function tube(L, wx, wz, bx, bz, o = {}) {
    const { sym = false, tp = 2.6, taper = 0, s0 = 0, s1 = 1, grow = 1 } = o;
    const prof = s => { const k = sym ? Math.abs(2 * s - 1) : s; return Math.pow(Math.max(0, 1 - Math.pow(k, tp)), 1 / tp) * (1 - taper * s); };
    return grid(28, 22, (u, v) => {
      const t = u * TAU, s = s0 + (s1 - s0) * v, r = prof(s) * grow;
      return [bx * s * s + wx * r * Math.cos(t), L * s, bz * s * s + wz * r * Math.sin(t)];
    });
  }

  const decalGeo = (geo, name, fn) => { GEO._c = GEO._c || {}; return GEO._c['d:' + name] || (GEO._c['d:' + name] = fn()); };

  /* ---------- shaders ---------- */
  const VS = `attribute vec3 a_pos;attribute vec3 a_nor;attribute vec2 a_uv;
uniform mat4 u_vp;uniform mat4 u_model;uniform mat3 u_nmat;uniform float u_out;
varying vec3 v_n;varying vec3 v_p;varying vec2 v_uv;
void main(){vec4 w=u_model*vec4(a_pos,1.);vec3 nn=normalize(u_nmat*a_nor);w.xyz+=nn*u_out;v_p=w.xyz;v_n=nn;v_uv=a_uv;gl_Position=u_vp*w;}`;
  const FS = `precision highp float;
uniform vec3 u_col;uniform vec3 u_emis;uniform vec3 u_cam;
uniform float u_spec;uniform float u_shine;uniform float u_rim;uniform float u_eye;uniform float u_glow;uniform float u_flat;uniform vec3 u_ink;
varying vec3 v_n;varying vec3 v_p;varying vec2 v_uv;
void main(){
  if(u_flat>.5){gl_FragColor=vec4(u_ink,1.);return;}
  vec3 N=normalize(v_n);vec3 V=normalize(u_cam-v_p);
  vec3 L1=normalize(vec3(-.55,.85,.75));vec3 L2=normalize(vec3(.9,.15,.45));vec3 L3=normalize(vec3(0.,-.6,.5));
  float d1=clamp((dot(N,L1)+.3)/1.3,0.,1.);float d2=max(dot(N,L2),0.);float d3=max(dot(N,L3),0.);
  vec3 amb=mix(vec3(.58,.66,.86),vec3(.90,.94,1.),N.y*.5+.5)*.56;
  vec3 light=amb+vec3(1.,.99,.96)*d1*.74+vec3(.55,.75,1.)*d2*.28+vec3(.5,.65,1.)*d3*.14;
  vec3 col=u_col*light;
  vec3 H=normalize(L1+V);
  float sp=pow(max(dot(N,H),0.),u_shine)*u_spec;
  vec3 H2=normalize(L2+V);sp+=pow(max(dot(N,H2),0.),u_shine*.6)*u_spec*.3;
  float fr=pow(1.-max(dot(N,V),0.),2.4);
  col+=vec3(sp);
  col=mix(col,vec3(.66,.82,1.),clamp(fr*u_rim,0.,1.));
  if(u_eye>.5){
    float r=clamp(v_uv.y,0.,1.);
    vec3 core=mix(u_emis,vec3(1.),.82);
    col=mix(core,u_emis*.92,smoothstep(.05,.92,r))*u_glow;
  }else col+=u_emis;
  gl_FragColor=vec4(col,1.);
}`;
  const SVS = `attribute vec2 a_q;uniform mat4 u_mvp;varying vec2 v_q;void main(){v_q=a_q;gl_Position=u_mvp*vec4(a_q,0.,1.);}`;
  const SFS = `precision mediump float;uniform vec3 u_col;uniform float u_a;uniform float u_pow;varying vec2 v_q;
void main(){float d=length(v_q);float a=pow(clamp(1.-d,0.,1.),u_pow)*u_a;gl_FragColor=vec4(u_col*a,a);}`;

  /* ---------- the shared renderer ---------- */
  const R = { ok: null, canvas: null, gl: null, bufs: new Map(), w: 0, h: 0 };
  function initGL() {
    if (R.ok !== null) return R.ok;
    try {
      R.canvas = document.createElement('canvas'); R.canvas.width = 400; R.canvas.height = 440;
      const gl = R.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true });
      if (!gl) throw new Error('no webgl');
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, v)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
      const uni = (p, names) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(p, n)]));
      R.gl = gl;
      R.pm = prog(VS, FS); R.um = uni(R.pm, ['u_vp', 'u_model', 'u_nmat', 'u_col', 'u_emis', 'u_cam', 'u_spec', 'u_shine', 'u_rim', 'u_eye', 'u_glow', 'u_out', 'u_flat', 'u_ink']);
      R.ps = prog(SVS, SFS); R.us = uni(R.ps, ['u_mvp', 'u_col', 'u_a', 'u_pow']);
      R.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, R.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      R.ok = true;
    } catch (err) { console.warn('KOIOS 3D unavailable, using the flat figure.', err); R.ok = false; }
    return R.ok;
  }
  function upload(geo) {
    let b = R.bufs.get(geo); if (b) return b;
    const gl = R.gl, mkb = (data, type = gl.ARRAY_BUFFER) => { const x = gl.createBuffer(); gl.bindBuffer(type, x); gl.bufferData(type, data, gl.STATIC_DRAW); return x; };
    b = { pos: mkb(geo.pos), nor: mkb(geo.nor), uv: mkb(geo.uv), idx: mkb(geo.idx, gl.ELEMENT_ARRAY_BUFFER), n: geo.n };
    R.bufs.set(geo, b); return b;
  }
  const shown = n => { while (n) { if (!n.on) return false; n = n.parent; } return true; };
  const CAM_Z = 4.75, CAM_Y = 0.06;
  function resize(w, h) { if (R.w !== w || R.h !== h) { R.canvas.width = w; R.canvas.height = h; R.w = w; R.h = h; } }
  function render(fig) {
    const gl = R.gl; resize(fig.W, fig.H);
    gl.viewport(0, 0, fig.W, fig.H);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = persp(28 * PI / 180, fig.W / fig.H, .5, 20), view = trs([0, -CAM_Y, -CAM_Z], [0, 0, 0], [1, 1, 1]), vp = mmul(proj, view);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // ground shadow
    gl.disable(gl.DEPTH_TEST); gl.useProgram(R.ps);
    const sprite = (x, y, sx, sy, col, a, pw) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, R.quad);
      const loc = gl.getAttribLocation(R.ps, 'a_q'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(R.us.u_mvp, false, mmul(vp, trs([x, y, 0.2], [0, 0, 0], [sx, sy, 1])));
      gl.uniform3fv(R.us.u_col, col); gl.uniform1f(R.us.u_a, a); gl.uniform1f(R.us.u_pow, pw);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const sh = fig.shadow;
    sprite(0, -1.0, 0.56 * sh.s, 0.09 * sh.s, [.04, .12, .42], .30 * sh.a, 1.6);
    // meshes: ink outline first (inverted hull), then the shaded fill
    gl.enable(gl.DEPTH_TEST); gl.useProgram(R.pm);
    const U = R.um, aPos = gl.getAttribLocation(R.pm, 'a_pos'), aNor = gl.getAttribLocation(R.pm, 'a_nor'), aUv = gl.getAttribLocation(R.pm, 'a_uv');
    gl.uniform3f(U.u_cam, 0, CAM_Y, CAM_Z); gl.uniformMatrix4fv(U.u_vp, false, vp);
    gl.uniform3f(U.u_ink, .05, .09, .24);
    const bind = (m, w) => {
      const b = upload(m.geo);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.uv); gl.enableVertexAttribArray(aUv); gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.uniformMatrix4fv(U.u_model, false, w); gl.uniformMatrix3fv(U.u_nmat, false, cofactor3(w));
      return b;
    };
    const ink = .0125 * clamp(400 / fig.W, 1, 2.4);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.uniform1f(U.u_flat, 1);
    for (const m of fig.meshes) {
      if (!m.vis || !shown(m.node) || !m.ol) continue;
      const b = bind(m, m.node.world); gl.uniform1f(U.u_out, ink * (m.ol === true ? 1 : m.ol));
      gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.CULL_FACE); gl.uniform1f(U.u_flat, 0); gl.uniform1f(U.u_out, 0);
    for (const m of fig.meshes) {
      if (!m.vis || !shown(m.node)) continue;
      const b = bind(m, m.node.world);
      if (m.dec) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2); } else gl.disable(gl.POLYGON_OFFSET_FILL);
      const c = m.col(), em = m.emis ? m.emis() : [0, 0, 0];
      gl.uniform3fv(U.u_col, c); gl.uniform3fv(U.u_emis, em);
      gl.uniform1f(U.u_spec, m.spec); gl.uniform1f(U.u_shine, m.shine); gl.uniform1f(U.u_rim, m.rim);
      gl.uniform1f(U.u_eye, m.eye ? 1 : 0); gl.uniform1f(U.u_glow, m.glow ? m.glow() : 1);
      gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // soft eye glow (only while the visor faces the viewer)
    gl.disable(gl.DEPTH_TEST); gl.useProgram(R.ps);
    const face = fig.facing;
    if (face > 0.05) for (const e of fig.eyeNodes) {
      const w = e.world, ec = fig.skinNow.eye;
      sprite(w[12], w[13], 0.27 * fig.glowK, 0.21 * fig.glowK, ec, 0.40 * face * fig.glowK, 1.8);
    }
  }

  /* ---------- skins ---------- */
  const SKINS = {
    blue: { body: [.17, .41, 1], stripe: [.17, .40, .98], eye: [.24, .86, 1], chev: [.90, .95, 1] },
    ice: { body: [.54, .72, 1], stripe: [.44, .63, 1], eye: [.30, .88, 1], chev: [.96,.98,1] },
    aqua: { body: [.10, .72, .90], stripe: [.10, .66, .86], eye: [.45, .95, 1], chev: [.92,.99,1] },
    peri: { body: [.50, .56, .96], stripe: [.45, .52, .94], eye: [.30, .86, 1], chev: [.94,.95,1] },
    indigo: { body: [.30, .34, .91], stripe: [.28, .32, .88], eye: [.30, .86, 1], chev: [.92,.94,1] },
    pearl: { body: [.93, .95, .99], stripe: [.60, .72, .95], eye: [.24, .86, 1], chev: [.35,.58,.96] }
  };
  const MOODS = {
    neutral: { esx: 1, esy: 1, slant: .05, lift: 0, ear: .10, roll: 0, glow: 1, bx: 0, by: 0 },
    happy: { esx: 1.04, esy: .6, slant: .2, lift: .012, ear: .12, roll: .05, glow: 1.18, bx: 0, by: .05 },
    thinking: { esx: .96, esy: .85, slant: .02, lift: .01, ear: .04, roll: .14, glow: .92, bx: -.45, by: .55 },
    alert: { esx: .96, esy: 1.3, slant: 0, lift: .014, ear: -.14, roll: 0, glow: 1.4, bx: 0, by: 0 },
    working: { esx: 1, esy: .75, slant: -.08, lift: -.004, ear: .06, roll: 0, glow: 1.12, bx: 0, by: -.35 },
    surprised: { esx: 1.06, esy: 1.4, slant: 0, lift: .02, ear: -.16, roll: 0, glow: 1.45, bx: 0, by: 0 },
    sleepy: { esx: 1, esy: .16, slant: -.3, lift: -.02, ear: .22, roll: .1, glow: .5, bx: 0, by: -.2 }
  };
  const MOOD_K = Object.keys(MOODS.neutral);

  /* ---------- clips: each gets progress k (0..1) and writes offsets into fx ---------- */
  const CLIPS = {
    spin: { dur: 1.25, fn: (k, f) => { const a = ease(k) * TAU; f.B = a; f.H = a; f.y = Math.sin(k * PI) * .16; f.ear = Math.sin(k * PI) * .5; f.hands = Math.sin(k * PI) * .6; } },
    twirl: { dur: 2.3, fn: (k, f) => { const a = ease(k) * TAU * 2; f.B = a; f.H = a; f.y = Math.sin(k * PI) * .3; f.ear = Math.sin(k * PI) * .75; f.hands = Math.sin(k * PI); f.rz = Math.sin(k * TAU * 2) * .07; } },
    turn: {
      dur: 4.8, fn: (k, f) => {
        const t1 = ease(seg(k, 0, .2)), t2 = ease(seg(k, .34, .54)), t3 = ease(seg(k, .8, 1));
        f.B = PI * t1 + PI * t3; f.H = PI * t1 + PI * t2;                 // turn away, look back over the shoulder, then turn round
        f.y = Math.sin(seg(k, 0, .2) * PI) * .05 + Math.sin(seg(k, .8, 1) * PI) * .05;
        f.ear = Math.sin(seg(k, .34, .54) * PI) * .4; f.wave = ease(seg(k, .56, .62)) * (1 - ease(seg(k, .74, .8)));
        f.hr = Math.sin(seg(k, .34, .54) * PI) * .12;
      }
    },
    flip: { dur: 1.5, fn: (k, f) => { f.rx = ease(seg(k, .12, .88)) * TAU; f.y = Math.sin(seg(k, .1, .9) * PI) * .34; const q = 1 - Math.abs(k - .5) * 2; f.sq = k < .12 ? k / .12 * .08 : (k > .9 ? (1 - k) / .1 * .06 : 0); f.hands = Math.sin(k * PI); } },
    nod: { dur: 1.2, fn: (k, f) => { f.hp = Math.sin(k * TAU * 2) * .26 * (1 - k * .4); f.ear = .12 * Math.sin(k * PI); } },
    shake: { dur: 1.1, fn: (k, f) => { f.Hrel = Math.sin(k * TAU * 3) * .42 * (1 - k * .5); } },
    hop: { dur: .6, fn: (k, f) => { f.y = Math.sin(k * PI) * .24; f.sq = k < .18 ? -Math.sin(k / .18 * PI / 2) * .06 : (k > .84 ? Math.sin((k - .84) / .16 * PI) * .05 : 0); f.ear = Math.sin(k * PI) * .3; } },
    dance: { dur: 2.6, fn: (k, f) => { const w = Math.sin(k * TAU * 3); f.B = w * .55; f.H = w * .4; f.rz = w * .13; f.y = Math.abs(w) * .1; f.ear = .25 + w * .15; f.hl = Math.max(0, w); f.hrr = Math.max(0, -w); } },
    bow: { dur: 1.6, fn: (k, f) => { const b = Math.sin(seg(k, 0, 1) * PI); f.rx = b * .55; f.hp = b * .25; f.y = -b * .05; } }
  };

  /* ---------- the figure ---------- */
  class Koios3D {
    static supported() { return initGL(); }
    constructor(host, opts = {}) {
      this.host = host; this.W = opts.w || 400; this.H = Math.round(this.W * 1.1);
      this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H; this.canvas.className = 'koios3d';
      this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', 'KOIOS, a floating pearl and blue robot with a dark visor, glowing eyes, tall ears and a small body');
      host.innerHTML = ''; host.append(this.canvas); this.ctx = this.canvas.getContext('2d');
      this.svg = this.canvas;                       // old name some pages still read
      this.mood = 'neutral'; this.pose = 'rest'; this.busy = false; this.timers = new Set();
      this.st = Object.fromEntries(MOOD_K.map(k => [k, MOODS.neutral[k]]));
      this.look = [0, 0]; this.lookS = [0, 0]; this.leanT = 0; this.leanS = 0; this.lap = 0; this.waveA = 0; this.handsK = 0;
      this.t = Math.random() * 10; this.clip = null; this.blink = 0; this.nextBlink = 1.5 + Math.random() * 2;
      this.orb = [0, 0]; this.motion = 1; this.glowK = 1; this.facing = 1; this.shadow = { s: 1, a: 1 };
      this.skin = SKINS.blue; this.skinNow = { body: [...SKINS.blue.body], stripe: [...SKINS.blue.stripe], eye: [...SKINS.blue.eye], chev: [...SKINS.blue.chev] };
      this.static = !!opts.static; this.fps = opts.fps || 0; this._acc = 0; this.dirty = true;
      this.build();
      if (opts.skin) this.setSkin(opts.skin);
      if (opts.mood) this.setMood(opts.mood);
      if (opts.follow !== false) this.startFollow();
      this.tick(0.016, true);
      Koios3D.live.add(this); Koios3D.run();
    }

    build() {
      const geo = (name, ...a) => { const key = JSON.stringify([name, ...a]); GEO._c = GEO._c || {}; return GEO._c[key] || (GEO._c[key] = GEO[name](...a)); };
      this.meshes = [];
      const mesh = (parent, geoObj, o) => {
        const node = new Node(parent, o.pos, o.sc); node.on = true; if (o.rot) node.rot = o.rot;
        const m = Object.assign({ geo: geoObj, node, vis: true, spec: .3, shine: 30, rim: 0 }, o.m || {});
        if (!m.col) m.col = () => [1, 1, 1];
        this.meshes.push(m); return { node, m };
      };
      const PEARL = () => [.95, .965, .99], GLASS = () => [.055, .075, .15], HAND = () => [.09, .12, .25];
      const STRIPE = () => this.skinNow.stripe, BODY = () => this.skinNow.body;
      const { ax, ay, az } = HEAD;
      const root = this.root = new Node(null); root.on = true;
      this.torso = new Node(root, [0, 0, 0]); this.torso.on = true;
      this.head = new Node(root, [0, .35, 0]); this.head.on = true;

      /* ---- head: a soft rounded helmet; the visor and the eyes are paint on its surface, so the face does not stick out ---- */
      mesh(this.head, geo('sq', HEAD.e1, HEAD.e2), { pos: [0, 0, 0], sc: [ax, ay, az], m: { col: PEARL, spec: .8, shine: 70, rim: .4, ol: true } });
      const visor = [[-.43, .02], [-.30, .075], [0, .09], [.30, .075], [.43, .02], [.43, -.12], [.34, -.29], [.13, -.395], [0, -.42], [-.13, -.395], [-.34, -.29], [-.43, -.12]];
      mesh(this.head, decalGeo(geo, 'visor', () => decal(visor, headZ, .004, 3, 0, -.17)), { pos: [0, 0, 0], m: { col: GLASS, spec: 1.3, shine: 150, rim: .06, dec: true } });
      // forehead: three blue dashes on an arc, like the reference
      [[28, 62], [76, 104], [118, 152]].forEach(([a0, a1]) => {
        const R0 = .19, R1 = .225, cx = 0, cy = .1, pts = [];
        for (let k = 0; k <= 6; k++) { const a = (a0 + (a1 - a0) * k / 6) * PI / 180; pts.push([cx + R1 * Math.cos(a), cy + R1 * Math.sin(a) * 1.15]); }
        for (let k = 6; k >= 0; k--) { const a = (a0 + (a1 - a0) * k / 6) * PI / 180; pts.push([cx + R0 * Math.cos(a), cy + R0 * Math.sin(a) * 1.15]); }
        mesh(this.head, decalGeo(geo, 'dash' + a0, () => { const mx = pts.reduce((a, q) => a + q[0], 0) / pts.length, my = pts.reduce((a, q) => a + q[1], 0) / pts.length; return decal(pts, headZ, .004, 1, mx, my, 24, 2); }), { pos: [0, 0, 0], m: { col: STRIPE, spec: .6, shine: 60, rim: .1, dec: true } });
      });
      // eyes: a rounded almond, perfectly symmetrical
      const almond = [], EW = .118, EH = .074;
      for (let k = 0; k < 30; k++) { const t = k / 30 * TAU, c = Math.cos(t), sn = Math.sin(t); almond.push([EW * c, EH * sn * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(c), 2.3)), .55)]); }
      this.eyeNodes = [];
      this.eyes = [-1, 1].map(side => {
        const ex = side * .185, ey = -.145, ez = headZ(ex, ey);
        const pivot = new Node(this.head, [ex, ey, ez]); pivot.on = true;
        const eg = decalGeo(geo, 'eye' + side, () => decal(almond, (x, y) => headZ(ex + x, ey + y) - ez, .006, 0, 0, 0, 48, 5));
        const e = mesh(pivot, eg, { pos: [0, 0, 0], m: { eye: true, col: () => [1, 1, 1], emis: () => this.skinNow.eye, glow: () => this.glowNow || 1, spec: 0, shine: 1, dec: true } });
        this.eyeNodes.push(e.node); return { pivot, side, ex, ey };
      });
      // ear discs on the sides of the head
      [-1, 1].forEach(side => {
        mesh(this.head, geo('ball'), { pos: [side * .478, .06, -.04], sc: [.05, .135, .135], m: { col: PEARL, spec: .8, shine: 60, rim: .3, ol: .8 } });
        mesh(this.head, geo('torus', 1, .14), { pos: [side * .515, .06, -.04], rot: [0, 0, PI / 2], sc: [.085, .05, .085], m: { col: STRIPE, spec: .6, shine: 50, rim: .2 } });
      });
      // ears: slim blades that start at either side of the head (from the ear disc) and sweep up and out, with two blue bands
      this.ears = [-1, 1].map(side => {
        const piv = new Node(this.head, [side * .415, .115, -.035]); piv.on = true;
        const L = .34, wx = .066, wz = .042, bx = side * .075, bz = -.045;
        mesh(piv, geo('tube', L, wx, wz, bx, bz, { tp: 2.4, taper: .1 }), { pos: [0, 0, 0], m: { col: PEARL, spec: .85, shine: 60, rim: .4, ol: true } });
        [[.34, .47], [.62, .75]].forEach(([s0, s1]) => mesh(piv, geo('tube', L, wx, wz, bx, bz, { tp: 2.4, taper: .1, s0, s1, grow: 1.04 }), { pos: [0, 0, 0], m: { col: STRIPE, spec: .6, shine: 50, rim: .3 } }));
        return { piv, side };
      });
      // seam on the back of the head (so the turn-around has something to see)
      mesh(this.head, geo('ball'), { pos: [0, .0, -.405], sc: [.014, .24, .028], m: { col: GLASS, spec: .6, shine: 50 } });
      mesh(this.head, geo('ball'), { pos: [0, .26, -.37], sc: [.11, .02, .03], m: { col: STRIPE, spec: .6, shine: 50 } });

      /* ---- body: a heater shield with an arrow, close under the head ---- */
      const TW = .3, TH = .37, TY = -.545;
      mesh(this.torso, geo('shield2'), { pos: [0, TY, 0], sc: [TW, TH, TW], m: { col: PEARL, spec: .85, shine: 70, rim: .4, ol: true } });
      const arrow = [[0, .36], [.5, -.56], [0, -.2], [-.5, -.56]];
      mesh(this.torso, decalGeo(geo, 'arrow', () => decal(arrow, shieldZ, .012, 2, 0, .0)), { pos: [0, TY, 0], sc: [TW, TH, TW], m: { col: STRIPE, spec: .7, shine: 60, rim: .2, dec: true } });
      // blue banding across the chest, like the ears and arms
      const shW = y => shieldW(Math.acos(clamp(y, -.999, .999)))[0];
      [[.64, .78], [.47, .55]].forEach(([y0, y1], bi) => {
        const pts = [], N = 8;
        for (let i = 0; i <= N; i++) { const y = y0 + (y1 - y0) * i / N; pts.push([shW(y) * .9, y]); }
        for (let i = N; i >= 0; i--) { const y = y0 + (y1 - y0) * i / N; pts.push([-shW(y) * .9, y]); }
        mesh(this.torso, decalGeo(geo, 'tband' + bi, () => decal(pts, shieldZ, .009, 0, 0, (y0 + y1) / 2, 60, 3)), { pos: [0, TY, 0], sc: [TW, TH, TW], m: { col: STRIPE, spec: .6, shine: 50, rim: .2, dec: true } });
      });
      mesh(this.torso, geo('ball'), { pos: [0, TY + .06, -.158], sc: [.05, .14, .02], m: { col: PEARL, spec: .7, shine: 50, rim: .3 } });   // back plate

      /* ---- arms: short pearl plates close to the body, dark hands; each hangs from a shoulder pivot ---- */
      this.hands = [-1, 1].map(side => {
        const sh = new Node(this.torso, [side * .322, -.25, .0]); sh.on = true;
        mesh(sh, geo('tube', -.27, .06, .05, 0, 0, { sym: true, tp: 2.4, taper: .12 }), { pos: [0, -.0, 0], m: { col: PEARL, spec: .85, shine: 60, rim: .4, ol: true } });
        mesh(sh, geo('tube', -.27, .06, .05, 0, 0, { sym: true, tp: 2.4, taper: .12, s0: .3, s1: .44, grow: 1.04 }), { pos: [0, 0, 0], m: { col: STRIPE, spec: .6, shine: 50, rim: .3 } });
        mesh(sh, geo('tube', -.27, .06, .05, 0, 0, { sym: true, tp: 2.4, taper: .12, s0: .74, s1: .86, grow: 1.04 }), { pos: [0, 0, 0], m: { col: STRIPE, spec: .6, shine: 50, rim: .3 } });
        return { n: sh, side };
      });

      // laptop
      this.laptop = new Node(this.torso, [0, -.5, .4]); this.laptop.on = false;
      mesh(this.laptop, geo('sq', .3, .3), { pos: [0, 0, 0], sc: [.23, .016, .15], m: { col: PEARL, spec: .8, shine: 60, rim: .3, ol: true } });
      const hinge = this.screenN = new Node(this.laptop, [0, .008, -.15]); hinge.on = true; hinge.rot = [-.28, 0, 0];
      mesh(hinge, geo('sq', .3, .3), { pos: [0, .14, 0], sc: [.23, .15, .014], m: { col: PEARL, spec: .8, shine: 60, rim: .3, ol: true } });
      mesh(hinge, geo('rect'), { pos: [0, .14, .0165], sc: [.2, .125, 1], m: { col: () => [.08, .16, .42], emis: () => [.05, .18, .45], spec: .2, shine: 20 } });
      this.bars = [0, 1, 2, 3].map(i => {
        const n = new Node(hinge, [-.14, .2 - i * .052, .0185], [.05, .008, 1]); n.on = true;
        mesh(n, geo('rect'), { pos: [1, 0, 0], sc: [1, 1, 1], m: { col: () => [.5, .85, 1], emis: () => [.35, .75, 1], spec: 0, shine: 1 } });
        return n;
      });
    }

    /* ----- API ----- */
    setSkin(s) { this.skin = SKINS[s] || SKINS.blue; this.dirty = true; }
    setTint(hex) {
      if (!hex) { this.skin = SKINS.blue; this.dirty = true; return; }
      const n = parseInt(hex.slice(1), 16), c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
      const eye = c.map(v => Math.min(1, v * .55 + .5));
      this.skin = { body: SKINS.blue.body, stripe: c, eye, chev: SKINS.blue.chev }; this.dirty = true;
    }
    setMood(m) { if (MOODS[m]) { this.mood = m; this.dirty = true; } }
    setPose(p) { this.pose = p; this.dirty = true; }
    setMotion(k) { this.motion = k; }
    setOrbit(y, p) { this.orb[0] = y; this.orb[1] = clamp(p, -.6, .6); }
    later(fn, ms) { const t = setTimeout(() => { this.timers.delete(t); fn(); }, ms); this.timers.add(t); return t; }
    wait(ms) { return new Promise(res => this.later(res, ms)); }
    lookAt(dx, dy) { this.look = [clamp(dx, -1, 1), clamp(dy, -1, 1)]; this.dirty = true; }
    lean(deg) { this.leanT = deg; }
    startFollow() {
      this._mv = e => {
        if (this.mood === 'thinking' || this.mood === 'sleepy' || this.clip) return;
        const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.3;
        this.look = [clamp((e.clientX - cx) / (innerWidth * .45), -1, 1), clamp((e.clientY - cy) / (innerHeight * .45), -1, 1)];
      };
      addEventListener('pointermove', this._mv, { passive: true });
    }
    clipPlay(name) {
      const c = CLIPS[name];
      return new Promise(res => {
        if (this.motion === 0) { this.later(res, 60); return; }
        if (this.clip) this.clip.res();
        this.clip = { c, t0: this.t, res: () => { this.clip = null; res(); } };
      });
    }
    async play(name) {
      if (CLIPS[name]) return this.clipPlay(name);
      if (name === 'laptop') { const prev = this.mood; this.setMood('working'); this.setPose('laptop'); await this.wait(6500); this.setPose('laptop-out'); await this.wait(550); this.setPose('rest'); this.setMood(prev); }
      else if (name === 'wave') { const prev = this.mood; this.setMood('happy'); this.setPose('wave'); await this.wait(1900); this.setPose('rest'); this.setMood(prev); }
      else if (name === 'look') { this.lookAt(-1, .2); await this.wait(650); this.lookAt(1, -.2); await this.wait(750); this.lookAt(0, 0); }
    }
    stop() { Koios3D.live.delete(this); }

    /* ----- per frame ----- */
    tick(dt, force) {
      if (!force) {
        if (!this.host.isConnected || !this.host.offsetParent && getComputedStyle(this.host).position !== 'fixed') return;
        if (this.static && !this.dirty && !this.clip) return;
        if (this.fps) { this._acc += dt; if (this._acc < 1 / this.fps) return; dt = this._acc; this._acc = 0; }
      }
      this.update(dt); this.draw(); this.dirty = false;
    }
    update(dt) {
      this.t += dt; const t = this.t, mo = this.motion, s = this.st, tgt = MOODS[this.mood];
      for (const k of MOOD_K) s[k] = damp(s[k], tgt[k], 9, dt);
      // look (pointer + mood bias)
      const lx = clamp(this.look[0] + tgt.bx, -1, 1), ly = clamp(this.look[1] + tgt.by, -1, 1);
      this.lookS[0] = damp(this.lookS[0], lx, 7, dt); this.lookS[1] = damp(this.lookS[1], ly, 7, dt);
      this.leanS = damp(this.leanS, this.leanT, 6, dt);
      // blink
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 3 + Math.random() * 3; }
      if (this.blink > 0) this.blink = Math.max(0, this.blink - dt / .16);
      const bl = 1 - Math.sin(this.blink * PI) * .92;
      // clip
      const fx = { B: 0, H: 0, Hrel: 0, hp: 0, hr: 0, rx: 0, rz: 0, y: 0, sq: 0, ear: 0, hands: 0, wave: 0, hl: 0, hrr: 0 };
      if (this.clip) {
        const k = (t - this.clip.t0) / this.clip.c.dur;
        if (k >= 1) this.clip.res(); else this.clip.c.fn(k, fx);
      }
      // pose amounts
      this.lap = damp(this.lap, this.pose === 'laptop' ? 1 : 0, 6, dt);
      const waveT = (this.pose === 'wave' ? 1 : 0) + fx.wave; this.waveA = damp(this.waveA, Math.min(1, waveT), 9, dt);
      // root
      const bob = Math.sin(t * 1.7) * .03 * mo, headBob = Math.sin(t * 1.7 + .9) * .014 * mo;
      this.root.pos[1] = bob + fx.y;
      this.root.rot = [fx.rx + this.orb[1], this.orb[0], -this.leanS * .02 + fx.rz];
      this.root.sc = [1 + fx.sq, 1 - fx.sq, 1 + fx.sq];
      // yaw: pointer look turns the head more than the body
      const yawLook = this.lookS[0] * .52, pitchLook = this.lookS[1] * .3;
      this.torso.rot = [0, fx.B + yawLook * .3, Math.sin(t * 1.2) * .012 * mo];
      this.head.pos[1] = .35 + headBob;
      this.head.rot = [pitchLook + fx.hp, fx.H + yawLook + fx.Hrel, s.roll + fx.hr + Math.sin(t * 1.1) * .016 * mo];
      // eyes
      this.eyes.forEach(({ pivot, side, ex, ey }) => {
        const nx = ex + this.lookS[0] * .03, ny = ey + s.lift - this.lookS[1] * .02;
        pivot.pos[0] = nx; pivot.pos[1] = ny; pivot.pos[2] = headZ(nx, ny) - .0;
        pivot.rot = [0, 0, side * s.slant];
        pivot.sc = [s.esx, Math.max(.04, s.esy * bl), 1];
      });
      this.glowNow = s.glow; this.glowK = clamp(s.glow, .4, 1.4);
      // ears: soft, they lag and sway
      this.ears.forEach(({ piv, side }) => {
        const sway = Math.sin(t * 1.3 + (side > 0 ? 1.4 : 0)) * .05 * mo;
        piv.rot = [-.06 + Math.sin(t * .9 + side) * .03 * mo, 0, -side * (s.ear + .46 + fx.ear + sway)];
      });
      // arms: hang from the shoulders close to the body; raise, wave, reach for the laptop
      const wv = this.waveA, lp = this.lap, hk = fx.hands;
      this.hands.forEach(({ n, side }) => {
        let th = .05 + hk * .75 + Math.sin(t * 1.7 + (side > 0 ? 0 : 1)) * .018 * mo;     // swing out in the plane of the body
        if (side < 0) th += fx.hl * 1.9; else th += fx.hrr * 1.9;
        if (side > 0) th += wv * (2.45 + Math.sin(t * 9) * .22);
        let fw = 0;                                                                         // tilt forward
        th = th * (1 - lp) - .3 * lp; fw = -lp * 1.05 + Math.sin(t * 17 + side) * .05 * lp;
        n.rot = [fw, 0, side * th];
        n.pos = [side * (.322 - lp * .04), -.25 - lp * .02, lp * .17];
      });
      // laptop pops out
      const lk = clamp(this.lap, 0, 1);
      this.laptop.on = lk > .02; const ls = lk < .98 ? Math.max(.001, outBack(lk)) : 1;
      this.laptop.sc = [ls, ls, ls]; this.laptop.pos = [0, -.5 + (1 - lk) * .08, .42 - (1 - lk) * .12];
      this.bars.forEach((b, i) => { b.sc = [.05 + .06 * (.5 + .5 * Math.sin(t * 3 + i * 1.9)) + .02 * i * (i % 2), .008, 1]; });
      // shadow follows the hop
      const hy = this.root.pos[1];
      this.shadow.s = clamp(1 - hy * .9, .55, 1.15); this.shadow.a = clamp(1 - hy * 1.6, .25, 1);
      // skin blend
      for (const k of ['body', 'stripe', 'eye', 'chev']) for (let i = 0; i < 3; i++) this.skinNow[k][i] = damp(this.skinNow[k][i], this.skin[k][i], 10, dt);
      this.root.update(null);
      // does the visor face the viewer?
      const hw = this.head.world, fz = hw[10] / (Math.hypot(hw[8], hw[9], hw[10]) || 1);
      this.facing = clamp(fz * 1.4 - .1, 0, 1) * (Math.cos(this.root.rot[0]) > 0 ? 1 : 0.3);
    }
    draw() {
      if (!initGL()) return;
      render(this);
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.drawImage(R.canvas, 0, 0);
    }
  }
  Koios3D.live = new Set();
  Koios3D.idleActs = ['spin', 'look', 'laptop', 'wave', 'turn', 'twirl', 'dance', 'flip', 'nod', 'look', 'spin', 'laptop'];
  Koios3D.prototype.idleActs = Koios3D.idleActs;
  let raf = 0, last = 0;
  Koios3D.run = () => {
    if (raf) return;
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
      if (document.hidden) return;
      for (const f of Koios3D.live) f.tick(dt);
    };
    raf = requestAnimationFrame(frame);
  };
  return { Koios3D, SKINS };
})();
const Koios3D = K3.Koios3D;
