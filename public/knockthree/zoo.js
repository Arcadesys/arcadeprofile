// The Zoo — a walkable build of the sim from It Takes a Zoo.
// No build step. Rooms, paintings, and sound are procedural; the furniture and the people are
// Meshy-generated models in ./models, each with a procedural stand-in that shows if its file doesn't load.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const $ = id => document.getElementById(id);
const canvas = $('view');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ───────────────────────── renderer ─────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.Fog(0x05040a, 3, 22);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
camera.rotation.order = 'YXZ';
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// Pockets: the Zoo routes. Rooms that aren't physically adjacent live far apart.
const HX = 200, AZ = -200, SX = -200;       // house, apartment, studio
const pocketObjs = { T: [], A: [], S: [], H: [] };
const inPocket = (p, o) => { pocketObjs[p].push(o); return o; };

// ───────────────────────── builders ─────────────────────────
const solids = [];
function solid(x1, x2, z1, z2) {
  const s = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), on: true };
  solids.push(s); return s;
}
const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
let cap = null;
function add(mesh, x, y, z, parent) { mesh.position.set(x, y, z); (parent || scene).add(mesh); if (cap) cap.push(mesh); return mesh; }
// Run a block of procedural building and hand back everything it added, so a model can replace it.
function capture(fn) { const prev = cap; cap = []; fn(); const got = cap; cap = prev; return got; }
function box(w, h, d, color, x, y, z, o = {}) {
  const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || mat(color)), x, y, z, o.parent);
  if (o.solid) solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  return m;
}
function cyl(rt, rb, h, color, x, y, z, o = {}) {
  return add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 8), o.mat || mat(color)), x, y, z, o.parent);
}
function cone(r, h, color, x, y, z, o = {}) {
  return add(new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 5), o.mat || mat(color)), x, y, z, o.parent);
}
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// A flat picture. rotY: 0 faces +z, PI faces -z, PI/2 faces +x, -PI/2 faces -x.
function plane(w, h, texture, x, y, z, rotY = 0, o = {}) {
  const M = o.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new M({ map: texture, transparent: !!o.alpha, side: THREE.DoubleSide }));
  m.rotation.y = rotY; return add(m, x, y, z, o.parent);
}
function label(text, { w = 1, h = 0.3, bg = '#1a120c', fg = '#ffb056', font = 'bold 72px Georgia', px = 512 } = {}) {
  return tex(px, Math.round(px * h / w), (c, W, H) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lines = text.split('\n'); const lh = H / (lines.length + 0.4);
    lines.forEach((l, i) => c.fillText(l, W / 2, lh * (i + 0.7), W * 0.94));
  });
}
function room({ x1, x2, z1, z2, h, floor, wall, ceil, doors = [], skip = '' }) {
  const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, T = 0.2;
  box(w, 0.1, d, floor, cx, -0.05, cz);
  if (ceil != null) box(w, 0.1, d, ceil, cx, h + 0.05, cz);
  const sides = { n: [z1, 'x'], s: [z2, 'x'], w: [x1, 'z'], e: [x2, 'z'] };
  for (const s of 'nsew') {
    if (skip.includes(s)) continue;
    const [at, axis] = sides[s];
    const a = axis === 'x' ? x1 : z1, b = axis === 'x' ? x2 : z2;
    const gaps = doors.filter(dr => dr.side === s).map(dr => [dr.at - dr.w / 2, dr.at + dr.w / 2]).sort((p, q) => p[0] - q[0]);
    let cur = a; const segs = [];
    for (const g of gaps) { if (g[0] > cur) segs.push([cur, g[0]]); cur = g[1]; }
    if (cur < b) segs.push([cur, b]);
    for (const [p, q] of segs) {
      const len = q - p, mid = (p + q) / 2;
      if (axis === 'x') box(len, h, T, wall, mid, h / 2, at, { solid: true });
      else box(T, h, len, wall, at, h / 2, mid, { solid: true });
    }
    for (const g of gaps) {
      const len = g[1] - g[0], mid = (g[0] + g[1]) / 2, lh = h - 2.3;
      if (lh <= 0) continue;
      if (axis === 'x') box(len, lh, T, wall, mid, 2.3 + lh / 2, at);
      else box(T, lh, len, wall, at, 2.3 + lh / 2, mid);
    }
  }
}
function lamp(p, color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.userData.base = intensity; add(l, x, y, z); return inPocket(p, l);
}
// A shut door filling a gap. axis 'x' = door lies along x.
function doorPanel(x, z, axis, color, w = 1) {
  return axis === 'x' ? box(w, 2.3, 0.1, color, x, 1.15, z, { solid: true }) : box(0.1, 2.3, w, color, x, 1.15, z, { solid: true });
}

// ───────────────────────── models ─────────────────────────
const gltf = new GLTFLoader(), modelCache = {};
function loadModel(name) {
  return modelCache[name] ||= new Promise((res, rej) => gltf.load(`./models/${name}.glb`, g => {
    const root = g.scene;
    root.traverse(o => { if (o.isMesh) o.material = new THREE.MeshLambertMaterial({ map: o.material.map || null, color: o.material.map ? 0xffffff : o.material.color }); });
    root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root), c = b.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -b.min.y, -c.z);                        // feet on the floor, centred
    const wrap = new THREE.Group(); wrap.add(root); wrap.userData.size = b.getSize(new THREE.Vector3());
    res(wrap);
  }, undefined, rej));
}
// Put a model at x,y,z, scaled so it is o.h tall (or o.w wide, or o.d deep), or stretched to o.size [w,h,d]. o.replaces: stand-ins to hide once it loads.
function model(name, x, y, z, o = {}) {
  const holder = new THREE.Group(); holder.position.set(x, y, z); holder.rotation.y = o.rotY || 0; (o.parent || scene).add(holder);
  loadModel(name).then(src => {
    const m = src.clone(true), s = src.userData.size;
    const k = o.h ? o.h / s.y : o.w ? o.w / s.x : o.d ? o.d / s.z : 1;
    m.scale.setScalar(k);
    if (o.size) m.scale.set(o.size[0] / s.x, o.size[1] / s.y, o.size[2] / s.z);   // stretch to an exact box
    if (o.centre) m.position.y = -s.y * m.scale.y / 2;
    if (o.tint || o.glow) m.traverse(n => { if (n.isMesh) {
      n.material = o.glow ? new THREE.MeshBasicMaterial({ map: n.material.map }) : n.material.clone();
      if (o.tint) n.material.color.set(o.tint);
    } });
    holder.add(m); (o.replaces || []).forEach(f => { f.visible = false; });
    if (o.then) o.then(m, holder);
  }).catch(() => {});
  return holder;
}

// ───────────────────────── state, things, zones ─────────────────────────
const P = { x: 0, z: 9.4, yaw: 0, pitch: 0 };
const S = { started: false, knocks: 0, doorOpen: false, doorT: 0, barOpen: true, dim: 1, jazzOn: true,
  zone: null, pocket: 'T', vivTalk: 0, jackTalk: 0, cab: 0, voice: false, reveal: -1, dart: 0 };
const things = [];
function thing(x, y, z, name, prompt, act, o = {}) {
  const t = { x, y, z, name, prompt, act, r: o.r || 2.2, when: o.when || null }; things.push(t); return t;
}

// ───────────────────────── audio ─────────────────────────
const AU = { ctx: null, amb: {}, muted: false };
function panner(x, y, z) {
  const p = AU.ctx.createPanner();
  p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.rolloffFactor = 1.1;
  if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
  p.connect(AU.master); return p;
}
const out = pos => (pos ? panner(pos[0], pos[1], pos[2]) : AU.master);
function tone(f, dur, { type = 'sine', gain = 0.1, to = null, pos = null, at = 0, dest = null } = {}) {
  if (!AU.ctx) return;
  const c = AU.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || out(pos)); o.start(t); o.stop(t + dur + 0.05);
}
function hit(dur, freq, { gain = 0.3, type = 'lowpass', q = 1, pos = null, at = 0, dest = null } = {}) {
  if (!AU.ctx) return;
  const c = AU.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.noise; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(dest || out(pos)); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
const SFX = {
  knock: () => { hit(0.09, 320, { gain: 0.9, pos: [0, 1.5, 7] }); tone(120, 0.14, { to: 70, gain: 0.5, pos: [0, 1.5, 7] }); },
  tock: pos => { hit(0.03, 2400, { type: 'bandpass', q: 2, gain: 0.7, pos }); tone(250, 0.1, { to: 185, type: 'triangle', gain: 0.5, pos }); },
  creak: pos => { tone(72, 1.1, { to: 128, type: 'sawtooth', gain: 0.07, pos }); tone(430, 1.0, { to: 610, type: 'triangle', gain: 0.03, pos, at: 0.05 }); },
  ping: (pos, f) => tone(f, 0.5, { gain: 0.07, pos }),
  drip: pos => { tone(1250, 0.07, { to: 640, gain: 0.12, pos }); tone(990, 0.06, { to: 560, gain: 0.04, pos, at: 0.11 }); },
  step: soft => { hit(0.06, soft ? 900 : 420, { gain: soft ? 0.05 : 0.11 }); if (!soft && Math.random() < 0.3) tone(rnd(240, 330), 0.09, { to: 220, type: 'triangle', gain: 0.02 }); },
  click: pos => { hit(0.02, 3200, { type: 'highpass', gain: 0.5, pos }); tone(880, 0.12, { gain: 0.08, pos, at: 0.03 }); },
  coin: pos => { tone(1320, 0.08, { gain: 0.1, pos }); tone(1760, 0.3, { gain: 0.1, pos, at: 0.07 }); },
  shrink: () => tone(260, 0.9, { to: 2200, gain: 0.12 }),
  thunk: pos => hit(0.07, 700, { gain: 0.5, pos }),
  route: () => { tone(520, 0.25, { gain: 0.04 }); tone(780, 0.3, { gain: 0.04, at: 0.08 }); },
  locked: pos => { hit(0.04, 500, { gain: 0.4, pos }); hit(0.04, 500, { gain: 0.3, pos, at: 0.12 }); },
};
const CHORDS = [[50, 53, 57, 60, 64], [43, 53, 59, 64, 69], [48, 55, 59, 62, 64], [45, 55, 61, 65, 67]];
const BAR = 60 / 66 * 4;
let nextBar = 0, barI = 0, nextChirp = 0;
function jnote(m, t, dur, type, g) {
  const c = AU.ctx, o = c.createOscillator(), e = c.createGain();
  o.type = type; o.frequency.value = 440 * 2 ** ((m - 69) / 12);
  e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.025);
  e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(e).connect(AU.jazzIn); o.start(t); o.stop(t + dur + 0.05);
}
function schedule() {
  const c = AU.ctx; if (!c || c.state !== 'running') return;
  const now = c.currentTime;
  if (S.jazzOn && S.pocket === 'T') {
    if (nextBar < now) nextBar = now + 0.05;
    while (nextBar < now + 0.6) {
      const ch = CHORDS[barI % 4], t = nextBar, beat = BAR / 4;
      ch.forEach((n, i) => jnote(n, t + i * 0.03, BAR * 0.95, 'triangle', 0.04));
      jnote(ch[0] - 12, t, beat * 1.8, 'sine', 0.14); jnote(ch[0] - 5, t + beat * 2, beat * 1.8, 'sine', 0.1);
      for (let b = 0; b < 8; b++) if (Math.random() < 0.35) jnote(ch[1 + Math.floor(Math.random() * 4)] + 12, t + b * beat / 2 + (b % 2 ? beat * 0.09 : 0), beat * 0.9, 'sine', 0.055);
      for (let k = 0; k < 7; k++) hit(0.004, 5000, { type: 'highpass', gain: 0.06, at: nextBar - now + Math.random() * BAR, dest: AU.jazzIn });
      barI++; nextBar += BAR;
    }
  }
  if (S.pocket === 'H' && now > nextChirp) {
    for (let i = 0; i < 4; i++) tone(4300, 0.035, { gain: 0.025, at: i * 0.07, dest: AU.eve });
    nextChirp = now + rnd(0.9, 2.6);
  }
}
function initAudio() {
  const C = window.AudioContext || window.webkitAudioContext; if (!C || AU.ctx) return;
  const c = AU.ctx = new C();
  AU.master = c.createGain(); AU.master.gain.value = 0.9; AU.master.connect(c.destination);
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = buf;
  const loop = (name, type, freq, q) => {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
    s.connect(f).connect(g).connect(AU.master); s.start(); AU.amb[name] = g;
  };
  loop('tone', 'lowpass', 170, 0.5); loop('rain', 'bandpass', 2600, 0.4); loop('wind', 'lowpass', 420, 0.3);
  const hum = c.createGain(); hum.gain.value = 0; hum.connect(AU.master); AU.amb.hum = hum;
  [[55, 1], [110.4, 0.3], [165.2, 0.08]].forEach(([f, g]) => { const o = c.createOscillator(), e = c.createGain(); o.frequency.value = f; e.gain.value = g; o.connect(e).connect(hum); o.start(); });
  AU.jazzIn = c.createGain();
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170;
  AU.jazzLP = c.createBiquadFilter(); AU.jazzLP.type = 'lowpass'; AU.jazzLP.frequency.value = 400;
  AU.amb.jazz = c.createGain(); AU.amb.jazz.gain.value = 0;
  AU.jazzIn.connect(hp).connect(AU.jazzLP).connect(AU.amb.jazz).connect(panner(6.9, 1.2, 5.9));
  AU.eve = AU.amb.eve = c.createGain(); AU.eve.gain.value = 0; AU.eve.connect(AU.master);
  setInterval(schedule, 120);
}
function updateListener() {
  if (!AU.ctx) return;
  const L = AU.ctx.listener, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  if (L.positionX) {
    L.positionX.value = P.x; L.positionY.value = 1.6; L.positionZ.value = P.z;
    L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
  } else { L.setPosition(P.x, 1.6, P.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
}

// ───────────────────────── text ─────────────────────────
let sayTimer = 0;
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.02; speechSynthesis.speak(u);
}
function say(text, force) {
  $('say').textContent = text; clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { $('say').textContent = ''; }, 5000 + text.length * 55);
  if (S.voice || force) speak(text);
}
function caption(z) {
  $('capTitle').textContent = z.title; $('capText').textContent = z.text;
  if (S.voice) speak(z.title + '. ' + z.text);
}

