'use strict';
// ============================================================
//  TILE CACHE (1.10, TD-4): draw each map's tiles once into 8×8-tile chunks, and
//  every frame redraw only the squares that move.
//
//  What makes this work (the `tiles` play-test checks it against drawing directly):
//  - every tile paints its own 32×32 square fully opaque, so a square shows only its own
//    tile plus later tiles (to its right, or in rows below) that overhang into it;
//  - before a tile is cached it is "dry-run" on BoxCtx, a stand-in canvas that paints
//    nothing but records how far the tile reaches, and whether it read its `t` (the field
//    clock): a tile that reads `t` moves, so its squares are redrawn every frame.
//  A chunk is a canvas at the screen's real pixel scale. Field.draw snaps the camera to
//  whole device pixels, so chunks land on the screen without resampling.
// ============================================================

// A canvas context that draws nothing and records the bounds of what would be painted.
// Bounds are generous where it's cheap (curves use their control points, and a stroke with a
// pointed join counts 3× its width), and exact for fills, so plain tiles reach nowhere.
class BoxCtx {
  constructor() { this.reset(); }
  reset() {
    this.st = { m: [1, 0, 0, 1, 0, 0], lw: 1 }; this.stack = [];
    this.path = null; this.box = null;
    this.fillStyle = this.strokeStyle = '#000'; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over';
    this.lineCap = 'butt'; this.lineJoin = 'miter'; this.font = ''; this.textAlign = 'start'; this.textBaseline = 'alphabetic';
  }
  get lineWidth() { return this.st.lw; }
  set lineWidth(v) { this.st.lw = v; }
  pt(x, y, acc) { const [a, b, c, d, e, f] = this.st.m, X = a * x + c * y + e, Y = b * x + d * y + f; if (!acc.b) acc.b = [X, Y, X, Y]; else { const q = acc.b; if (X < q[0]) q[0] = X; if (Y < q[1]) q[1] = Y; if (X > q[2]) q[2] = X; if (Y > q[3]) q[3] = Y; } }
  rectPts(x, y, w, h, acc) { this.pt(x, y, acc); this.pt(x + w, y, acc); this.pt(x, y + h, acc); this.pt(x + w, y + h, acc); }
  scaleOf() { const [a, b, c, d] = this.st.m; return Math.max(Math.hypot(a, b), Math.hypot(c, d)); }
  paint(b, pad) { if (!b) return; const q = this.box || (this.box = [Infinity, Infinity, -Infinity, -Infinity]); q[0] = Math.min(q[0], b[0] - pad); q[1] = Math.min(q[1], b[1] - pad); q[2] = Math.max(q[2], b[2] + pad); q[3] = Math.max(q[3], b[3] + pad); }
  // a pointed (miter) corner can stick out well past the line; a lone segment or curve can't
  strokePad() { const p = this.path || {}; return this.st.lw * this.scaleOf() * (this.lineJoin === 'miter' && (p.corner || p.seg > 1) ? 3 : 0.5); }
  // state
  save() { this.stack.push({ m: this.st.m.slice(), lw: this.st.lw }); }
  restore() { if (this.stack.length) this.st = this.stack.pop(); }
  transform(a2, b2, c2, d2, e2, f2) { const [a, b, c, d, e, f] = this.st.m; this.st.m = [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f]; }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(r) { const c = Math.cos(r), s = Math.sin(r); this.transform(c, s, -s, c, 0, 0); }
  setTransform(a, b, c, d, e, f) { this.st.m = [a, b, c, d, e, f]; }
  // paths
  beginPath() { this.path = {}; }
  P() { return this.path || (this.path = {}); }
  seg() { const p = this.P(); p.cur = (p.cur || 0) + 1; if (p.cur > 1) p.corner = true; }
  moveTo(x, y) { const p = this.P(); p.cur = 0; this.pt(x, y, p); }
  lineTo(x, y) { this.seg(); this.pt(x, y, this.P()); }
  quadraticCurveTo(a, b, x, y) { this.seg(); this.pt(a, b, this.P()); this.pt(x, y, this.P()); }
  bezierCurveTo(a, b, c, d, x, y) { this.seg(); this.pt(a, b, this.P()); this.pt(c, d, this.P()); this.pt(x, y, this.P()); }
  arc(x, y, r) { this.seg(); this.rectPts(x - r, y - r, 2 * r, 2 * r, this.P()); }
  arcTo(a, b, x, y) { this.seg(); this.pt(a, b, this.P()); this.pt(x, y, this.P()); }
  ellipse(x, y, rx, ry) { const r = Math.max(rx, ry); this.arc(x, y, r); }
  rect(x, y, w, h) { this.P().corner = true; this.rectPts(x, y, w, h, this.P()); }
  roundRect(x, y, w, h) { this.rect(x, y, w, h); }
  closePath() { this.P().corner = true; }
  fill() { this.paint(this.path && this.path.b, 0); }
  stroke() { this.paint(this.path && this.path.b, this.strokePad()); }
  clip() {}
  fillRect(x, y, w, h) { const acc = {}; this.rectPts(x, y, w, h, acc); this.paint(acc.b, 0); }
  strokeRect(x, y, w, h) { const acc = { corner: true }; this.rectPts(x, y, w, h, acc); this.path = acc; this.paint(acc.b, this.strokePad()); }
  clearRect() {}
  fillText() { this.unsure = true; } strokeText() { this.unsure = true; } drawImage() { this.unsure = true; }
  measureText(s) { return { width: String(s).length * 8 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createPattern() { return null; }
  setLineDash() {} getLineDash() { return []; }
  getTransform() { const [a, b, c, d, e, f] = this.st.m; return { a, b, c, d, e, f }; }
}

const TileCache = {
  enabled: !/[?&]nocache\b/.test(location.search),
  CH: 8,                              // tiles per chunk side
  M: { l: 2, r: 2, u: 8, d: 2 },      // the furthest any tile may reach outside its square
  MEMORY: 96e6,                       // bytes of chunk canvases to keep (at most 48 chunks)
  map: null, k: 0, rev: -1, chunks: new Map(), info: new Map(), frame: 0, built: 0,
  box: new BoxCtx(),
  canvasOpts: undefined,              // the tiles play-test asks for software canvases, to read pixels
  stats: { chunks: 0, built: 0, dirty: 0 },

  reset() { this.chunks.clear(); this.info.clear(); this.map = null; },
  // Tile drawers leave canvas state behind (line() sets a round cap), so every tile starts
  // from the same state: otherwise a tile's look would depend on the tile drawn before it.
  tileFn(m) {
    const f = { world: drawWorldTile, deep: drawDeepTile, town: drawTownTile, interior: drawInteriorTile, heist: drawHeistTile }[m.kind] || drawDungeonTile;
    return (g, m, x, y, px, py, t) => { g.save(); g.lineCap = 'round'; f(g, m, x, y, px, py, t); g.restore(); };
  },
  // towns and interiors leave squares outside the layout empty (the background shows)
  skips(m) { return m.kind === 'town' || m.kind === 'interior'; },
  bg(m) { return m.kind === 'deep' ? '#04101c' : m.kind === 'dungeon' || m.kind === 'interior' || m.kind === 'heist' ? '#000' : m.kind === 'town' ? (m.theme === 'stone' ? '#5f574f' : '#2f6a2a') : WPAL.water; },

  // Dry-run tile (x, y): how many squares it reaches each way, and whether it moves.
  // null for an empty square. tooFar: it reaches beyond M, so the map isn't cached.
  tileInfo(m, x, y) {
    const id = x + ',' + y;
    if (this.info.has(id)) return this.info.get(id);
    let v = null;
    if (!(this.skips(m) && m.at(x, y) === undefined)) {
      const g = this.box; g.reset(); g.unsure = false;
      let reads = 0;
      const t = { valueOf: () => (reads++, 0.5), toString: () => (reads++, '0.5') };
      const fn = this.tileFn(m);
      fn(g, m, x, y, x * TS, y * TS, t);
      // a moving tile's bounds change with time: take them over 16 moments spread across 20 s
      if (reads) for (let i = 1; i <= 16; i++) { const box = g.box; g.reset(); g.box = box; fn(g, m, x, y, x * TS, y * TS, (i * 1.2361) % 20); }
      const b = g.box || [x * TS, y * TS, x * TS, y * TS], X = x * TS, Y = y * TS;
      // whole squares reached (a fill that stops exactly on the square's border reaches nothing)
      const sq = over => over > 0 ? Math.ceil(over / TS) : 0;
      v = { anim: reads > 0, l: sq(X - b[0]), u: sq(Y - b[1]), r: sq(b[2] - X - TS), d: sq(b[3] - Y - TS) };
      if (g.unsure || v.l > this.M.l || v.r > this.M.r || v.u > this.M.u || v.d > this.M.d) v.tooFar = true;
    }
    this.info.set(id, v);
    return v;
  },

  // Can tile (x, y), with info v, be seen in square (sx, sy)? Only if it reaches the square,
  // and the square's own opaque tile doesn't cover it: the square is empty (towns), or the
  // tile is drawn after the square's own (it's the square itself, to the right, or lower).
  shows(m, v, x, y, sx, sy) {
    if (!v || sx < x - v.l || sx > x + v.r || sy < y - v.u || sy > y + v.d) return false;
    return y > sy || (y === sy && x >= sx) || (this.skips(m) && m.at(sx, sy) === undefined);
  },
  // Draw chunk (ci, cj) into a canvas; work out its animated squares and what redraws them.
  build(m, ci, cj, k) {
    const CH = this.CH, M = this.M, fn = this.tileFn(m);
    const X0 = ci * CH, Y0 = cj * CH, X1 = X0 + CH - 1, Y1 = Y0 + CH - 1;
    const ox = Math.floor(X0 * TS * k), oy = Math.floor(Y0 * TS * k);
    const w = Math.ceil((X1 + 1) * TS * k) - ox, h = Math.ceil((Y1 + 1) * TS * k) - oy;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', this.canvasOpts);
    g.setTransform(k, 0, 0, k, -ox, -oy);
    g.fillStyle = this.bg(m); g.fillRect(X0 * TS, Y0 * TS, CH * TS, CH * TS);
    const dirty = new Map();
    for (let y = Y0 - M.d; y <= Y1 + M.u; y++) for (let x = X0 - M.r; x <= X1 + M.l; x++) {
      const v = this.tileInfo(m, x, y);
      if (!v) continue;
      if (v.tooFar) return null;
      let seen = false;   // the chunk's squares where this tile shows
      for (let yy = Math.max(Y0, y - v.u); yy <= Math.min(Y1, y + v.d); yy++) for (let xx = Math.max(X0, x - v.l); xx <= Math.min(X1, x + v.r); xx++)
        if (this.shows(m, v, x, y, xx, yy)) { seen = true; if (v.anim) dirty.set(xx + ',' + yy, [xx, yy]); }
      if (seen) fn(g, m, x, y, x * TS, y * TS, 0);
    }
    // the animated squares as runs along each row, each with the tiles that repaint it:
    // its own squares, then later tiles that reach into it (an earlier tile is covered by
    // the square's own opaque tile, so it never shows)
    const runs = [];
    for (const [x, y] of [...dirty.values()].sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
      const last = runs[runs.length - 1];
      if (last && last.y === y && last.x1 === x - 1) last.x1 = x; else runs.push({ y, x0: x, x1: x });
    }
    for (const run of runs) {   // every tile that shows in the run, in drawing order
      const list = [];
      for (let yy = run.y - M.d; yy <= run.y + M.u; yy++) for (let x = run.x0 - M.r; x <= run.x1 + M.l; x++) {
        const v = this.tileInfo(m, x, yy);
        if (v && v.tooFar) return null;
        for (let sx = run.x0; sx <= run.x1; sx++) if (this.shows(m, v, x, yy, sx, run.y)) { list.push([x, yy]); break; }
      }
      run.tiles = list;
    }
    this.built++;
    return { cv, ox, oy, w, h, runs, used: this.frame };
  },

  // Repaint one run of animated squares at time t, clipped to the run.
  redraw(g, m, run, cx, cy, k, t) {
    const fn = this.tileFn(m), skip = this.skips(m), { y, x0, x1 } = run;
    const sx0 = Math.round((x0 * TS - cx) * k) / k, sx1 = Math.round(((x1 + 1) * TS - cx) * k) / k;
    const sy0 = Math.round((y * TS - cy) * k) / k, sy1 = Math.round(((y + 1) * TS - cy) * k) / k;
    g.save(); g.translate(-cx, -cy);   // tiles at their map position, as in the chunks
    g.beginPath(); g.rect(sx0 + cx, sy0 + cy, sx1 - sx0, sy1 - sy0); g.clip();
    if (skip) { g.fillStyle = this.bg(m); for (let x = x0; x <= x1; x++) if (m.at(x, y) === undefined) g.fillRect(x * TS, y * TS, TS, TS); }
    for (const [x, yy] of run.tiles) fn(g, m, x, yy, x * TS, yy * TS, t);
    g.restore();
  },

  // Draw the visible tiles of map m with the camera at (cx, cy), snapped to device pixels.
  // Returns false when the map can't be cached (the caller then draws tiles directly).
  draw(g, m, cx, cy, t) {
    if (!this.enabled || m.noCache) return false;
    const k = g.getTransform().a;
    if (this.map !== m || this.k !== k || this.rev !== (m.rev || 0)) { this.reset(); this.map = m; this.k = k; this.rev = m.rev || 0; }
    this.frame++;
    const span = this.CH * TS;
    const ci0 = Math.floor(cx / span), ci1 = Math.ceil((cx + W) / span) - 1;
    const cj0 = Math.floor(cy / span), cj1 = Math.ceil((cy + H) / span) - 1;
    const vis = [];
    let builtNow = false;
    for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) {
      const id = ci + ',' + cj;
      let c = this.chunks.get(id);
      if (!c) { c = this.build(m, ci, cj, k); if (!c) { m.noCache = true; this.reset(); return false; } this.chunks.set(id, c); builtNow = true; }
      c.used = this.frame; vis.push(c);
    }
    const cap = Math.min(48, Math.floor(this.MEMORY / (4 * (span * k) ** 2)));
    // build one chunk of the ring around the screen per quiet frame, so walking rarely waits
    if (!builtNow && cap >= vis.length + 8) {
      ring: for (let cj = cj0 - 1; cj <= cj1 + 1; cj++) for (let ci = ci0 - 1; ci <= ci1 + 1; ci++) {
        const id = ci + ',' + cj;
        if (this.chunks.has(id)) continue;
        const c = this.build(m, ci, cj, k);
        if (c) { c.used = this.frame; this.chunks.set(id, c); }
        break ring;
      }
    }
    for (const c of vis) g.drawImage(c.cv, c.ox / k - cx, c.oy / k - cy, c.w / k, c.h / k);
    let dirty = 0;
    for (const c of vis) for (const run of c.runs) {
      if ((run.y + 1) * TS <= cy || run.y * TS >= cy + H || (run.x1 + 1) * TS <= cx || run.x0 * TS >= cx + W) continue;
      this.redraw(g, m, run, cx, cy, k, t); dirty += run.x1 - run.x0 + 1;
    }
    if (this.chunks.size > Math.max(cap, vis.length)) {   // forget the chunks unused for longest
      const old = [...this.chunks].sort((a, b) => a[1].used - b[1].used).slice(0, this.chunks.size - Math.max(cap, vis.length));
      for (const [id] of old) this.chunks.delete(id);
    }
    this.stats = { chunks: vis.length, built: this.built, dirty };
    return true;
  },
};
