'use strict';
// ============================================================
//  LANTERNFALL — core: canvas, utils, input, UI, scripting, audio
// ============================================================
const W = 640, H = 480, TS = 32, VW = 20, VH = 15;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let SCALE = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  SCALE = s;
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.round(W * s * DPR);
  cv.height = Math.round(H * s * DPR);
}
window.addEventListener('resize', resize);
resize();

// ---------- utils ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function weighted(list, r = Math.random()) {
  let tot = 0; for (const it of list) tot += it.w;
  let v = r * tot;
  for (const it of list) { v -= it.w; if (v <= 0) return it; }
  return list[list.length - 1];
}
function shade(hex, amt) { // amt -1..1
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function rgba(hex, a) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  return `rgba(${parseInt(c.substr(0, 2), 16)},${parseInt(c.substr(2, 2), 16)},${parseInt(c.substr(4, 2), 16)},${a})`;
}

// ---------- input ----------
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'ok', Space: 'ok', KeyZ: 'ok', KeyE: 'ok', NumpadEnter: 'ok',
  Escape: 'cancel', KeyX: 'cancel', Backspace: 'cancel', KeyQ: 'cancel', KeyC: 'cancel',
  KeyM: 'mute', ShiftLeft: 'run', ShiftRight: 'run'
};
const ACTIONS = ['up', 'down', 'left', 'right', 'ok', 'cancel', 'mute', 'run'];
const REPEAT = new Set(['up', 'down', 'left', 'right']);
const Input = {
  down: {}, vdown: {}, tapped: {}, hold: {}, fired: {}, anyKey: false,
  update(dt) {
    for (const a of ACTIONS) {
      const d = this.down[a] || this.vdown[a] || this.tapped[a];
      if (d) {
        const h = this.hold[a] || 0, nh = h + dt;
        const R0 = 0.3, RI = 0.08;
        this.fired[a] = h === 0 || (REPEAT.has(a) && nh > R0 && Math.floor((nh - R0) / RI) > Math.floor(Math.max(0, h - R0) / RI));
        this.hold[a] = nh;
      } else { this.fired[a] = false; this.hold[a] = 0; }
      this.tapped[a] = false;
    }
  },
  p(a) { return !!this.fired[a]; },
  h(a) { return !!(this.down[a] || this.vdown[a]); },
  clear() { for (const a of ACTIONS) this.fired[a] = false; }
};
window.addEventListener('keydown', e => {
  const a = KEYMAP[e.code];
  Audio_.unlock();
  if (a) {
    e.preventDefault();
    if (!Input.down[a]) Input.tapped[a] = true;
    Input.down[a] = true;
  }
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) Input.down[a] = false; });
window.addEventListener('blur', () => { Input.down = {}; Input.vdown = {}; });