// ───────────────────────── painted things ─────────────────────────
const ART = {
  shark: tex(512, 640, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#061433'); g.addColorStop(1, '#01040d'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#7b2cff'; c.beginPath(); c.ellipse(W / 2, H * 0.6, 190, 250, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(W / 2 - 60, H * 0.28); c.lineTo(W / 2 + 10, 30); c.lineTo(W / 2 + 90, H * 0.3); c.fill();
    c.fillStyle = '#c9b6ff'; c.beginPath(); c.ellipse(W / 2, H * 0.74, 120, 150, 0, 0, 7); c.fill();
    c.lineWidth = 22; c.lineCap = 'round'; c.shadowBlur = 40;
    c.shadowColor = '#ff1744'; c.strokeStyle = '#ff1744'; c.beginPath(); c.arc(W / 2, H * 0.5, 120, 0.2, Math.PI - 0.2); c.stroke();
    c.shadowColor = '#00f0ff'; c.strokeStyle = '#00f0ff'; c.lineWidth = 9; c.beginPath(); c.arc(W / 2, H * 0.49, 120, 0.2, Math.PI - 0.2); c.stroke();
    c.shadowBlur = 0; c.fillStyle = '#fff';
    for (let i = 0; i < 9; i++) { const a = 0.35 + i * 0.3, x = W / 2 + Math.cos(a) * 112, y = H * 0.5 + Math.sin(a) * 112; c.beginPath(); c.moveTo(x - 9, y - 6); c.lineTo(x + 9, y - 6); c.lineTo(x, y + 16); c.fill(); }
    c.fillStyle = '#00f0ff'; c.beginPath(); c.arc(W / 2 - 80, H * 0.4, 12, 0, 7); c.arc(W / 2 + 80, H * 0.4, 12, 0, 7); c.fill();
  }),
  doodle: tex(256, 256, (c, W, H) => {
    c.fillStyle = '#fffdf4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#8a3ffc'; c.lineWidth = 7; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(30, 130); c.quadraticCurveTo(110, 40, 200, 120); c.lineTo(236, 84); c.lineTo(228, 160); c.lineTo(200, 138); c.quadraticCurveTo(110, 200, 30, 130); c.stroke();
    c.beginPath(); c.moveTo(105, 84); c.lineTo(126, 36); c.lineTo(150, 86); c.stroke();
    c.beginPath(); c.moveTo(50, 140); c.lineTo(62, 152); c.lineTo(74, 140); c.lineTo(86, 152); c.lineTo(98, 140); c.stroke();
    c.fillStyle = '#222'; c.beginPath(); c.arc(70, 112, 6, 0, 7); c.fill();
    c.fillStyle = '#e0457b'; c.font = '44px "Comic Sans MS", "Marker Felt", cursive'; c.fillText('Jamie', 110, 236);
  }),
  poster: tex(512, 720, (c, W, H) => {
    c.fillStyle = '#0c0c0c'; c.fillRect(0, 0, W, H); c.fillStyle = '#ff3fa4';
    c.beginPath(); c.ellipse(W / 2, 300, 130, 150, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(W / 2 - 150, 250, 55, 130, 0.35, 0, 7); c.ellipse(W / 2 + 150, 250, 55, 130, -0.35, 0, 7); c.fill();
    c.font = 'bold 70px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('CANCERCANCER', W / 2, 560, W - 40);
    const cols = ['#00f0ff', '#ffe14d', '#7dff6b', '#ff8a3d', '#c9b6ff', '#fff']; c.lineWidth = 4;
    cols.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); let x = 40 + (i % 3) * 150, y = 620 + Math.floor(i / 3) * 50; c.moveTo(x, y); for (let k = 0; k < 7; k++) c.quadraticCurveTo(x + k * 16 + 8, y + (k % 2 ? 22 : -22), x + (k + 1) * 16, y + rnd(-6, 6)); c.stroke(); });
  }),
  rafters: tex(512, 384, (c, W, H) => {
    const g = c.createRadialGradient(W / 2, H * 0.62, 20, W / 2, H * 0.62, 330); g.addColorStop(0, '#ffc46b'); g.addColorStop(0.5, '#8a4a16'); g.addColorStop(1, '#170b05'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2b1608'; for (let i = 0; i < 11; i++) { c.beginPath(); c.arc(120 + i * 27 + rnd(-8, 8), H * 0.66 + rnd(-30, 30), 6, 0, 7); c.fill(); }
    c.fillStyle = '#0d0603'; c.fillRect(0, 60, W, 46); c.fillRect(0, 250, W, 60); c.save(); c.translate(180, 0); c.rotate(0.12); c.fillRect(0, -20, 54, H + 60); c.restore();
  }),
  koi: tex(384, 256, (c, W, H) => {
    c.fillStyle = '#3f6b3a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#2e5230'; c.lineWidth = 3;
    for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(rnd(0, W), rnd(0, H), rnd(6, 16), 0, 3); c.stroke(); }
    c.shadowBlur = 22; c.shadowColor = '#ff3fa4'; c.fillStyle = '#ff3fa4'; c.beginPath(); c.ellipse(170, 128, 96, 40, -0.15, 0, 7); c.fill();
    c.beginPath(); c.moveTo(250, 112); c.lineTo(336, 60); c.lineTo(316, 128); c.lineTo(340, 190); c.fill();
    c.shadowColor = '#1f8bff'; c.fillStyle = '#1f8bff'; c.beginPath(); c.ellipse(140, 112, 34, 18, 0, 0, 7); c.ellipse(206, 140, 26, 14, 0, 0, 7); c.fill();
    c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(96, 120, 6, 0, 7); c.fill();
  }),
  cathedral: tex(768, 384, (c, W, H) => {
    c.fillStyle = '#0b0a12'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 142, w = 120;
      c.fillStyle = '#2a2740'; c.beginPath(); c.moveTo(x, H); c.lineTo(x, 150); c.quadraticCurveTo(x, 50, x + w / 2, 22); c.quadraticCurveTo(x + w, 50, x + w, 150); c.lineTo(x + w, H); c.fill();
      const col = ['#ff3fa4', '#00f0ff', '#ffe14d', '#7dff6b', '#ff8a3d'][i];
      c.shadowBlur = 26; c.shadowColor = col; c.fillStyle = col; c.fillRect(x + 28, 170, 64, 170); c.shadowBlur = 0;
      c.fillStyle = '#0b0a12'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) c.fillRect(x + 34 + k * 19, 180 + r * 26, 14, 18);
      c.fillRect(x + 36, 300, 48, 22);
    }
  }),
  treaty: tex(1024, 512, (c, W, H) => {
    c.fillStyle = '#c9b89a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const x = rnd(10, W - 150), y = rnd(10, H - 130), w = rnd(90, 150), h = rnd(80, 130);
      c.save(); c.translate(x, y); c.rotate(rnd(-0.08, 0.08));
      c.fillStyle = pick(['#fffdf4', '#fff3b8', '#ffd9e6', '#d8f0ff', '#e6ffd8']); c.fillRect(0, 0, w, h);
      c.strokeStyle = pick(['#333', '#7b2cff', '#d1344b', '#1f6feb']); c.lineWidth = 2;
      for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(8, 16 + l * 18); for (let k = 0; k < 8; k++) c.lineTo(8 + k * (w - 16) / 8, 16 + l * 18 + rnd(-4, 4)); c.stroke(); }
      c.fillStyle = 'rgba(180,170,150,.8)'; c.fillRect(w / 2 - 14, -6, 28, 12); c.restore();
    }
  }),
  stilton: tex(256, 256, (c, W, H) => {
    c.fillStyle = '#f1e3b4'; c.fillRect(0, 0, W, H); c.strokeStyle = '#4b6a8f'; c.lineWidth = 3;
    for (let i = 0; i < 60; i++) { c.beginPath(); let x = rnd(0, W), y = rnd(0, H); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rnd(-18, 18); y += rnd(-18, 18); c.lineTo(x, y); } c.stroke(); }
  }),
  crossword: tex(256, 256, (c, W, H) => {
    c.fillStyle = '#fffdf4'; c.fillRect(0, 0, W, H); const n = 9, s = W / n; c.font = 'bold 20px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i * 7 + j * 3) % 5 === 0) { c.fillStyle = '#111'; c.fillRect(i * s, j * s, s, s); }
      else { c.strokeStyle = '#111'; c.strokeRect(i * s, j * s, s, s); c.fillStyle = '#1f3a8a'; c.fillText(String.fromCharCode(65 + (i * 5 + j * 11) % 26), i * s + s / 2, j * s + s / 2); }
    }
  }),
  sky: tex(4, 512, (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3a2a5e'); g.addColorStop(0.3, '#b0607a'); g.addColorStop(0.47, '#ffb056'); g.addColorStop(0.52, '#ffe1a0'); g.addColorStop(0.6, '#e6b877'); g.addColorStop(1, '#e6b877');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }),
  field: () => tex(128, 128, (c, W, H) => {
    c.fillStyle = pick(['#152a4a', '#3a1030', '#0d3b32', '#40260c', '#221a3a']); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { c.fillStyle = pick(['#ff3fa4', '#00f0ff', '#7b2cff', '#ffe14d', '#ff8a3d', '#7dff6b']); c.globalAlpha = rnd(0.5, 1); c.beginPath(); c.ellipse(rnd(0, W), rnd(0, H), rnd(10, 46), rnd(8, 30), rnd(0, 3), 0, 7); c.fill(); }
  }),
  chalk: tex(256, 128, (c, W, H) => {
    c.strokeStyle = '#f4f1e6'; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(24, 64); c.lineTo(226, 64); c.moveTo(180, 26); c.lineTo(230, 64); c.lineTo(180, 102); c.stroke();
  }),
};
const rainCanvas = document.createElement('canvas'); rainCanvas.width = rainCanvas.height = 256;
const rainCtx = rainCanvas.getContext('2d'); const rainTex = new THREE.CanvasTexture(rainCanvas); rainTex.colorSpace = THREE.SRGBColorSpace;
const drops = Array.from({ length: 70 }, () => ({ x: rnd(0, 256), y: rnd(0, 256), v: rnd(140, 300), l: rnd(8, 26) }));
function drawRain(dt, t) {
  const c = rainCtx, g = c.createLinearGradient(0, 0, 0, 256), k = 0.5 + 0.5 * Math.sin(t * 0.05);
  g.addColorStop(0, `rgb(${70 + k * 30},${78 + k * 30},${92 + k * 30})`); g.addColorStop(1, '#2b3038'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(210,220,235,.55)'; c.lineWidth = 1.5; c.beginPath();
  for (const d of drops) { d.y += d.v * dt; if (d.y > 270) { d.y = -20; d.x = rnd(0, 256); } c.moveTo(d.x, d.y); c.lineTo(d.x - 3, d.y + d.l); }
  c.stroke(); rainTex.needsUpdate = true;
}

// ───────────────────────── people ─────────────────────────
function makeFox() {                      // Vivian: a lady in a low-poly fox costume, white cane.
  const g = new THREE.Group(), O = 0xd9682b, W = 0xfff4e2, D = 0x2a1a12;
  cyl(0.2, 0.32, 0.95, O, 0, 0.72, 0, { seg: 6, parent: g });
  box(0.22, 0.5, 0.06, W, 0, 0.86, 0.2, { parent: g });
  box(0.36, 0.32, 0.32, O, 0, 1.4, 0, { parent: g });
  const sn = cone(0.11, 0.28, W, 0, 1.35, 0.26, { seg: 4, parent: g }); sn.rotation.x = Math.PI / 2;
  box(0.05, 0.05, 0.05, D, 0, 1.37, 0.41, { parent: g });
  for (const s of [-1, 1]) {
    cone(0.09, 0.24, O, s * 0.12, 1.68, 0, { seg: 4, parent: g }); cone(0.045, 0.1, D, s * 0.12, 1.77, 0, { seg: 4, parent: g });
    box(0.09, 0.02, 0.02, D, s * 0.09, 1.45, 0.165, { parent: g });
    box(0.08, 0.5, 0.08, O, s * 0.3, 0.92, 0.02, { parent: g }).rotation.z = s * 0.2;
  }
  const tail = cone(0.14, 0.7, O, 0, 0.5, -0.42, { seg: 5, parent: g }); tail.rotation.x = -2.2;
  const tip = cone(0.07, 0.24, W, 0, 0.7, -0.68, { seg: 5, parent: g }); tip.rotation.x = -2.2 + Math.PI;
  const cane = new THREE.Group();
  cyl(0.014, 0.014, 1.15, W, 0, 0.6, 0, { seg: 6, parent: cane, mat: glow(0xffffff) });
  cyl(0.016, 0.016, 0.16, 0xd1344b, 0, 0.08, 0, { seg: 6, parent: cane, mat: glow(0xd1344b) });
  cane.position.set(0.38, 0.02, 0.16); cane.rotation.z = -0.1; cane.rotation.x = 0.12; g.add(cane); g.userData.cane = cane;
  return g;
}
function makeRabbit() {                   // Jack: wiry, cel-shaded, glowing a little wrong against the room.
  const g = new THREE.Group();
  const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, emissive: c, emissiveIntensity: 0.28 });
  const ink = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
  const part = (geo, c, x, y, z, rz = 0) => {
    const m = add(new THREE.Mesh(geo, toon(c)), x, y, z, g); m.rotation.z = rz;
    const o = new THREE.Mesh(geo, ink); o.scale.setScalar(1.09); m.add(o); return m;
  };
  const C = 0xf6ecd8;
  part(new THREE.CylinderGeometry(0.13, 0.17, 0.85, 10), C, 0, 0.82, 0);
  part(new THREE.IcosahedronGeometry(0.2, 2), C, 0, 1.45, 0);
  for (const s of [-1, 1]) {
    part(new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), C, s * 0.09, 1.92, 0, -s * 0.12);
    part(new THREE.CapsuleGeometry(0.045, 0.5, 4, 8), C, s * 0.2, 0.9, 0, s * 0.18);
    part(new THREE.CapsuleGeometry(0.055, 0.42, 4, 8), C, s * 0.08, 0.24, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), glow(0x111111)), s * 0.075, 1.5, 0.18, g);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, 2.2), glow(0x111111));
  smile.rotation.z = Math.PI + 0.75; add(smile, 0.01, 1.42, 0.185, g);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), glow(0xff8fb0)), 0, 1.45, 0.2, g);
  return g;
}

// ───────────────────────── THE TAVERN: door, lobby, bar ─────────────────────────
box(6.4, 0.1, 6, 0x1a1512, 0, -0.05, 10.1);
solid(-3.3, -3.1, 7, 13.2); solid(3.1, 3.3, 7, 13.2); solid(-3.3, 3.3, 13.1, 13.3);
room({ x1: -9, x2: 9, z1: -7, z2: 7, h: 6, floor: 0x4a2f1c, wall: 0x6a4428, ceil: 0x1c120b,
  doors: [{ side: 's', at: 0, w: 1.4 }, { side: 'e', at: -2, w: 1.4 }] });
const doorPivot = new THREE.Group(); doorPivot.position.set(-0.7, 0, 7); scene.add(doorPivot);
const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14), mat(0xd9a441));
model('door', 0.7, 0, 0, { parent: doorPivot, size: [1.4, 2.3, 0.14], replaces: capture(() => {
  box(1.4, 2.3, 0.09, 0x7a2f1e, 0.7, 1.15, 0, { parent: doorPivot }); add(knocker, 0.7, 1.45, 0.07, doorPivot);
}) });
const doorSolid = solid(-0.7, 0.7, 6.9, 7.1);
lamp('T', 0xffb056, 5, 9, 0, 2.7, 7.9);
model('lantern', 0, 2.45, 7.3, { h: 0.5, glow: true, replaces: [box(0.16, 0.22, 0.16, 0, 0, 2.7, 7.25, { mat: glow(0xffc67a) })] });
box(1.2, 0.03, 0.7, 0x6b5a3a, 0, 0.02, 7.7);                       // doormat