// touch controls
(function setupTouch() {
  const pad = document.getElementById('touch');
  if (!pad) return;
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  pad.style.display = 'block';
  pad.querySelectorAll('[data-a]').forEach(el => {
    const a = el.dataset.a;
    const on = e => { e.preventDefault(); Audio_.unlock(); if (!Input.vdown[a]) Input.tapped[a] = true; Input.vdown[a] = true; el.classList.add('on'); };
    const off = e => { e.preventDefault(); Input.vdown[a] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  });
})();

// ---------- timers / tweens ----------
const Timers = [];
function wait(ms) { return new Promise(res => Timers.push({ t: ms / 1000, res })); }
function updateTimers(dt) {
  for (let i = Timers.length - 1; i >= 0; i--) {
    Timers[i].t -= dt;
    if (Timers[i].t <= 0) { const r = Timers[i].res; Timers.splice(i, 1); r(); }
  }
}
const Fade = { v: 0, target: 0, speed: 3, color: '#000', res: null };
function fadeTo(v, ms = 350, color = '#000') {
  Fade.target = v; Fade.speed = 1 / Math.max(0.01, ms / 1000); Fade.color = color;
  return new Promise(res => { Fade.res = res; if (Fade.v === v) { Fade.res = null; res(); } });
}
function updateFade(dt) {
  if (Fade.v !== Fade.target) {
    const d = Fade.speed * dt;
    Fade.v = Fade.v < Fade.target ? Math.min(Fade.target, Fade.v + d) : Math.max(Fade.target, Fade.v - d);
    if (Fade.v === Fade.target && Fade.res) { const r = Fade.res; Fade.res = null; r(); }
  }
}

// ---------- scripting ----------
const Script = { running: 0 };
async function runScript(fn) {
  Script.running++;
  try { await fn(); } catch (e) { console.error(e); }
  finally { Script.running--; }
}

// ---------- UI stack ----------
const UI = {
  stack: [],
  push(c) { return new Promise(res => { c._res = res; this.stack.push(c); }); },
  close(c, v) { const i = this.stack.indexOf(c); if (i >= 0) this.stack.splice(i, 1); if (c._res) c._res(v); },
  top() { for (let i = this.stack.length - 1; i >= 0; i--) if (!this.stack[i].passive) return this.stack[i]; return null; },
  update(dt) {
    for (const c of this.stack) if (c.tick) c.tick(dt);
    const t = this.top();
    if (t) { t.update(dt); Input.clear(); return true; }
    return false;
  },
  draw(g) { for (const c of this.stack) c.draw(g); }
};

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
function font(px, bold = false, fam = FONT) { return `${bold ? 'bold ' : ''}${px}px ${fam}`; }

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function drawWindow(g, x, y, w, h, alpha = 0.94) {
  g.save();
  g.globalAlpha = alpha;
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#2b4bb8'); gr.addColorStop(1, '#0c1650');
  roundRect(g, x, y, w, h, 7); g.fillStyle = gr; g.fill();
  g.globalAlpha = 1;
  g.lineWidth = 3; g.strokeStyle = '#e9eefc'; g.stroke();
  roundRect(g, x + 3.5, y + 3.5, w - 7, h - 7, 5); g.lineWidth = 1; g.strokeStyle = 'rgba(120,150,255,.55)'; g.stroke();
  g.restore();
}
function text(g, s, x, y, o = {}) {
  g.font = o.font || font(o.size || 16, o.bold, o.fam);
  g.textAlign = o.align || 'left';
  g.textBaseline = o.base || 'top';
  if (o.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(s, x + 1.5, y + 1.5); }
  g.fillStyle = o.color || '#fff';
  g.fillText(s, x, y);
}
function wrapText(g, s, maxW, f) {
  g.font = f;
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
function drawCursor(g, x, y, t = performance.now() / 1000) {
  const o = Math.sin(t * 8) * 2;
  g.save(); g.translate(x + o, y);
  g.beginPath(); g.moveTo(-10, -7); g.lineTo(2, 0); g.lineTo(-10, 7); g.lineTo(-7, 0); g.closePath();
  g.fillStyle = '#fff'; g.strokeStyle = '#223'; g.lineWidth = 1.5; g.fill(); g.stroke();
  g.restore();
}
function bar(g, x, y, w, h, v, col, back = 'rgba(0,0,0,.5)') {
  g.fillStyle = back; g.fillRect(x, y, w, h);
  g.fillStyle = col; g.fillRect(x, y, w * clamp(v, 0, 1), h);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

// Dialog box with typewriter + optional choices
class Dialog {
  constructor(name, msg, opts = {}) {
    this.name = name; this.opts = opts;
    this.f = font(17);
    this.pages = [];
    const lines = wrapText(ctx, msg, W - 80, this.f);
    for (let i = 0; i < lines.length; i += 3) this.pages.push(lines.slice(i, i + 3));
    this.page = 0; this.chars = 0; this.choices = opts.choices || null; this.ci = 0;
    this.top = !!opts.top; this.speed = opts.speed || 55;
  }
  get pageText() { return this.pages[this.page].join('\n'); }
  done() { return this.chars >= this.pageText.length; }
  update(dt) {
    const before = Math.floor(this.chars);
    this.chars = Math.min(this.pageText.length, this.chars + dt * this.speed);
    if (Math.floor(this.chars) !== before && Math.floor(this.chars) % 3 === 0) Audio_.sfx('blip');
    const last = this.page === this.pages.length - 1;
    if (this.choices && last && this.done()) {
      if (Input.p('up')) { this.ci = (this.ci + this.choices.length - 1) % this.choices.length; Audio_.sfx('cursor'); }
      if (Input.p('down')) { this.ci = (this.ci + 1) % this.choices.length; Audio_.sfx('cursor'); }
      if (Input.p('ok')) { Audio_.sfx('ok'); UI.close(this, this.ci); }
      else if (Input.p('cancel') && this.opts.cancel !== undefined) { Audio_.sfx('cancel'); UI.close(this, this.opts.cancel); }
      return;
    }
    if (Input.p('ok') || Input.p('cancel')) {
      if (!this.done()) this.chars = this.pageText.length;
      else if (!last) { this.page++; this.chars = 0; Audio_.sfx('cursor'); }
      else UI.close(this, 0);
    }
  }
  draw(g) {
    const h = 104, y = this.top ? 12 : H - h - 12, x = 12, w = W - 24;
    drawWindow(g, x, y, w, h);
    if (this.name) {
      g.font = font(15, true);
      const nw = g.measureText(this.name).width + 22;
      drawWindow(g, x + 10, y - 22, nw, 28);
      text(g, this.name, x + 21, y - 15, { size: 15, bold: true, color: '#ffe9a8' });
    }
    const lines = this.pageText.slice(0, Math.floor(this.chars)).split('\n');
    lines.forEach((l, i) => text(g, l, x + 22, y + 16 + i * 26, { font: this.f }));
    const last = this.page === this.pages.length - 1;
    if (this.done() && !(this.choices && last)) {
      const t = performance.now() / 1000;
      g.fillStyle = '#fff'; g.beginPath();
      const by = y + h - 18 + Math.sin(t * 6) * 2;
      g.moveTo(x + w - 26, by); g.lineTo(x + w - 16, by); g.lineTo(x + w - 21, by + 6); g.fill();
    }
    if (this.choices && last && this.done()) {
      g.font = font(16);
      const cw = Math.max(...this.choices.map(c => g.measureText(c).width)) + 50;
      const ch = this.choices.length * 26 + 18;
      const cx = W - cw - 18, cy = y - ch - 8;
      drawWindow(g, cx, cy, cw, ch);
      this.choices.forEach((c, i) => text(g, c, cx + 32, cy + 10 + i * 26));
      drawCursor(g, cx + 24, cy + 19 + this.ci * 26);
    }
  }
}
function say(name, msg, opts) { return UI.push(new Dialog(name, msg, opts)); }
function narrate(msg, opts = {}) { return UI.push(new Dialog(null, msg, opts)); }
function choose(name, msg, choices, cancel) { return UI.push(new Dialog(name, msg, { choices, cancel })); }
async function sayAll(lines) { for (const [n, m] of lines) await say(n, m); }

// Generic list menu
class ListMenu {
  constructor(o) {
    Object.assign(this, { x: 20, y: 20, w: 200, rows: 8, rowH: 26, title: null, cancel: true, index: 0, items: [], scroll: 0, size: 16 }, o);
    this.index = clamp(this.index, 0, Math.max(0, this.items.length - 1));
    this.fixScroll();
  }
  get h() { return Math.min(this.rows, Math.max(1, this.items.length)) * this.rowH + 20 + (this.title ? 26 : 0); }
  fixScroll() {
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.rows) this.scroll = this.index - this.rows + 1;
  }
  update() {
    const n = this.items.length;
    if (n && Input.p('up')) { this.index = (this.index + n - 1) % n; Audio_.sfx('cursor'); this.fixScroll(); this.onChange && this.onChange(this.index); }
    if (n && Input.p('down')) { this.index = (this.index + 1) % n; Audio_.sfx('cursor'); this.fixScroll(); this.onChange && this.onChange(this.index); }
    if (this.lr && n) {
      if (Input.p('left')) { this.lr(this.index, -1); }
      if (Input.p('right')) { this.lr(this.index, 1); }
    }
    if (Input.p('ok') && n) {
      const it = this.items[this.index];
      if (it.disabled) { Audio_.sfx('buzz'); return; }
      Audio_.sfx('ok'); UI.close(this, this.index);
    } else if (Input.p('cancel') && this.cancel) { Audio_.sfx('cancel'); UI.close(this, -1); }
  }
  draw(g) {
    const active = UI.top() === this;
    drawWindow(g, this.x, this.y, this.w, this.h);
    let y0 = this.y + 10;
    if (this.title) { text(g, this.title, this.x + 16, y0, { size: 15, bold: true, color: '#ffe9a8' }); y0 += 26; }
    const end = Math.min(this.items.length, this.scroll + this.rows);
    for (let i = this.scroll; i < end; i++) {
      const it = this.items[i], yy = y0 + (i - this.scroll) * this.rowH;
      const col = it.disabled ? '#8792b8' : (it.color || '#fff');
      text(g, it.label, this.x + 30, yy + 3, { size: this.size, color: col });
      if (it.right !== undefined) text(g, String(it.right), this.x + this.w - 16, yy + 3, { size: this.size, color: it.disabled ? '#8792b8' : (it.rcolor || '#dfe6ff'), align: 'right' });
      if (i === this.index) {
        if (active) drawCursor(g, this.x + 24, yy + 12);
        else { g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(this.x + 8, yy, this.w - 16, this.rowH - 2); }
      }
    }
    if (this.scroll > 0) { g.fillStyle = '#fff'; g.beginPath(); const cx = this.x + this.w / 2; g.moveTo(cx - 6, this.y + 8); g.lineTo(cx + 6, this.y + 8); g.lineTo(cx, this.y + 2); g.fill(); }
    if (end < this.items.length) { g.fillStyle = '#fff'; g.beginPath(); const cx = this.x + this.w / 2, by = this.y + this.h - 8; g.moveTo(cx - 6, by); g.lineTo(cx + 6, by); g.lineTo(cx, by + 6); g.fill(); }
    if (this.help && active) {
      const s = this.help(this.index);
      if (s) { drawWindow(g, 12, 12, W - 24, 40); text(g, s, 28, 23, { size: 15 }); }
    }
  }
}
function listMenu(o) { return UI.push(new ListMenu(o)); }

// passive panel drawing a callback
class Panel {
  constructor(fn) { this.fn = fn; this.passive = true; }
  update() { }
  draw(g) { this.fn(g); }
}
function openPanel(fn) { const p = new Panel(fn); UI.stack.push(p); return p; }
function closePanel(p) { UI.close(p); }

// Toast (short message top)
const Toasts = [];
function toast(msg) { Toasts.push({ msg, t: 2.2 }); }
function drawToasts(g, dt) {
  for (let i = Toasts.length - 1; i >= 0; i--) { Toasts[i].t -= dt; if (Toasts[i].t <= 0) Toasts.splice(i, 1); }
  Toasts.forEach((t, i) => {
    g.save(); g.globalAlpha = clamp(t.t * 2, 0, 1);
    g.font = font(15);
    const w = g.measureText(t.msg).width + 30;
    drawWindow(g, (W - w) / 2, 14 + i * 40, w, 34);
    text(g, t.msg, W / 2, 23 + i * 40, { size: 15, align: 'center' });
    g.restore();
  });
}

// ---------- AUDIO (WebAudio chiptune) ----------
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return 0;
  let s = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (parseInt(m[3]) + 1) * 12 + s;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseSeq(str) {
  const out = [];
  for (const tok of str.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
    const [n, d] = tok.split(':');
    out.push({ n, d: parseInt(d || '4') });
  }
  return out;
}
function pump(roots, pattern = 'oct') {
  // build bass line: each root fills one bar (16 steps) of eighth notes alternating root/octave
  const parts = [];
  for (const r of roots) {
    const m = /^([A-G][#b]?)(\d)$/.exec(r);
    const hi = m[1] + (parseInt(m[2]) + 1);
    if (pattern === 'oct') for (let i = 0; i < 8; i++) parts.push((i % 2 ? hi : r) + ':2');
    else if (pattern === 'half') parts.push(r + ':8', hi + ':8');
    else parts.push(r + ':16');
  }
  return parts.join(' ');
}
const TRACKS = {
  title: {
    bpm: 84, voices: [
      { w: 'square', g: 0.045, s: 'E4:4 G4:4 C5:8 | B4:4 C5:2 D5:2 E5:8 | D5:4 C5:4 A4:8 | G4:12 r:4 | E4:4 G4:4 C5:8 | B4:4 C5:2 D5:2 E5:6 G5:2 | F5:4 E5:4 D5:4 B4:4 | C5:16' },
      { w: 'triangle', g: 0.13, s: 'C3:8 G2:8 | E3:8 C3:8 | F2:8 A2:8 | G2:8 D3:8 | C3:8 G2:8 | E3:8 B2:8 | F2:8 G2:8 | C3:16' },
      { w: 'triangle', g: 0.05, s: 'G4:2 C5:2 E5:2 C5:2 G4:2 C5:2 E5:2 C5:2 | G4:2 B4:2 E5:2 B4:2 G4:2 B4:2 E5:2 B4:2 | A4:2 C5:2 F5:2 C5:2 A4:2 C5:2 F5:2 C5:2 | G4:2 B4:2 D5:2 B4:2 G4:2 B4:2 D5:2 B4:2 | G4:2 C5:2 E5:2 C5:2 G4:2 C5:2 E5:2 C5:2 | G4:2 B4:2 E5:2 B4:2 G4:2 B4:2 E5:2 B4:2 | A4:2 C5:2 F5:2 C5:2 G4:2 B4:2 D5:2 B4:2 | G4:2 C5:2 E5:2 G5:2 E5:2 C5:2 G4:4' }
    ]
  },
  world: {
    bpm: 118, voices: [
      { w: 'square', g: 0.04, s: 'G4:4 B4:2 D5:2 G5:6 F#5:2 | E5:4 D5:4 B4:8 | C5:4 E5:2 G5:2 A5:6 G5:2 | F#5:4 E5:4 D5:8 | G4:4 B4:2 D5:2 G5:6 A5:2 | B5:4 A5:4 G5:4 E5:4 | C5:4 D5:4 E5:4 F#5:4 | G5:12 r:4' },
      { w: 'triangle', g: 0.13, s: pump(['G2', 'C3', 'A2', 'D3', 'G2', 'E2', 'C3', 'G2']) },
      { w: 'drum', g: 0.05, s: 'k:4 h:4 s:4 h:4 '.repeat(8) }
    ]
  },
  sea: {
    bpm: 100, voices: [
      { w: 'square', g: 0.04, s: 'D5:6 E5:2 F#5:4 A5:4 | G5:6 F#5:2 E5:8 | B4:6 C#5:2 D5:4 F#5:4 | E5:12 r:4 | D5:6 E5:2 F#5:4 A5:4 | B5:6 A5:2 G5:4 F#5:4 | E5:4 F#5:4 G5:4 C#5:4 | D5:12 r:4' },
      { w: 'triangle', g: 0.13, s: pump(['D3', 'G2', 'B2', 'A2', 'D3', 'G2', 'A2', 'D3'], 'half') },
      { w: 'drum', g: 0.04, s: 'k:6 h:2 h:4 s:4 '.repeat(8) }
    ]
  },
  town: {
    bpm: 100, voices: [
      { w: 'square', g: 0.04, s: 'C5:4 A4:4 F4:4 A4:4 | Bb4:4 D5:4 C5:8 | A4:4 C5:4 F5:4 E5:4 | D5:6 C5:2 C5:8 | C5:4 A4:4 F4:4 A4:4 | Bb4:4 D5:4 F5:4 D5:4 | C5:4 Bb4:4 A4:4 G4:4 | F4:16' },
      { w: 'triangle', g: 0.13, s: 'F2:8 C3:8 | Bb2:8 F2:8 | F2:8 A2:8 | Bb2:8 C3:8 | F2:8 C3:8 | Bb2:8 D3:8 | C3:8 C2:8 | F2:16' },
      { w: 'triangle', g: 0.04, s: 'A4:4 C5:4 A4:4 C5:4 | Bb4:4 D5:4 Bb4:4 D5:4 | A4:4 C5:4 A4:4 C5:4 | Bb4:4 D5:4 E4:4 G4:4 | A4:4 C5:4 A4:4 C5:4 | Bb4:4 D5:4 Bb4:4 D5:4 | G4:4 C5:4 E4:4 Bb4:4 | A4:8 C5:8' }
    ]
  },
  dungeon: {
    bpm: 76, voices: [
      { w: 'square', g: 0.035, s: 'D4:6 F4:2 E4:8 | r:4 A3:4 C4:4 D4:4 | F4:6 E4:2 D4:4 C#4:4 | D4:16 | A4:6 G4:2 F4:8 | r:4 E4:4 F4:4 G4:4 | A4:6 Bb4:2 A4:4 G4:4 | A4:16' },
      { w: 'triangle', g: 0.15, s: 'D2:16 | D2:16 | Bb1:16 | A1:16 | D2:16 | C2:16 | Bb1:8 G1:8 | A1:16' },
      { w: 'drum', g: 0.03, s: 'k:16 '.repeat(8) }
    ]
  },
  spire: {
    bpm: 70, voices: [
      { w: 'square', g: 0.032, s: 'B4:8 C5:8 | B4:4 A4:4 G4:8 | F#4:8 G4:8 | E4:16 | B4:8 D5:8 | C5:4 B4:4 A4:8 | G4:4 F#4:4 E4:4 D#4:4 | E4:16' },
      { w: 'triangle', g: 0.15, s: 'E2:16 | C2:16 | D2:16 | E2:16 | G1:16 | A1:16 | B1:16 | E2:16' },
      { w: 'drum', g: 0.03, s: 'k:8 s:8 '.repeat(8) }
    ]
  },
  battle: {
    bpm: 152, voices: [
      { w: 'square', g: 0.04, s: 'A4:2 A4:2 C5:2 E5:2 A5:4 G5:2 E5:2 | F5:4 E5:2 D5:2 E5:8 | A4:2 A4:2 C5:2 E5:2 A5:4 B5:2 C6:2 | B5:4 G5:4 E5:8 | F5:4 F5:2 G5:2 A5:4 F5:4 | G5:4 G5:2 A5:2 B5:4 G5:4 | A5:2 G5:2 F5:2 E5:2 D5:2 C5:2 B4:2 G#4:2 | A4:8 E5:8' },
      { w: 'triangle', g: 0.14, s: pump(['A2', 'D2', 'A2', 'E2', 'F2', 'G2', 'F2', 'E2']) },
      { w: 'drum', g: 0.05, s: 'k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2 '.repeat(8) }
    ]
  },
  boss: {
    bpm: 158, voices: [
      { w: 'square', g: 0.042, s: 'E5:2 E5:2 F5:2 E5:2 B4:4 r:2 E5:2 | G5:2 F5:2 E5:2 D5:2 E5:8 | E5:2 E5:2 F5:2 E5:2 C6:4 B5:4 | A5:2 G5:2 F5:2 G5:2 E5:8 | B5:4 A5:4 G5:4 F5:4 | E5:4 F5:4 G5:4 A5:4 | B5:2 C6:2 B5:2 A5:2 G5:2 F5:2 E5:2 D#5:2 | E5:16' },
      { w: 'sawtooth', g: 0.035, s: pump(['E2', 'E2', 'C2', 'D2', 'E2', 'D2', 'C2', 'B1']) },
      { w: 'drum', g: 0.06, s: 'k:2 h:2 s:2 k:2 k:2 h:2 s:2 h:2 '.repeat(8) }
    ]
  },
  final: {
    bpm: 140, voices: [
      { w: 'square', g: 0.042, s: 'D5:4 D5:2 F5:2 A5:4 G#5:4 | G5:4 F5:2 E5:2 F5:8 | D5:4 D5:2 F5:2 A5:4 Bb5:4 | A5:12 r:4 | Bb5:4 A5:4 G5:4 F5:4 | G5:4 F5:4 E5:4 D5:4 | C#5:4 E5:4 A5:4 G5:4 | D5:16' },
      { w: 'sawtooth', g: 0.035, s: pump(['D2', 'D2', 'Bb1', 'A1', 'G1', 'Bb1', 'A1', 'D2']) },
      { w: 'triangle', g: 0.05, s: 'A4:16 | A4:16 | F4:16 | E4:16 | D4:16 | D4:16 | E4:16 | F4:16' },
      { w: 'drum', g: 0.06, s: 'k:2 k:2 s:2 h:2 k:2 h:2 s:2 s:2 '.repeat(8) }
    ]
  },
  victory: {
    bpm: 140, loop: false, voices: [
      { w: 'square', g: 0.05, s: 'G4:2 C5:2 E5:2 G5:6 E5:2 G5:2 C6:16' },
      { w: 'triangle', g: 0.13, s: 'C3:2 E3:2 G3:2 C3:6 G2:4 C3:16' }
    ]
  },
  ending: {
    bpm: 72, voices: [
      { w: 'square', g: 0.04, s: 'E4:4 G4:4 C5:8 | B4:4 C5:2 D5:2 E5:8 | D5:4 C5:4 A4:8 | G4:12 r:4 | E4:4 G4:4 C5:8 | B4:4 C5:2 D5:2 E5:6 G5:2 | F5:4 E5:4 D5:4 B4:4 | C5:16' },
      { w: 'triangle', g: 0.13, s: 'C3:8 G2:8 | E3:8 C3:8 | F2:8 A2:8 | G2:8 D3:8 | C3:8 G2:8 | E3:8 B2:8 | F2:8 G2:8 | C3:16' },
      { w: 'triangle', g: 0.05, s: 'C5:16 | B4:16 | A4:16 | B4:16 | C5:16 | B4:16 | A4:8 B4:8 | C5:16' }
    ]
  },
  gameover: {
    bpm: 70, loop: false, voices: [
      { w: 'square', g: 0.04, s: 'A4:6 G4:2 F4:8 E4:6 D4:2 C#4:8 D4:24' },
      { w: 'triangle', g: 0.13, s: 'D3:16 A2:16 D2:24' }
    ]
  }
};

const Audio_ = {
  ac: null, master: null, musicGain: null, sfxGain: null, muted: false, cur: null, curName: null, timer: null, noise: null,
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.master.connect(this.ac.destination);
      this.musicGain = this.ac.createGain(); this.musicGain.gain.value = 0.85; this.musicGain.connect(this.master);
      this.sfxGain = this.ac.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
      const len = this.ac.sampleRate;
      this.noise = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pending) { const p = this.pending; this.pending = null; this.play(p, true); }
    } catch (e) { console.warn(e); }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; },
  toggleMute() { this.setMuted(!this.muted); toast(this.muted ? 'Sound off (M)' : 'Sound on (M)'); },
  play(name, force) {
    if (!force && this.curName === name) return;
    this.curName = name;
    if (!this.ac) { this.pending = name; return; }
    this.stopMusic(true);
    const tr = TRACKS[name]; if (!tr) return;
    const step = 60 / tr.bpm / 4;
    const voices = tr.voices.map(v => ({ ...v, seq: parseSeq(v.s), i: 0, t: 0 }));
    const out = this.ac.createGain(); out.gain.value = 1; out.connect(this.musicGain);
    const start = this.ac.currentTime + 0.08;
    voices.forEach(v => v.t = start);
    const self = this;
    const state = { out, voices, tr, step, done: false };
    this.cur = state;
    const sched = () => {
      if (self.cur !== state) return;
      const ahead = self.ac.currentTime + 0.25;
      let allDone = true;
      for (const v of voices) {
        while (v.t < ahead) {
          if (v.i >= v.seq.length) { if (tr.loop === false) break; v.i = 0; }
          const ev = v.seq[v.i++];
          const dur = ev.d * step;
          if (ev.n !== 'r') self.note(out, v.w, ev.n, v.t, dur, v.g);
          v.t += dur;
        }
        if (v.i < v.seq.length || tr.loop !== false) allDone = false;
      }
      if (allDone) state.done = true;
    };
    sched();
    this.timer = setInterval(sched, 60);
  },
  stopMusic(quick) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.cur && this.ac) {
      const o = this.cur.out;
      try { o.gain.setTargetAtTime(0, this.ac.currentTime, quick ? 0.03 : 0.2); setTimeout(() => o.disconnect(), 800); } catch (e) { }
    }
    this.cur = null;
  },
  note(out, wave, n, t, dur, g) {
    const ac = this.ac;
    if (wave === 'drum') {
      const src = ac.createBufferSource(); src.buffer = this.noise;
      const gn = ac.createGain();
      if (n === 'k') {
        const o = ac.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        const og = ac.createGain(); og.gain.setValueAtTime(g * 4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.16);
        return;
      }
      const f = ac.createBiquadFilter();
      f.type = n === 'h' ? 'highpass' : 'bandpass'; f.frequency.value = n === 'h' ? 7000 : 1800;
      const len = n === 'h' ? 0.04 : 0.12;
      gn.gain.setValueAtTime(g * (n === 'h' ? 0.8 : 1.6), t); gn.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f); f.connect(gn); gn.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
      return;
    }
    const fr = noteFreq(n); if (!fr) return;
    const o = ac.createOscillator(); o.type = wave; o.frequency.value = fr;
    const gn = ac.createGain();
    const a = 0.01, rel = Math.min(0.12, dur * 0.4);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + a);
    gn.gain.setValueAtTime(g * 0.8, t + Math.max(a, dur - rel)); gn.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(gn); gn.connect(out); o.start(t); o.stop(t + dur + 0.02);
  },
  sfx(name) {
    if (!this.ac || this.muted) return;
    const ac = this.ac, t = ac.currentTime, out = this.sfxGain;
    const tone = (type, f1, f2, dur, g, delay = 0) => {
      const o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f1, t + delay); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + delay + dur);
      const gn = ac.createGain(); gn.gain.setValueAtTime(g, t + delay); gn.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(gn); gn.connect(out); o.start(t + delay); o.stop(t + delay + dur + 0.02);
    };
    const noise = (dur, g, freq = 1200, type = 'bandpass', delay = 0) => {
      const s = ac.createBufferSource(); s.buffer = this.noise;
      const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(g, t + delay); gn.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      s.connect(f); f.connect(gn); gn.connect(out); s.start(t + delay, Math.random() * 0.5); s.stop(t + delay + dur + 0.02);
    };
    switch (name) {
      case 'blip': tone('square', 900, 0, 0.025, 0.02); break;
      case 'cursor': tone('square', 1200, 0, 0.04, 0.05); break;
      case 'ok': tone('square', 880, 0, 0.05, 0.06); tone('square', 1320, 0, 0.07, 0.05, 0.05); break;
      case 'cancel': tone('square', 600, 300, 0.08, 0.05); break;
      case 'buzz': tone('sawtooth', 120, 0, 0.15, 0.06); break;
      case 'hit': noise(0.12, 0.5, 900); tone('square', 180, 60, 0.1, 0.12); break;
      case 'crit': noise(0.2, 0.6, 1400); tone('sawtooth', 300, 50, 0.2, 0.12); break;
      case 'slash': noise(0.15, 0.35, 3500, 'highpass'); break;
      case 'miss': tone('triangle', 500, 900, 0.12, 0.08); break;
      case 'fire': noise(0.5, 0.4, 600, 'lowpass'); tone('sawtooth', 200, 80, 0.4, 0.05); break;
      case 'ice': for (let i = 0; i < 5; i++) tone('triangle', 1800 + i * 300, 2400, 0.12, 0.06, i * 0.05); break;
      case 'bolt': noise(0.3, 0.6, 2500, 'highpass'); tone('sawtooth', 1200, 100, 0.25, 0.08); break;
      case 'holy': for (let i = 0; i < 6; i++) tone('sine', 660 * Math.pow(1.26, i), 0, 0.3, 0.06, i * 0.06); break;
      case 'dark': tone('sawtooth', 220, 55, 0.6, 0.08); tone('sine', 110, 40, 0.6, 0.12); break;
      case 'water': noise(0.6, 0.35, 500, 'lowpass'); tone('sine', 300, 150, 0.5, 0.06); break;
      case 'heal': for (let i = 0; i < 4; i++) tone('sine', 880 * Math.pow(1.19, i), 0, 0.25, 0.06, i * 0.07); break;
      case 'buff': tone('square', 440, 880, 0.25, 0.05); tone('square', 660, 1320, 0.25, 0.04, 0.1); break;
      case 'poison': tone('sine', 400, 200, 0.2, 0.06); tone('sine', 300, 150, 0.2, 0.06, 0.12); break;
      case 'chest': [523, 659, 784, 1046].forEach((f, i) => tone('square', f, 0, 0.12, 0.06, i * 0.07)); break;
      case 'item': [784, 1046].forEach((f, i) => tone('square', f, 0, 0.1, 0.06, i * 0.08)); break;
      case 'levelup': [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone('square', f, 0, 0.12, 0.06, i * 0.09)); break;
      case 'encounter': for (let i = 0; i < 8; i++) tone('square', 300 + i * 120, 0, 0.05, 0.05, i * 0.03); noise(0.4, 0.2, 2000); break;
      case 'stairs': [500, 400, 300].forEach((f, i) => tone('triangle', f, 0, 0.1, 0.08, i * 0.08)); break;
      case 'door': noise(0.15, 0.2, 400, 'lowpass'); tone('triangle', 200, 120, 0.12, 0.08); break;
      case 'bump': tone('square', 90, 0, 0.06, 0.06); break;
      case 'run': noise(0.3, 0.2, 2000, 'highpass'); for (let i = 0; i < 4; i++) tone('square', 400 - i * 60, 0, 0.05, 0.04, i * 0.04); break;
      case 'inn': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, 0, 0.25, 0.08, i * 0.18)); break;
      case 'save': [784, 988, 1175].forEach((f, i) => tone('sine', f, 0, 0.2, 0.07, i * 0.1)); break;
      case 'ko': tone('sawtooth', 400, 60, 0.5, 0.08); break;
      case 'boom': noise(0.8, 0.8, 300, 'lowpass'); tone('sine', 80, 30, 0.8, 0.2); break;
      case 'lantern': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, 0, 0.5, 0.06, i * 0.12)); break;
    }
  }
};