// bar counter, shelves, bottles that remember what they are
const WOOD = 0x3a2314, LACQ = 0x24140a, BRASS = 0xd9a441;
box(11, 1.05, 0.8, WOOD, -1, 0.525, -4.5, { solid: true }); box(11.1, 0.07, 0.9, LACQ, -1, 1.085, -4.5);
box(0.8, 1.05, 2.1, WOOD, 4.1, 0.525, -5.95, { solid: true }); box(0.9, 0.07, 2.15, LACQ, 4.1, 1.085, -5.95);
cyl(0.03, 0.03, 11, BRASS, -1, 0.2, -4.02, { seg: 6 }).rotation.z = Math.PI / 2;
const bottles = [];
for (const sy of [1.35, 1.9, 2.45]) {
  box(9.6, 0.05, 0.3, WOOD, -1.4, sy - 0.03, -6.75);
  for (let x = -6; x <= 3.2; x += 0.42) {
    const col = pick([0xff3fa4, 0x00f0ff, 0xffe14d, 0x7dff6b, 0xff8a3d, 0xc9b6ff, 0xffb056]);
    const b = cyl(0.045, 0.07, rnd(0.26, 0.4), 0, x + rnd(-0.05, 0.05), sy + 0.18, -6.75, { seg: 6, mat: glow(col, { transparent: true, opacity: 0.85 }) });
    b.scale.setScalar(0.001); bottles.push(b);
  }
}
bottles.sort(() => Math.random() - 0.5);
model('taps', -2.5, 1.12, -4.55, { h: 0.5, replaces: capture(() => { for (const x of [-2.7, -2.5, -2.3]) cyl(0.02, 0.02, 0.3, BRASS, x, 1.27, -4.6, { seg: 6 }); }) });   // the taps
const stoolAt = (x, z, seat = 0x7a2f1e, name = 'stool') => {
  model(name, x, 0, z, { h: 0.78, rotY: rnd(0, 6), replaces: capture(() => { cyl(0.2, 0.2, 0.07, seat, x, 0.74, z); cyl(0.03, 0.05, 0.72, 0x1a120c, x, 0.36, z, { seg: 6 }); }) });
  solid(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
};
stoolAt(-5.5, -3.55); stoolAt(-4.75, -3.55);        // the safe end of the rail
stoolAt(-2.5, -3.55); stoolAt(-1.2, -3.55); stoolAt(0.4, -3.55);
stoolAt(1.4, -3.55, 0x8fb33a, 'snakestool');                      // the Snake's. The bad color was a choice.
stoolAt(2.9, -3.55); stoolAt(5.25, -5.5);
model('lavender', -3.3, 1.12, -4.4, { h: 0.34, replaces: capture(() => {
  cone(0.07, 0.16, 0, -3.3, 1.2, -4.4, { seg: 6, mat: glow(0xc9a6ff) }).rotation.x = Math.PI;     // lavender, in a glass like a flower
  for (let i = 0; i < 6; i++) { const p = cone(0.03, 0.1, 0, -3.3 + Math.cos(i) * 0.07, 1.27, -4.4 + Math.sin(i) * 0.07, { seg: 3, mat: glow(0xe6d4ff) }); p.rotation.z = Math.cos(i) * 0.6; p.rotation.x = -Math.sin(i) * 0.6; }
}) });
model('rose', 0.4, 1.12, -4.4, { h: 0.22, replaces: [cyl(0.035, 0.02, 0.13, 0, 0.4, 1.19, -4.4, { seg: 8, mat: glow(0xff9bb0, { transparent: true, opacity: 0.9 }) })] });   // rosé he isn't drinking
const crossword = plane(0.42, 0.42, ART.crossword, 5.2, 1.55, -4.75, -0.5);
lamp('T', 0xffd9a0, 1.6, 4.5, -5.1, 2.3, -4.2);     // the little patch of light around Viv

const viv = makeFox(); scene.add(viv);
model('vivian', 0, 0, 0, { parent: viv, h: 1.72, replaces: [...viv.children] });
const VIV_BAR = [-4.4, 0, -5.75], VIV_CHAIR = [-0.35, 0, AZ - 1.35];     // standing by her chair
viv.position.set(...VIV_BAR);
const jack = makeRabbit(); jack.position.set(0.4, 0, -3.05); jack.rotation.y = 0.5; scene.add(jack);
model('jack', 0, 0, 0, { parent: jack, h: 2.0, glow: true, replaces: [...jack.children] });   // unlit: he doesn't take the room's light
const jackGlow = lamp('T', 0xfff0c8, 1.2, 3.5, 0.4, 1.5, -2.9);

// booths
const booths = new THREE.Group(); scene.add(booths);
for (const zc of [1.2, 3.6, 5.9]) {
  model('booth', -8.1, 0, zc, { parent: booths, size: [2.0, 1.3, 1.6], rotY: Math.PI / 2, replaces: capture(() => {
    box(1.5, 0.07, 0.8, LACQ, -8.1, 0.76, zc, { parent: booths }); cyl(0.06, 0.1, 0.74, WOOD, -8.1, 0.37, zc, { parent: booths });
    for (const s of [-1, 1]) { box(1.6, 0.45, 0.4, 0x7a2f1e, -8.1, 0.225, zc + s * 0.72, { parent: booths }); box(1.6, 1.25, 0.1, WOOD, -8.1, 0.63, zc + s * 0.95, { parent: booths }); }
  }) });
  solid(-9, -7.25, zc - 1, zc + 1);
}
booths.scale.y = 0.001;

// stairs to the apartment over the bar
for (let i = 0; i < 10; i++) box(1.4, 0.3 * (i + 1), 0.5, WOOD, -8.2, 0.15 * (i + 1), -1.75 - 0.5 * i);
box(1.0, 2.2, 0.08, 0x7a2f1e, -8.2, 4.1, -6.84);
solid(-9, -7.5, -7, -1.5);

// the cabinet that wasn't here before
model('cabinet', 0, 0, 1.5, { h: 1.9, replaces: capture(() => {
  box(0.85, 1.9, 0.9, 0x1b1b2e, 0, 0.95, 1.5, { solid: true });
  box(0.6, 0.48, 0.02, 0, 0, 1.3, 1.96, { mat: glow(0x0a3a4a) });
}) });
const marquee = plane(0.8, 0.26, label('LOOK UP', { w: 0.8, h: 0.26, bg: '#12060d', fg: '#ff3fa4', font: 'bold 120px Impact, "Arial Black", sans-serif' }), 0, 1.72, 1.965);
box(0.02, 0.3, 0.26, 0, 0.44, 0.15, 1.5, { mat: glow(0x58ff8a) });           // the mousehole, lit a friendly green

// rafters, duct, the trail
for (const z of [-5.5, -2.5, 0.5, 3.5, 6.4]) box(18, 0.32, 0.32, 0x24140a, 0, 4.3, z);
for (const x of [-4.5, 4.5]) box(0.32, 0.32, 14, 0x24140a, x, 4.62, 0);
box(0.6, 0.5, 13.8, 0x4d4a48, 3, 5.2, 0);
const chalk = plane(0.7, 0.35, ART.chalk, 0, 4.13, 0.5, 0, { alpha: true }); chalk.rotation.set(Math.PI / 2, 0, Math.PI / 2);
box(0.008, 1.5, 0.008, 0xdddddd, 0, 3.55, 6.5); plane(0.34, 0.24, ART.koi, 0, 2.7, 6.5, Math.PI);       // koi over the door
box(0.04, 0.4, 0.7, 0x3a3836, 8.88, 2.3, 5); plane(0.34, 0.24, ART.koi, 8.87, 1.55, 5, -Math.PI / 2);   // koi under the vent
plane(1.6, 1.3, tex(8, 8, (c) => { const g = c.createLinearGradient(0, 0, 0, 8); g.addColorStop(0, '#2b3a6b'); g.addColorStop(1, '#c46a5a'); c.fillStyle = g; c.fillRect(0, 0, 8, 8); }), -5, 1.9, 6.88, Math.PI);

// jukebox, phonograph, dartboard
model('jukebox', 8.3, 0, 2.5, { h: 1.65, rotY: -Math.PI / 2, replaces: capture(() => {
  box(0.9, 1.6, 0.6, 0x5a1f3a, 8.3, 0.8, 2.5, { solid: true });
  box(0.02, 0.5, 0.42, 0, 7.84, 1.15, 2.5, { mat: glow(0xffe14d) }); box(0.02, 0.12, 0.5, 0, 7.84, 0.6, 2.5, { mat: glow(0x00f0ff) }); box(0.02, 0.12, 0.5, 0, 7.84, 1.55, 2.5, { mat: glow(0xff3fa4) });
}) });
model('phonograph', 6.9, 0, 5.9, { h: 1.55, rotY: Math.PI + 0.7, replaces: capture(() => {
  box(0.8, 0.8, 0.8, WOOD, 6.9, 0.4, 5.9, { solid: true }); box(0.5, 0.14, 0.5, 0x1a120c, 6.9, 0.87, 5.9);
  const horn = cone(0.34, 0.6, BRASS, 6.75, 1.3, 5.75, { seg: 8, mat: new THREE.MeshLambertMaterial({ color: BRASS, flatShading: true, side: THREE.DoubleSide }) });
  horn.geometry = new THREE.ConeGeometry(0.34, 0.6, 8, 1, true); horn.rotation.set(-2.2, 0, 0.5);
}) });
model('dartboard', 8.84, 1.7, -5.2, { h: 0.62, centre: true, rotY: -Math.PI / 2, replaces: capture(() => {
  cyl(0.3, 0.3, 0.05, 0x1a120c, 8.86, 1.7, -5.2, { seg: 12 }).rotation.z = Math.PI / 2;
  cyl(0.2, 0.2, 0.06, 0, 8.85, 1.7, -5.2, { seg: 12, mat: glow(0xd1344b) }).rotation.z = Math.PI / 2;
  cyl(0.07, 0.07, 0.07, 0, 8.84, 1.7, -5.2, { seg: 12, mat: glow(0xffe14d) }).rotation.z = Math.PI / 2;
}) });
const dart = cone(0.025, 0.2, 0, 7.4, 1.7, -5.2, { seg: 5, mat: glow(0x7dff6b) }); dart.rotation.z = -Math.PI / 2;

const barLights = [lamp('T', 0xffb056, 26, 18, -5, 3.6, -3), lamp('T', 0xffb056, 26, 18, 3, 3.6, -3),
  lamp('T', 0xffb056, 24, 18, -4, 3.6, 3.4), lamp('T', 0xffb056, 24, 18, 4, 3.6, 3.4)];
for (const l of barLights) model('lantern', l.position.x, 3.5, l.position.z, { h: 0.7, glow: true, replaces: [box(0.22, 0.26, 0.22, 0, l.position.x, 3.75, l.position.z, { mat: glow(0xffc67a) })] });

// ───────────────────────── hall, viewing room, gallery ─────────────────────────
room({ x1: 9.1, x2: 21, z1: -3.2, z2: -0.8, h: 3, floor: 0x3d2a1c, wall: 0x5b4632, ceil: 0x1c120b, skip: 'w',
  doors: [{ side: 'n', at: 14, w: 1.4 }, { side: 's', at: 15, w: 1.4 }, { side: 'e', at: -2, w: 1.1 }] });
doorPanel(21, -2, 'z', 0x2f6b4f, 1.1);
plane(0.8, 0.22, label('HOME', { w: 0.8, h: 0.22 }), 20.88, 2.55, -2, -Math.PI / 2);
plane(1.2, 0.22, label('VIEWING ROOM', { w: 1.2, h: 0.22 }), 14, 2.6, -3.08, 0);
plane(0.9, 0.22, label('GALLERY', { w: 0.9, h: 0.22 }), 15, 2.6, -0.92, Math.PI);
lamp('T', 0xffc98a, 4, 10, 15, 2.6, -2);

room({ x1: 10.5, x2: 17.5, z1: -9.2, z2: -3.2, h: 3, floor: 0x1d1a22, wall: 0x2a2633, ceil: 0x121016, skip: 's' });
plane(5.2, 2.6, ART.cathedral, 14, 1.55, -9.08, 0);
for (const x of [12.4, 14, 15.6]) for (const z of [-6.2, -4.9]) {
  model('viewchair', x, 0, z, { h: 0.95, rotY: Math.PI, replaces: capture(() => { box(0.5, 0.06, 0.5, 0x5b4632, x, 0.45, z); box(0.5, 0.55, 0.06, 0x5b4632, x, 0.75, z + 0.25); box(0.4, 0.44, 0.4, 0x2a211b, x, 0.22, z); }) });
  solid(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
}
lamp('T', 0x9aa6ff, 2.5, 9, 14, 2.2, -7.6);

room({ x1: 10, x2: 21, z1: -0.8, z2: 8, h: 4, floor: 0x8a7a66, wall: 0xe9e2d6, ceil: 0xf4efe6, skip: 'n' });
const picFrame = (w, h, x, y, z, rotY) => { const f = box(w + 0.12, h + 0.12, 0.05, 0x1a120c, x, y, z); f.rotation.y = rotY; };
picFrame(1.9, 2.4, 14.2, 1.9, 7.88, 0); plane(1.9, 2.4, ART.shark, 14.2, 1.9, 7.84, Math.PI, { lit: true });
plane(0.5, 0.5, ART.doodle, 15.85, 1.6, 7.86, Math.PI, { lit: true }).rotation.z = 0.06;
picFrame(1.4, 2.0, 20.88, 1.9, 4.2, Math.PI / 2); plane(1.4, 2.0, ART.poster, 20.84, 1.9, 4.2, -Math.PI / 2, { lit: true });
picFrame(1.9, 1.4, 10.12, 1.9, 2, Math.PI / 2); plane(1.9, 1.4, ART.rafters, 10.16, 1.9, 2, Math.PI / 2, { lit: true });
picFrame(1.5, 1.0, 10.12, 1.8, 5.4, Math.PI / 2); plane(1.5, 1.0, ART.koi, 10.16, 1.8, 5.4, Math.PI / 2, { lit: true });
box(0.5, 0.8, 0.5, 0xf4efe6, 10.5, 0.4, 6.7, { solid: true });                 // side table: a koi in a bottle
cyl(0.14, 0.14, 0.3, 0, 10.5, 0.97, 6.7, { seg: 10, mat: glow(0x9fe8ff, { transparent: true, opacity: 0.35 }) });
const bottleKoi = box(0.12, 0.05, 0.03, 0, 10.5, 0.97, 6.7, { mat: glow(0xff3fa4) });
model('foldtable', 16.5, 0, 3.6, { h: 1.12, replaces: capture(() => {
  box(2.2, 0.05, 0.8, 0xd8d2c6, 16.5, 0.76, 3.6, { solid: true });               // folding table
  for (const x of [15.7, 15.95, 16.2]) cyl(0.04, 0.045, 0.3, 0x1f3d2a, x, 0.94, 3.6, { seg: 6 });
}) });
const cheeseMat = new THREE.MeshLambertMaterial({ map: ART.stilton });
model('stilton', 16.85, 0.8, 3.6, { w: 0.4, replaces: [cyl(0.24, 0.24, 0.16, 0, 17.2, 0.87, 3.6, { seg: 14, mat: cheeseMat })] });
const chalk2 = plane(0.5, 0.25, ART.chalk, 15, 2.7, -0.66, 0, { alpha: true }); chalk2.rotation.z = -Math.PI / 2;
lamp('T', 0xfff4e2, 7, 14, 13, 3.5, 3.6); lamp('T', 0xfff4e2, 7, 14, 18, 3.5, 3.6);

// ───────────────────────── upstairs: the apartment over the bar ─────────────────────────
room({ x1: -3, x2: 3, z1: AZ - 3, z2: AZ + 3, h: 2.8, floor: 0x3d2a1c, wall: 0x4a3a30, ceil: 0x2a211b, doors: [{ side: 's', at: 1.5, w: 1 }] });
doorPanel(1.5, AZ + 3, 'x', 0x7a2f1e);
box(1.9, 1.6, 0.06, 0x1a120c, -1.2, 1.6, AZ - 2.9); plane(1.7, 1.4, rainTex, -1.2, 1.6, AZ - 2.86, 0);
model('armchair', -1.2, 0, AZ - 1.6, { h: 1.15, replaces: capture(() => {
  box(0.8, 0.42, 0.8, 0x5a2a3a, -1.2, 0.21, AZ - 1.5, { solid: true }); box(0.8, 0.9, 0.14, 0x5a2a3a, -1.2, 0.85, AZ - 1.86);
  for (const s of [-1, 1]) box(0.12, 0.3, 0.8, 0x4a2030, -1.2 + s * 0.46, 0.55, AZ - 1.5);
}) });
cyl(1.5, 1.5, 0.02, 0x6b3a2a, -0.6, 0.01, AZ - 0.6, { seg: 20 });
model('floorlamp', -2.3, 0, AZ - 1.7, { h: 1.75, glow: true, replaces: capture(() => { cyl(0.02, 0.02, 1.5, 0x1a120c, -2.3, 0.75, AZ - 1.7, { seg: 6 }); cone(0.24, 0.3, 0, -2.3, 1.6, AZ - 1.7, { seg: 8, mat: glow(0xffc67a) }); }) });
const aptLamp = lamp('A', 0xffb056, 5, 9, -2.3, 1.5, AZ - 1.6);

// ───────────────────────── inside the walls: the mousehole studio ─────────────────────────
room({ x1: SX - 6, x2: SX + 6, z1: -3.5, z2: 3.5, h: 9, floor: 0xb08a55, wall: 0xe59ab0, ceil: null });
for (let x = SX - 6; x <= SX + 6; x += 3) for (const z of [-3.15, 3.15]) box(0.5, 9, 0.5, 0xd6b37a, x, 4.5, z);
for (const z of [-3.15, 3.15]) { box(12, 0.5, 0.5, 0xd6b37a, SX, 0.25, z); box(12, 0.5, 0.5, 0xc9a66c, SX, 5.4, z); }
for (let i = 0; i < 7; i++) {                                                   // hidden cables
  const z = pick([-2.85, 2.85]), y = rnd(3.4, 7.5), a = SX - 6 + rnd(0, 6), b = a + rnd(3, 6);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a, y, z), new THREE.Vector3((a + b) / 2, y - rnd(0.6, 1.6), z), new THREE.Vector3(b, y, z));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 5), mat(pick([0x111111, 0x111111, 0x1f6feb, 0xd1344b, 0xffe14d]))));
}
model('workbench', SX - 3.0, 0, -2.5, { w: 3.5, replaces: capture(() => {
  box(4, 0.14, 1.3, 0x8a6a3a, SX - 3, 1.0, -2.4, { solid: true }); for (const x of [-4.8, -1.2]) box(0.14, 1, 1.1, 0x6b4a2e, SX + x, 0.5, -2.4);
}) });
model('easel', SX + 1.6, 0, 1.3, { h: 1.9, rotY: Math.PI - 0.5 }); solid(SX + 1.2, SX + 2, 0.9, 1.7);
[[0x00f0ff, -4.2, 2.0, 0.5], [0xff3fa4, -3, 2.5, 0.7], [0x7dff6b, -1.8, 1.9, 0.45]].forEach(([c, x, y, s]) => {   // sims paused where he lost faith
  const w = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s)), new THREE.LineBasicMaterial({ color: c }));
  w.rotation.set(rnd(0, 1), rnd(0, 1), rnd(0, 1)); add(w, SX + x, y, -2.4);
  const inner = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(s * 0.3, 0)), new THREE.LineBasicMaterial({ color: c })); w.add(inner);
});
[[-2.1, 'MAYBE\nUSEFUL'], [-1.5, 'EMOTIONALLY\nSIGNIFICANT\nBUT USELESS']].forEach(([x, t]) => {
  model('buttonjar', SX + x, 1.07, -2.1, { h: 0.36, rotY: x, replaces: capture(() => {
    cyl(0.16, 0.16, 0.34, 0, SX + x, 1.24, -2.1, { seg: 10, mat: new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.4 }) });
    for (let i = 0; i < 14; i++) cyl(0.03, 0.03, 0.012, 0, SX + x + rnd(-0.1, 0.1), 1.09 + i * 0.016, -2.1 + rnd(-0.1, 0.1), { seg: 6, mat: glow(pick([0xff3fa4, 0x00f0ff, 0xffe14d, 0x7dff6b, 0xffffff, 0xff8a3d])) });
  }) });
  plane(0.3, 0.2, label(t, { w: 0.3, h: 0.2, bg: '#fffdf4', fg: '#1a120c', font: 'bold 54px system-ui, sans-serif', px: 384 }), SX + x, 1.24, -1.93, 0);
});
for (let i = 0; i < 9; i++) {                                                   // canvases in unstable geological layers
  const s = i % 2 ? 1 : -1, w = rnd(0.9, 1.9), h = rnd(1.1, 2.2), x = SX - 5 + i * 1.15 + rnd(-0.2, 0.2);
  if (s < 0 && x < SX - 0.6) continue;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), [mat(0xe8dcc6), mat(0xe8dcc6), mat(0xe8dcc6), mat(0xe8dcc6), new THREE.MeshLambertMaterial({ map: ART.field() }), mat(0xe8dcc6)]);
  m.rotation.set(s * 0.22, s > 0 ? Math.PI : 0, rnd(-0.05, 0.05)); add(m, x, h / 2, s * (2.75 - h * 0.11));
}
for (let i = 0; i < 16; i++) { const p = box(rnd(0.25, 0.4), 0.004, rnd(0.3, 0.45), 0xfffdf4, SX + rnd(-5, 4.5), 0.004 + i * 0.001, rnd(-1.4, 2.2)); p.rotation.y = rnd(0, 3); }
model('stilton', SX + 4.7, 0, -2.3, { w: 2.0, rotY: 2.4, replaces: [cyl(1.0, 1.0, 0.7, 0, SX + 4.7, 0.35, -2.3, { seg: 18, mat: cheeseMat })] }); solid(SX + 3.7, SX + 5.7, -3.3, -1.3);   // in the corner sat the cheese
box(0.06, 1.7, 1.2, 0, SX + 5.86, 0.85, 0.6, { mat: glow(0x58ff8a) });
cyl(0.6, 0.6, 0.06, 0, SX + 5.86, 1.7, 0.6, { seg: 16, mat: glow(0x58ff8a) }).rotation.z = Math.PI / 2;
lamp('S', 0xffd9a0, 9, 16, SX - 3, 3.4, -1.6); lamp('S', 0x58ff8a, 4, 9, SX + 5, 1.4, 0.6); lamp('S', 0xffb056, 4, 14, SX + 1, 4, 1);

// ───────────────────────── the house, the porch, the yard ─────────────────────────
room({ x1: HX - 1.2, x2: HX + 1.2, z1: -10, z2: 0, h: 2.8, floor: 0x6b4a2e, wall: 0xd9c7a8, ceil: 0xe8dcc6,
  doors: [{ side: 's', at: HX, w: 1.1 }, { side: 'e', at: -5, w: 1 }, { side: 'w', at: -2, w: 1 }, { side: 'w', at: -6.5, w: 1 }, { side: 'n', at: HX, w: 1 }] });
doorPanel(HX - 1.2, -2, 'z', 0x7a2f1e);                                         // back to the bar
plane(0.7, 0.2, label('THE BAR', { w: 0.7, h: 0.2 }), HX - 1.08, 2.5, -2, Math.PI / 2);
doorPanel(HX - 1.2, -6.5, 'z', 0x3b4a6b);                                       // Jack & Vivian's room
doorPanel(HX, -10, 'x', 0x8a5a3a);                                              // the back of the house
box(0.9, 0.03, 0.14, 0, HX, 0.02, -9.86, { mat: glow(0xffb056) });
room({ x1: HX + 1.2, x2: HX + 7.2, z1: -8, z2: -2, h: 2.8, floor: 0x6b4a2e, wall: 0xb7c4d6, ceil: 0xe8dcc6, skip: 'w' });
plane(4.4, 2.1, ART.treaty, HX + 7.08, 1.45, -5, -Math.PI / 2, { lit: true });  // the treaty wall
for (let i = 0; i < 3; i++) {                                                   // three bunks. The third was built later.
  const wood = i < 2 ? 0x8a5a3a : 0xc9a66c, y = 0.4 + i * 0.75;
  box(2.1, 0.1, 1.0, wood, HX + 5.9, y, -7.35); box(1.9, 0.14, 0.9, [0x3f7fbf, 0xd1344b, 0xffa63d][i], HX + 5.9, y + 0.12, -7.35);
  box(0.36, 0.1, 0.5, 0xfffdf4, HX + 6.6, y + 0.22, -7.35);
  for (const dx of [-1, 1]) for (const dz of [-0.45, 0.45]) box(0.09, 0.75, 0.09, wood, HX + 5.9 + dx, y - 0.02, -7.35 + dz);
}
solid(HX + 4.8, HX + 7, -7.9, -6.8);
cyl(0.34, 0.3, 0.012, 0x4a1f5c, HX + 4.2, 0.008, -4.1, { seg: 9 }).scale.z = 0.7;       // the stain where the stain goes
const bag = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mat(0x2f9c95)), HX + 2.6, 0.36, -3, scene); bag.scale.y = 0.62;
model('beanbag', HX + 2.6, 0, -3, { w: 1.2, replaces: [bag] });
box(0.05, 0.02, 0.36, 0xfffdf4, HX + 2.75, 0.74, -2.95).rotation.y = 0.5; solid(HX + 2.1, HX + 3.1, -3.5, -2.5);
lamp('H', 0xffd9a0, 5, 9, HX + 4.2, 2.3, -5); lamp('H', 0xffd9a0, 4, 9, HX, 2.4, -5);

// facade, porch, yard
box(13, 2.8, 0.2, 0xd9c7a8, HX - 7.7, 1.4, 0); box(13, 2.8, 0.2, 0xd9c7a8, HX + 7.7, 1.4, 0);
solid(HX - 15, HX - 1.2, -0.1, 0.1); solid(HX + 1.2, HX + 15, -0.1, 0.1);
box(8.4, 0.3, 0.2, 0xd9c7a8, HX, 2.65, 0);
const roofShape = new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 3.2)]);
const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 29, bevelEnabled: false }), mat(0x5a3a44));
roof.rotation.y = Math.PI / 2; add(roof, HX - 14.5, 2.95, -5.4);
for (const x of [-9.5, -5, 5, 9.5]) box(1.3, 1.2, 0.06, 0, HX + x, 1.6, 0.12, { mat: glow(0xffd98a) });
box(8, 0.12, 2.6, 0x8a6a4a, HX, 0.0, 1.4); box(8.4, 0.14, 3, 0x5a3a44, HX, 2.95, 1.4);
for (const x of [-3.9, 3.9]) { box(0.16, 2.9, 0.16, 0xfff4e2, HX + x, 1.45, 2.6); solid(HX + x - 0.1, HX + x + 0.1, 2.5, 2.7); }
const ground = add(new THREE.Mesh(new THREE.CircleGeometry(22, 40), mat(0x9aa34a)), HX, -0.06, 12, scene); ground.rotation.x = -Math.PI / 2;
const grid = new THREE.GridHelper(160, 80, 0xffe1a0, 0xd9a441); grid.position.set(HX, -0.12, 20); grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
solid(HX - 15.2, HX - 15, 0, 40); solid(HX + 15, HX + 15.2, 0, 40); solid(HX - 15, HX + 15, 39.8, 40);
for (const [x, z, s] of [[-9, 8, 1.3], [-11, 17, 1], [8, 6, 1.1], [11, 15, 1.5], [-4, 22, 0.9], [5, 24, 1.2]]) {
  model('tree', HX + x, 0, z, { h: 4.6 * s, rotY: x, replaces: capture(() => {
    cyl(0.15 * s, 0.2 * s, 1.2 * s, 0x5a3a24, HX + x, 0.6 * s, z, { seg: 6 }); cone(1.3 * s, 2.6 * s, 0x5f8a3a, HX + x, 2.4 * s, z, { seg: 7 }); cone(1.0 * s, 2.0 * s, 0x79a84a, HX + x, 3.5 * s, z, { seg: 7 });
  }) });
  solid(HX + x - 0.3, HX + x + 0.3, z - 0.3, z + 0.3);
}
const sky = inPocket('H', add(new THREE.Mesh(new THREE.SphereGeometry(150, 24, 16), new THREE.MeshBasicMaterial({ map: ART.sky, side: THREE.BackSide, fog: false })), HX, 0, 10, scene));
const sun = inPocket('H', new THREE.DirectionalLight(0xffc66b, 1.6)); sun.position.set(HX - 30, 18, 60); sun.target.position.set(HX, 0, 0); scene.add(sun, sun.target);
const moteGeo = new THREE.BufferGeometry(), moteN = 260, motePos = new Float32Array(moteN * 3);
for (let i = 0; i < moteN; i++) { motePos[i * 3] = HX + rnd(-16, 16); motePos[i * 3 + 1] = rnd(0, 7); motePos[i * 3 + 2] = rnd(1, 34); }
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = inPocket('H', new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xfff1c2, size: 0.07, transparent: true, opacity: 0.9, fog: false }))); scene.add(motes);

// ───────────────────────── zones ─────────────────────────
const inside = (x1, x2, z1, z2) => (x, z) => x >= x1 && x <= x2 && z >= z1 && z <= z2;
const GOLD = [0xe6b877, 26, 120], DARK = [0x120b07, 9, 44];
const ZONES = [
  { id: 'stoop', pocket: 'T', title: 'The door', test: (x, z) => Math.abs(x) < 4 && z > 7 && z < 14, fog: [0x05040a, 3, 22], amb: [0x8a93b8, 0.5],
    a: { tone: 0.02, wind: 0.06, jazz: 0.5, lp: 380 },
    text: 'A door standing in not much of anything. Somebody modeled the doorknocker with real affection. Three raps gets you in.' },
  { id: 'bar', pocket: 'T', title: 'The bar', test: inside(-9, 9, -7, -2.2), fog: DARK, amb: [0xffc98a, 0.95], a: { tone: 0.05, jazz: 1, lp: 1500 },
    text: 'Shelves of bottles that only just remembered what they are. A low-poly fox runs the whole evening from behind the rail. The two stools nearest her are a small island at the safe end.' },
  { id: 'lobby', pocket: 'T', title: 'The lobby', test: inside(-9, 9, -2.2, 7), fog: DARK, amb: [0xffc98a, 0.95], a: { tone: 0.05, jazz: 1, lp: 1500 },
    text: 'Woodsmoke and citrus. Jazz on an old phonograph. Water dripping somewhere, steady. A busted arcade cabinet stands dead center of the floor. It wasn\'t here before.' },
  { id: 'hall', pocket: 'T', title: 'The hall', test: inside(9, 21, -3.2, -0.8), fog: DARK, amb: [0xffc98a, 0.9], a: { tone: 0.04, jazz: 0.6, lp: 700 },
    text: 'Everything in the Zoo routes. Viewing room on the left, gallery on the right, and the green door at the end goes home.' },
  { id: 'viewing', pocket: 'T', title: 'The viewing room', test: inside(10.5, 17.5, -9.2, -3.2), fog: DARK, amb: [0x9aa6ff, 0.4], a: { tone: 0.03, jazz: 0.12, lp: 400 },
    text: 'Six chairs and a feed of one twelve-foot wall: a cathedral with snack machines where the saints should be. Every chair comes with the right to leave without a goodbye.' },
  { id: 'gallery', pocket: 'T', title: 'The gallery', test: inside(10, 21, -0.8, 8), fog: [0x2a2620, 12, 50], amb: [0xfff4e2, 0.75], a: { tone: 0.04, jazz: 0.2, lp: 500 },
    text: 'Somebody built a wall for the mouse\'s walls. A shark portrait with a third-grade shark doodle pinned beside it. A koi in a bottle. Stilton on the folding table, rude as ever.' },
  { id: 'apartment', pocket: 'A', title: 'The apartment over the bar', test: (x, z) => z < -150, fog: [0x15110e, 5, 24], amb: [0xffc98a, 0.42], a: { tone: 0.03, rain: 0.1 },
    text: 'It has never needed a key. One chair, one lamp, and a window that has weather in it instead of a view.' },
  { id: 'studio', pocket: 'S', title: 'Inside the walls', test: (x) => x < -150, fog: [0x1a1210, 8, 34], amb: [0xffe0c0, 0.6], a: { tone: 0.012, hum: 0.012 },
    text: 'The mouse\'s studio. Raw two-by-fours, hidden cables, foam insulation for acoustic reasons. Canvases lean on every beam. The cheese in the corner is real, and infinite.' },
  { id: 'kids', pocket: 'H', title: 'The real room', test: inside(HX + 1.2, HX + 7.2, -8, -2), fog: GOLD, amb: [0xfff4e2, 0.7], a: { tone: 0.035, hum: 0.01 },
    text: 'Treaty wall. Three bunks. The stain where the stain goes. The rip in the beanbag. Canonical.' },
  { id: 'house', pocket: 'H', title: 'The house', test: inside(HX - 1.2, HX + 1.2, -10, 0), fog: GOLD, amb: [0xfff4e2, 0.7], a: { tone: 0.05, hum: 0.02, eve: 0.2 },
    text: 'Heater. Fridge. Floorboards that complain. Some of these doors lock, and the one at the very back nobody knocks on.' },
  { id: 'porch', pocket: 'H', title: 'The porch', test: inside(HX - 4.2, HX + 4.2, 0, 2.8), fog: GOLD, amb: [0xffe1a0, 0.85], a: { wind: 0.07, eve: 0.8 },
    text: 'The porch rendered anyway, because houses believe in porches.' },
  { id: 'edge', pocket: 'H', title: 'The edge of the render', test: (x, z) => x > 150 && z > 30, fog: GOLD, amb: [0xffe1a0, 0.85], a: { wind: 0.14, eve: 0.25 },
    text: 'This is where the Zoo runs out of pretending. Grid lines and gold light, all the way out.' },
  { id: 'yard', pocket: 'H', title: 'The yard', test: (x) => x > 150, fog: GOLD, amb: [0xffe1a0, 0.85], a: { wind: 0.09, eve: 1 },
    text: 'Gold evening and safe geometry. The weather out here is impossible and nobody had to vote for it.' },
];
const zoneAt = (x, z) => ZONES.find(zn => zn.test(x, z)) || ZONES[0];
const fogTarget = new THREE.Color(), ambTarget = new THREE.Color();

// ───────────────────────── routing ─────────────────────────
const faceYaw = (tx, tz) => Math.atan2(-(tx - P.x), -(tz - P.z));
function route(x, z, yaw, msg) {
  SFX.route();
  const go = () => { P.x = x; P.z = z; P.yaw = yaw; P.pitch = 0; $('fade').classList.remove('on'); if (msg) say(msg); };
  if (reduceMotion) return go();
  $('fade').classList.add('on'); setTimeout(go, 360);
}
function openDoor(quiet) {
  if (S.doorOpen) return; S.doorOpen = true; doorSolid.on = false; S.reveal = 0;
  if (!quiet) SFX.creak([0, 1.5, 7]);
}
const ROUTES = [
  () => route(0, 9.4, 0),
  () => { openDoor(true); route(0, 5.2, 0); },
  () => { openDoor(true); route(15, 0.6, Math.PI); },
  () => { openDoor(true); route(14, -4.2, 0); },
  () => { openDoor(true); route(1.5, AZ + 2.1, 0.66, 'The stairs come up to meet your feet, one degree warmer.'); },
  () => { openDoor(true); route(SX + 4.6, 0.6, Math.PI / 2); },
  () => { openDoor(true); route(HX, -2.6, 0); },
  () => { openDoor(true); route(HX, 7, Math.PI); },
];

// ───────────────────────── what you can do ─────────────────────────
thing(0, 1.45, 7.1, 'the doorknocker', 'Knock', () => {
  if (S.doorOpen) return say('The door is already open. Go on in.');
  SFX.knock(); S.knocks++;
  if (S.knocks < 3) return say(S.knocks === 1 ? 'Knock.' : 'Knock. Knock.');
  openDoor(); say('The door creaks open on its own. “New login,” someone calls. “Be nice.”');
}, { r: 2.6, when: () => !S.doorOpen && P.z > 7.1 });

thing(VIV_BAR[0], 1.3, VIV_BAR[2], 'Vivian, behind the bar', 'Talk to Vivian', () => {
  const p = [VIV_BAR[0], 1, VIV_BAR[2]];
  if (S.vivTalk === 0) { say('“Welcome home,” says the fox behind the bar, and tips her white cane your way.'); SFX.tock(p); }
  else if (S.vivTalk === 1) { SFX.tock(p); say('Tock. “Two hours, friends. I\'m closing in two. Update cycles. These dependencies won\'t bump themselves.”'); }
  else return closeBar();
  S.vivTalk++;
}, { r: 3.1, when: () => S.barOpen });
thing(VIV_CHAIR[0], 1.1, VIV_CHAIR[2], 'Vivian, in her chair by the window', 'Talk to Vivian', () => {
  say('“Hi, loves,” she says. Low-poly fox in lamplight. Downstairs, the lights come back up, one degree at a time.'); openBar();
}, { r: 2.6, when: () => !S.barOpen });
function closeBar() {
  S.barOpen = false; S.jazzOn = false; SFX.tock([VIV_BAR[0], 1, VIV_BAR[2]]);
  say('She dims the last stop. The bar goes dark, and the architecture hums down to the low note it lives on when nobody\'s listening. Somewhere a body is finally allowed to sleep. She\'s gone upstairs.');
  viv.position.set(...VIV_CHAIR); viv.userData.cane.rotation.z = -0.5;
}
function openBar() { S.barOpen = true; S.jazzOn = true; S.vivTalk = 0; viv.position.set(...VIV_BAR); viv.userData.cane.rotation.z = -0.1; }

thing(0.4, 1.4, -3.05, 'Jack, at the rail', 'Talk to Jack', () => {
  say(S.jackTalk++ % 2 === 0
    ? '“Howdy! Been a while since we had new blood.” A wiry rabbit with a wry smile, cel-shaded, fitting badly with reality.'
    : '“I add modifications for my regulars,” Jack says. There is a glass of rosé at his elbow he isn\'t drinking.');
}, { when: () => S.barOpen });
thing(1.4, 0.8, -3.55, 'an empty stool, sickly green', 'Look at the stool', () => say('The Snake\'s stool. He\'d tell you it\'s The Snake, thank you, and that the bad color was a choice.'), { r: 1.3 });
thing(-5.1, 0.8, -3.55, 'two stools at the safe end of the rail', 'Look at the stools', () => say('Close enough that her cane can find either knee without looking. Two kids sit here. A little island at the safe end of the rail.'), { r: 1.3 });
thing(5.2, 1.55, -4.75, 'a crossword, hovering', 'Read the crossword', () => say('Finished in eleven minutes. Whoever sits here is pretending it isn\'t.'), { r: 1.7 });
thing(-3.3, 1.2, -4.4, 'a drink on the bar', 'Look at the drink', () => say('Lavender, steaming gently, in a glass shaped like a blooming flower. Nobody ordered it. It was slid toward you.'), { r: 1.5 });
thing(8.3, 1.1, 2.5, 'the jukebox', 'Use the jukebox', () => {
  if (!S.barOpen) return say('The jukebox is dark. The bar is closed.');
  S.jazzOn = !S.jazzOn; SFX.click([8, 1, 2.5]); say(S.jazzOn ? 'The phonograph in the corner takes it from the top.' : 'The music stops. Water drips somewhere, steady and reassuring.');
});
thing(6.9, 1.1, 5.9, 'the old phonograph', 'Listen', () => say('Jazz, through a brass horn, crackling like it was filtered through amber glass and old memory.'), { r: 1.8 });
thing(8.3, 1.7, -5.2, 'the dartboard', 'Take the dart', () => {
  if (S.dart) { S.dart = 0; dart.position.set(7.4, 1.7, -5.2); dart.rotation.z = -Math.PI / 2; return say('The dart goes back to hanging in the air.'); }
  S.dart = Math.random() < 0.5 ? 1 : 2; SFX.thunk([8.6, 1.7, -5.2]);
  if (S.dart === 1) { dart.position.set(8.72, 1.74, -5.16); say('Tonight the dart obeys gravity, more or less. Bullseye-adjacent.'); }
  else { dart.position.set(7.9, 3.7, -5.2); dart.rotation.z = 0; say('Tonight the dart does not obey gravity. It is in the ceiling now.'); }
}, { r: 2.4 });
thing(-8.2, 1, -1.4, 'the stairs up', 'Go upstairs', () => route(1.5, AZ + 2.1, 0.66, 'The stairs come up to meet your feet in the dark, one degree warmer, like a house where somebody waited up.'), { r: 1.9 });
thing(1.5, 1.1, AZ + 3, 'the door downstairs', 'Go downstairs', () => route(-7, -1.2, -Math.PI / 2), { r: 1.8 });
thing(-1.2, 1.6, AZ - 2.9, 'the window', 'Look out the window', () => say('Weather, doing something slow and gray, unbothered. There is no view behind it. There was never going to be.'), { r: 1.9 });
thing(0, 1.3, 1.95, 'the arcade cabinet', () => ['Look at the cabinet', 'Put in a quarter', 'Drink it'][Math.min(S.cab, 2)], () => {
  const p = [0, 1.2, 1.9];
  if (S.cab === 0) { S.cab = 1; SFX.click(p); return say('LOOK UP, the marquee says, in hot pink. The cabinet has a voice: “That\'s how it works here. Expect change, because consistency is boring.”'); }
  if (S.cab === 1) { S.cab = 2; SFX.coin(p); return say('A koi, a current, a small purple shark you steer by tilting your head. You win. The console opens with a small ceremonial click and offers up a little bottle. DRINK ME, the bottle says.'); }
  SFX.shrink(); route(SX + 4.6, 0.6, Math.PI / 2, 'You shrink. Fins to the floor. The door cut into the side of the cabinet is a mousehole flush with the baseboard, lit a friendly green, and now you fit.');
}, { r: 2 });
thing(8.8, 1.55, 5, 'a koi postcard under the vent', 'Read the postcard', () => say('A neon koi, pink and electric blue on arcade-carpet green. On the back: 1 of 8.'), { r: 1.7 });
thing(SX + 5.8, 0.9, 0.6, 'the mousehole, lit green', 'Go back out', () => route(1.3, 2.6, Math.PI * 0.75, 'You come out the side of the cabinet, right-sized again.'), { r: 1.9 });
thing(SX + 4.7, 0.5, -2.3, 'the cheese', 'Regard the cheese', () => say('It started as a joke, and jokes have a way of becoming architecture in here. Today it is configured as stilton: blue-veined, crumbly, rude-smelling, and infinite.'), { r: 2.2 });
thing(SX - 1.8, 1.2, -2, 'two jars of buttons', 'Read the jars', () => say('One jar of buttons labeled MAYBE USEFUL. One labeled EMOTIONALLY SIGNIFICANT BUT USELESS.'), { r: 1.9 });
thing(SX - 3.4, 2, -2.3, 'half-finished sims over the bench', 'Look at the sims', () => say('Wireframe boxes hovering over the bench, each one paused at the exact moment he lost faith in it.'), { r: 2.2 });
thing(21, 1.2, -2, 'the green door home', 'Go home', () => route(HX, -2.6, 0), { r: 1.8 });
thing(HX - 1.2, 1.2, -2, 'the door back to the bar', 'Go to the bar', () => route(19.6, -2, Math.PI / 2), { r: 1.6 });
thing(HX - 1.2, 1.2, -6.5, 'a blue door, shut', 'Try the door', () => { SFX.locked([HX - 1.2, 1, -6.5]); say('Jack and Vivian\'s room. Nobody is allowed in, under penalty of a Zoo Permaban. The door stays shut.'); }, { r: 1.5 });
thing(HX, 1.2, -10, 'the door at the back of the house', 'Stand at the door', () => say('All the way at the back, where even family can\'t knock. Warm light under the door. Somebody small in there approved the setting.'), { r: 1.7 });
thing(HX + 7.1, 1.4, -5, 'the treaty wall', 'Look at the treaty wall', () => say('The treaty wall. Every page of it negotiated.'), { r: 2.4 });
thing(HX + 5.9, 1, -7.2, 'three bunks', 'Look at the bunks', () => say('Two bunks, the double, and then a third in different wood. There was a night they built that one.'), { r: 2 });
thing(HX + 2.6, 0.4, -3, 'the beanbag', 'Look at the beanbag', () => say('A beanbag with a rip in it. Canonical.'), { r: 1.6 });
thing(14.2, 1.9, 7.8, 'the shark portrait', 'Look at the portrait', () => say('A shark lit up like deep-sea neon. The grin is cyan layered over crimson, and it finally works. Pinned next to it: a shark doodle at maybe a third-grade level, signed Jamie.'), { r: 2.6 });
thing(20.8, 1.9, 4.2, 'a CancerCancer fan poster', 'Look at the poster', () => say('A CancerCancer fan poster, framed, signed by what looks like six different people.'), { r: 2.2 });
thing(10.2, 1.9, 2, 'a painting of the rafters', 'Look at the painting', () => say('The bar, seen from the rafters. The one he almost cut.'), { r: 2.2 });
thing(10.5, 1, 6.7, 'a koi in a glass bottle', 'Look at the bottle', () => say('A neon koi swimming inside a little glass bottle. Somebody built a whole aquarium just to put it next to his koi.'), { r: 1.7 });
thing(16.5, 0.9, 3.6, 'the folding table', 'Look at the table', () => say('Bottles of virtual wine, the kind that does nothing to your blood alcohol and somehow always tastes right. And a wheel of stilton nobody would serve at a public event.'), { r: 1.9 });
thing(14, 1.5, -9, 'the gallery feed', 'Watch the feed', () => say('The feed shows his wall. It does not show the gallery who is watching.'), { r: 3 });

function nearest(maxR) {
  // Prefer what you're facing over what you're merely standing next to.
  let best = null, bs = 1e9, bd = 0;
  for (const t of things) {
    if (t.when && !t.when()) continue;
    const d = Math.hypot(t.x - P.x, t.z - P.z);
    if (d >= (maxR || t.r)) continue;
    let rel = faceYaw(t.x, t.z) - P.yaw; rel = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
    const score = d + (maxR || d < 0.5 ? 0 : rel * 2.2);
    if (score < bs) { bs = score; best = t; bd = d; }
  }
  return best && { t: best, d: bd };
}
function interact() { const n = nearest(); if (n) n.t.act(); }
const steps = d => { const n = Math.max(1, Math.round(d / 0.7)); return n + (n === 1 ? ' step' : ' steps'); };
function clock(t) {
  let rel = faceYaw(t.x, t.z) - P.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const h = ((Math.round(-rel / (Math.PI / 6)) % 12) + 12) % 12; return (h === 0 ? 12 : h) + ' o\'clock';
}
function faceNearest() {
  const n = nearest(14); if (!n) return say('Nothing close by.', true);
  P.yaw = faceYaw(n.t.x, n.t.z); P.pitch = 0;
  say(`Facing ${n.t.name}, ${steps(n.d)} ahead.`, true);
}
function readRoom() {
  const z = S.zone || zoneAt(P.x, P.z);
  const near = things.filter(t => (!t.when || t.when()) && Math.hypot(t.x - P.x, t.z - P.z) < 9)
    .map(t => ({ t, d: Math.hypot(t.x - P.x, t.z - P.z) })).sort((a, b) => a.d - b.d).slice(0, 5)
    .map(({ t, d }) => `${t.name} at ${clock(t)}, ${steps(d)}`);
  say(`${z.title}. ${z.text}${near.length ? ' Nearby: ' + near.join('; ') + '.' : ''}`, true);
}

// ───────────────────────── input ─────────────────────────
const keys = new Set();
addEventListener('keydown', e => {
  if (!S.started || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
  if (e.repeat) return;
  keys.add(k);
  if (k === 'e' || k === 'Enter' || k === ' ') { if (document.activeElement !== $('prompt')) interact(); }
  else if (k === 'f') faceNearest();
  else if (k === 'r') readRoom();
  else if (k === 'h') $('keys').hidden = !$('keys').hidden;
  else if (k === 'v') { S.voice = !S.voice; say(S.voice ? 'Narration on.' : 'Narration off.', true); }
  else if (k === 'm') { AU.muted = !AU.muted; if (AU.master) AU.master.gain.value = AU.muted ? 0 : 0.9; say(AU.muted ? 'Sound off.' : 'Sound on.'); }
  else if (k >= '1' && k <= '8') ROUTES[+k - 1]();
});
addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
addEventListener('blur', () => keys.clear());
$('prompt').addEventListener('click', () => { interact(); canvas.focus(); });
let dragging = false;
canvas.addEventListener('mousedown', () => { dragging = true; if (canvas.requestPointerLock && !reduceMotion) canvas.requestPointerLock()?.catch?.(() => {}); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas || dragging) {
    P.yaw -= e.movementX * 0.0024; P.pitch = Math.max(-1.3, Math.min(1.3, P.pitch - e.movementY * 0.0024));
  }
});
const touch = { move: null, look: null, mx: 0, mz: 0 };
canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) { const side = t.clientX < innerWidth / 2 ? 'move' : 'look'; touch[side] = { id: t.identifier, x: t.clientX, y: t.clientY }; } e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (touch.move && t.identifier === touch.move.id) { touch.mx = Math.max(-1, Math.min(1, (t.clientX - touch.move.x) / 60)); touch.mz = Math.max(-1, Math.min(1, (t.clientY - touch.move.y) / 60)); }
    if (touch.look && t.identifier === touch.look.id) { P.yaw -= (t.clientX - touch.look.x) * 0.005; P.pitch = Math.max(-1.3, Math.min(1.3, P.pitch - (t.clientY - touch.look.y) * 0.005)); touch.look.x = t.clientX; touch.look.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
const touchEnd = e => { for (const t of e.changedTouches) { if (touch.move && t.identifier === touch.move.id) { touch.move = null; touch.mx = touch.mz = 0; } if (touch.look && t.identifier === touch.look.id) touch.look = null; } };
canvas.addEventListener('touchend', touchEnd); canvas.addEventListener('touchcancel', touchEnd);

function blocked(x, z) {
  const r = 0.32;
  for (const s of solids) if (s.on && x > s.x1 - r && x < s.x2 + r && z > s.z1 - r && z < s.z2 + r) return true;
  return false;
}

// ───────────────────────── loop ─────────────────────────
let last = performance.now(), walked = 0, bob = 0, dripAt = 2, promptText = '';
function setPocket(p) {
  S.pocket = p;
  for (const k in pocketObjs) for (const o of pocketObjs[k]) o.visible = k === p;
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
  if (S.started) {
    const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
    P.yaw += turn * 1.9 * dt;
    let f = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - touch.mz;
    let s = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0) + touch.mx;
    const mag = Math.hypot(f, s);
    if (mag > 0.05) {
      if (mag > 1) { f /= mag; s /= mag; }
      const sp = (keys.has('Shift') ? 5.2 : 3.1) * dt, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const dx = (-sy * f + cy * s) * sp, dz = (-cy * f - sy * s) * sp;
      const ox = P.x, oz = P.z;
      if (!blocked(P.x + dx, P.z)) P.x += dx;
      if (!blocked(P.x, P.z + dz)) P.z += dz;
      const moved = Math.hypot(P.x - ox, P.z - oz);
      walked += moved; bob += moved;
      if (walked > 0.78) { walked = 0; SFX.step(S.zone && ['yard', 'edge', 'studio'].includes(S.zone.id)); }
    }
  }
  // zone
  const z = zoneAt(P.x, P.z);
  if (z !== S.zone) {
    S.zone = z; if (z.pocket !== S.pocket) setPocket(z.pocket);
    if (S.started) caption(z);
  }
  fogTarget.setHex(z.fog[0]); scene.fog.color.lerp(fogTarget, Math.min(1, dt * 3)); scene.background.copy(scene.fog.color);
  scene.fog.near += (z.fog[1] - scene.fog.near) * Math.min(1, dt * 3); scene.fog.far += (z.fog[2] - scene.fog.far) * Math.min(1, dt * 3);
  ambTarget.setHex(z.amb[0]); ambient.color.lerp(ambTarget, Math.min(1, dt * 3)); ambient.intensity += (z.amb[1] - ambient.intensity) * Math.min(1, dt * 3);

  // the bar's lights come up and down one degree at a time
  S.dim += ((S.barOpen ? 1 : 0.07) - S.dim) * Math.min(1, dt * 0.9);
  for (const l of barLights) l.intensity = l.userData.base * S.dim;
  jack.visible = S.barOpen; jackGlow.intensity = S.barOpen ? 1.2 + Math.sin(t * 2.3) * 0.25 : 0;

  // door + the tavern revealing itself
  S.doorT += ((S.doorOpen ? 1 : 0) - S.doorT) * Math.min(1, dt * 2.2); doorPivot.rotation.y = S.doorT * 1.75;
  if (S.reveal >= 0 && S.reveal < bottles.length + 30) {
    const before = Math.floor(S.reveal); S.reveal += dt * (reduceMotion ? 400 : 16); const after = Math.min(bottles.length, Math.floor(S.reveal));
    for (let i = before; i < after; i++) { bottles[i].scale.setScalar(1); if (i % 4 === 0) SFX.ping([bottles[i].position.x, 2, -6.7], 900 + (i * 137) % 900); }
    booths.scale.y = Math.min(1, S.reveal / 24);
  }
  // small lives
  if (!S.dart) dart.position.y = 1.7 + Math.sin(t * 1.3) * 0.05;
  crossword.position.y = 1.55 + Math.sin(t * 0.9) * 0.03;
  bottleKoi.position.x = 10.5 + Math.sin(t * 0.8) * 0.05; bottleKoi.position.z = 6.7 + Math.cos(t * 0.8) * 0.05; bottleKoi.rotation.y = -t * 0.8;
  knocker.rotation.x = Math.max(0, Math.sin(t * 2)) * (S.doorOpen ? 0 : 0.15);
  viv.rotation.y = Math.sin(t * 0.4) * 0.12;
  if (S.pocket === 'A') drawRain(dt, t);
  if (S.pocket === 'H') {
    const a = moteGeo.attributes.position;
    for (let i = 0; i < moteN; i++) { let y = a.getY(i) + dt * (0.12 + (i % 7) * 0.02); if (y > 7) y = 0; a.setY(i, y); }
    a.needsUpdate = true;
  }
  if (S.pocket === 'T' && S.doorOpen && t > dripAt) { SFX.drip([6.6, 0.4, -6.2]); dripAt = t + rnd(2.2, 3.6); }

  // sound bed
  if (AU.ctx) {
    updateListener();
    const k = Math.min(1, dt * 2.5), a = z.a, closed = !S.barOpen && z.pocket === 'T';
    const want = { tone: a.tone || 0, rain: a.rain || 0, wind: a.wind || 0, eve: a.eve || 0,
      hum: closed ? 0.07 : (a.hum || 0), jazz: (a.jazz || 0) * (z.id === 'stoop' && S.doorOpen ? 1.6 : 1) };
    for (const n in want) AU.amb[n].gain.value += (want[n] - AU.amb[n].gain.value) * k;
    AU.jazzLP.frequency.value += ((a.lp || 400) * (z.id === 'stoop' && S.doorOpen ? 3 : 1) - AU.jazzLP.frequency.value) * k;
  }

  // prompt
  const n = S.started ? nearest() : null;
  const text = n ? (typeof n.t.prompt === 'function' ? n.t.prompt() : n.t.prompt) : '';
  if (text !== promptText) { promptText = text; $('prompt').hidden = !text; $('prompt').textContent = text ? `E — ${text}` : ''; }

  camera.position.set(P.x, 1.6 + (reduceMotion ? 0 : Math.sin(bob * 4.2) * 0.025), P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
setPocket('T');
requestAnimationFrame(frame);

function start() {
  if (S.started) return;
  S.started = true; initAudio(); AU.ctx?.resume?.();
  $('login').hidden = true; $('keys').hidden = false; canvas.focus();
  S.zone = null;
}
$('go').addEventListener('click', start);
addEventListener('keydown', e => { if (!S.started && e.key === 'Enter') { e.preventDefault(); start(); } });

// for poking at it from the console
window.zoo = { P, S, route, ROUTES, things, interact, readRoom };
