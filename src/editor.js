'use strict';
// ============================================================
//  TOWN EDITOR (2.0, EN-3). Open index.html?edit
//  Draws the town with the game's own art and people, lets you move buildings and paint
//  paths, water, piers, decorations and exits, checks the layout as you go, lets you walk
//  around in it, and exports it as a mod (or as an entry for content/towns.json).
//  townProblems() is also what the build runs (tools/load_check.js) on every town.
// ============================================================
const EDIT_MODE = /[?&]edit\b/.test(location.search);
const TOWN_DECOR = { t: 'Tree', P: 'Pine', m: 'Cliff', r: 'Rock', f: 'Flowers', F: 'Fence', w: 'Well', l: 'Lamp post', c: 'Crates', a: 'Anvil', b: 'Brazier', g: 'Gravestone' };
// the states a town is checked in: people come and go with the story and the time of day
const POSTGAME_FLAGS = ['q1', 'lantern1', 'lantern2', 'lantern3', 'lantern4', 'bridge', 'ship', 'airship', 'ending', 'isle', 'chapter6', 'q_drowned', 'cards_done', 'heist_done'];
const TOWN_STATES = [['by day, early in the story', false, false], ['at night, early in the story', true, false], ['by day, after the ending', false, true], ['at night, after the ending', true, true]];

// Everything wrong with a town's layout: a list of { msg, x, y }. def defaults to the town's own.
function townProblems(id, def = TOWN_DEFS[id]) {
  const P = [], add = (msg, x, y) => { if (!P.some(p => p.msg === msg)) P.push({ msg, x, y }); };
  const { w, h } = def, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h, edge = (x, y) => x === 0 || y === 0 || x === w - 1 || y === h - 1;
  const bAt = (x, y) => def.buildings.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  def.buildings.forEach((b, i) => {
    if (b.x < 1 || b.y < 1 || b.x + b.w > w - 1 || b.y + b.h > h - 1) add(`"${b.id}" runs into the town's edge`, b.x, b.y);
    for (const o of def.buildings.slice(i + 1)) if (b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h) add(`"${b.id}" and "${o.id}" overlap`, o.x, o.y);
    if (def.buildings.findIndex(o => o.id === b.id) !== i) add(`two buildings are called "${b.id}"`, b.x, b.y);
  });
  for (const [x0, y0, x1, y1] of def.paths || []) if (!inside(x0, y0) || !inside(x1, y1)) add('a path runs off the town', x0, y0);
  for (const [k, list] of [['water', def.water], ['a pier', def.piers]]) for (const [x, y, rw, rh] of list || []) if (!inside(x, y) || !inside(x + rw - 1, y + rh - 1)) add(`${k === 'water' ? 'water' : k} runs off the town`, x, y);
  for (const [x, y, c] of def.decor || []) { const what = `a decoration (${(TOWN_DECOR[c] || c).toLowerCase()})`; if (!inside(x, y)) add(`${what} is off the town`, x, y); else if (bAt(x, y)) add(`${what} is hidden under "${bAt(x, y).id}"`, x, y); }
  for (const [x, y] of def.exits) if (!inside(x, y) || !edge(x, y)) add('an exit has to be on the edge', x, y);
  if (P.some(p => / off the town|edge|runs into/.test(p.msg))) return P;   // can't lay it out
  // walk it, with the game's own rules, from the way in
  const m = buildTown(id, def), keepMap = Field.map, keepFlags = G.flags, keepClock = G.clock;
  Field.map = m;
  try {
    const ok = (x, y) => Field.walkable(x, y), seen = new Set(), q = [];
    for (const [x, y] of def.exits) if (inside(x, y) && ok(x, y)) { seen.add(x + ',' + y); q.push([x, y]); }
    if (!q.length) add('no exit can be walked onto', def.exits[0][0], def.exits[0][1]);
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } }
    }
    for (const b of def.buildings) {
      const dx = b.x + Math.floor(b.w / 2), dy = b.y + b.h;
      if (!seen.has(dx + ',' + dy)) add(`the door of "${b.id}" can't be reached from the way in`, dx, dy);
    }
    // the people, in each state of the story and the day (the game's own populate())
    const bad = new Map();   // one line per person and problem, saying when if it isn't always
    for (const [when, night, post] of TOWN_STATES) {
      G.flags = post ? Object.fromEntries(POSTGAME_FLAGS.map(f => [f, true])) : {};
      G.clock = night ? 23 * 60 : 10 * 60;
      populate(m);
      for (const n of m.entities) {
        if (n.kind !== 'npc') continue;
        const who = n.name || (n.talk && n.talk.name ? n.talk.name.replace(/^talk/, '') : 'someone');
        const what = !ok(n.x, n.y) ? 'stands where nobody can walk' : !seen.has(n.x + ',' + n.y) ? "can't be reached" : null;
        if (!what) continue;
        const k = `${who}|${what}|${n.x},${n.y}`;
        if (!bad.has(k)) bad.set(k, { who, what, x: n.x, y: n.y, when: [] });
        bad.get(k).when.push(when);
      }
    }
    for (const b of bad.values()) add(`${b.who} ${b.what}${b.when.length < TOWN_STATES.length ? ' (' + b.when.join('; ') + ')' : ''}`, b.x, b.y);
  } catch (e) { add('the town fails to build: ' + e.message, 0, 0); }
  finally { Field.map = keepMap; G.flags = keepFlags; G.clock = keepClock; }
  return P;
}
// Every town's problems, as lines; the build fails on any (tools/load_check.js).
function townReport() {
  const out = [];
  for (const id of Object.keys(TOWN_DEFS)) for (const p of townProblems(id)) out.push(`towns.json: ${id}: ${p.msg} (at ${p.x}, ${p.y})`);
  return out;
}

// ---------- the editor ----------
const EDITOR_STORE = 'lanternfall_editor_v1';
const Editor = {
  id: null, def: null, map: null, tool: 'select', decor: 't', sel: null, drag: null, hover: null,
  undoStack: [], redoStack: [], cam: { x: 0, y: 0 }, night: false, post: false, problems: [], walking: false, panel: null,
  start() {
    G.party = [makeMember('arin', 10)]; G.flags = {}; G.clock = 10 * 60;
    SIDE_PANEL = 340; document.body.style.justifyContent = 'flex-start'; resize();
    this.buildPanel();
    this.listen();
    Fade.v = 0;
    let drafts = {}; try { drafts = JSON.parse(localStorage.getItem(EDITOR_STORE) || '{}'); } catch (e) { }
    this.drafts = drafts;
    this.open(Object.keys(TOWN_DEFS)[0]);
  },
  // the game's own layouts, before any edit, to reset to and to tell what changed
  originals: null,
  original(id) { if (!this.originals) this.originals = JSON.parse(JSON.stringify(TOWN_DEFS)); return this.originals[id]; },
  open(id) {
    this.original(id);
    this.id = id; this.sel = null; this.undoStack = []; this.redoStack = [];
    this.def = JSON.parse(JSON.stringify(this.drafts[id] || this.original(id)));
    this.cam = { x: 0, y: 0 };
    this.rebuild(); this.centre(this.def.w / 2, this.def.h / 2);
    G.scene = EditorScene;
    this.refreshPanel();
  },
  // after every change: the map, the people, the checks, the draft
  rebuild() {
    TOWN_DEFS[this.id] = this.def; delete G.maps[this.id];
    this.map = buildTown(this.id, this.def);
    this.problems = townProblems(this.id, this.def);
    G.flags = this.post ? Object.fromEntries(POSTGAME_FLAGS.map(f => [f, true])) : {};
    G.clock = this.night ? 23 * 60 : 10 * 60;
    try { populate(this.map); } catch (e) { this.map.entities = []; }
    const same = JSON.stringify(this.def) === JSON.stringify(this.original(this.id));
    if (same) delete this.drafts[this.id]; else this.drafts[this.id] = this.def;
    try { localStorage.setItem(EDITOR_STORE, JSON.stringify(this.drafts)); } catch (e) { }
  },
  change(fn) {   // every edit goes through here, so it can be undone
    this.undoStack.push(JSON.stringify(this.def)); if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    fn(this.def); this.rebuild(); this.refreshPanel();
  },
  undo() { if (!this.undoStack.length) return; this.redoStack.push(JSON.stringify(this.def)); this.def = JSON.parse(this.undoStack.pop()); this.sel = null; this.rebuild(); this.refreshPanel(); },
  redo() { if (!this.redoStack.length) return; this.undoStack.push(JSON.stringify(this.def)); this.def = JSON.parse(this.redoStack.pop()); this.sel = null; this.rebuild(); this.refreshPanel(); },
  centre(tx, ty) { this.cam.x = tx * TS - W / 2; this.cam.y = ty * TS - H / 2; this.clampCam(); },
  clampCam() {
    const mw = this.def.w * TS, mh = this.def.h * TS;
    this.cam.x = mw <= W ? (mw - W) / 2 : clamp(this.cam.x, -TS, mw - W + TS);
    this.cam.y = mh <= H ? (mh - H) / 2 : clamp(this.cam.y, -TS, mh - H + TS);
  },

  // ---- what's under a tile ----
  buildingAt(x, y) { return this.def.buildings.findIndex(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); },
  decorAt(x, y) { return (this.def.decor || []).findIndex(d => d[0] === x && d[1] === y); },
  exitAt(x, y) { return this.def.exits.findIndex(e => e[0] === x && e[1] === y); },
  rectIn(list, x, y, corners) {
    return (list || []).findIndex(r => corners ? x >= Math.min(r[0], r[2]) && x <= Math.max(r[0], r[2]) && y >= Math.min(r[1], r[3]) && y <= Math.max(r[1], r[3]) : x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]);
  },

  // ---- mouse ----
  tileOf(e) {
    const r = cv.getBoundingClientRect(), gx = (e.clientX - r.left) / r.width * W, gy = (e.clientY - r.top) / r.height * H;
    return { x: Math.floor((gx + this.cam.x) / TS), y: Math.floor((gy + this.cam.y) / TS), gx, gy };
  },
  down(e) {
    if (this.walking) return;
    const p = this.tileOf(e), d = this.def;
    if (e.button === 2 || e.button === 1) { this.drag = { pan: true, gx: p.gx, gy: p.gy, cx: this.cam.x, cy: this.cam.y }; return; }
    if (this.tool === 'select') {
      const di = this.decorAt(p.x, p.y), ei = this.exitAt(p.x, p.y), bi = this.buildingAt(p.x, p.y);
      this.sel = di >= 0 ? { type: 'decor', i: di } : ei >= 0 ? { type: 'exit', i: ei } : bi >= 0 ? { type: 'building', i: bi } : null;
      if (this.sel) this.drag = { move: true, x: p.x, y: p.y, before: JSON.stringify(d) };
      this.refreshPanel(); return;
    }
    if (this.tool === 'decor') { this.drag = { paint: true, before: JSON.stringify(d) }; this.paint(p); return; }
    if (this.tool === 'exit') {
      if (p.x !== 0 && p.y !== 0 && p.x !== d.w - 1 && p.y !== d.h - 1) return;
      this.change(d => { const i = this.exitAt(p.x, p.y); if (i >= 0) d.exits.splice(i, 1); else d.exits.push([p.x, p.y]); });
      return;
    }
    if (this.tool === 'erase') { this.erase(p.x, p.y); return; }
    this.drag = { rect: true, x0: p.x, y0: p.y, x1: p.x, y1: p.y };   // building, path, water, pier: drag a rectangle
  },
  move(e) {
    const p = this.tileOf(e); this.hover = p;
    const dr = this.drag; if (!dr) return;
    if (dr.pan) { this.cam.x = dr.cx - (p.gx - dr.gx); this.cam.y = dr.cy - (p.gy - dr.gy); this.clampCam(); return; }
    if (dr.rect) { dr.x1 = p.x; dr.y1 = p.y; return; }
    if (dr.paint) { this.paint(p); return; }
    if (dr.move && (p.x !== dr.x || p.y !== dr.y)) {
      const dx = p.x - dr.x, dy = p.y - dr.y, s = this.sel, d = this.def;
      if (s.type === 'building') { d.buildings[s.i].x += dx; d.buildings[s.i].y += dy; }
      if (s.type === 'decor') { d.decor[s.i][0] += dx; d.decor[s.i][1] += dy; }
      if (s.type === 'exit') { d.exits[s.i][0] += dx; d.exits[s.i][1] += dy; }
      dr.x = p.x; dr.y = p.y; dr.moved = true;
      this.map = buildTown(this.id, d); try { populate(this.map); } catch (err) { }   // cheap redraw while dragging
    }
  },
  up() {
    const dr = this.drag; this.drag = null;
    if (!dr) return;
    if (dr.move && dr.moved || dr.paint && dr.painted) { this.undoStack.push(dr.before); this.redoStack = []; this.rebuild(); this.refreshPanel(); return; }
    if (!dr.rect) return;
    const x = Math.min(dr.x0, dr.x1), y = Math.min(dr.y0, dr.y1), w = Math.abs(dr.x1 - dr.x0) + 1, h = Math.abs(dr.y1 - dr.y0) + 1;
    if (this.tool === 'building') {
      if (w < 3 || h < 3) { toast('A building needs at least 3 × 3 tiles'); return; }
      let n = 1; while (this.def.buildings.some(b => b.id === 'house' + n)) n++;
      this.change(d => d.buildings.push({ x, y, w: Math.min(w, 9), h: Math.min(h, 6), kind: 'house', roof: '#7a5a9a', id: 'house' + n }));
      this.sel = { type: 'building', i: this.def.buildings.length - 1 }; this.refreshPanel();
    }
    if (this.tool === 'path') this.change(d => d.paths.push([x, y, x + w - 1, y + h - 1]));
    if (this.tool === 'water') this.change(d => (d.water = d.water || []).push([x, y, w, h]));
    if (this.tool === 'pier') this.change(d => (d.piers = d.piers || []).push([x, y, w, h]));
  },
  paint(p) {
    const d = this.def; if (p.x < 0 || p.y < 0 || p.x >= d.w || p.y >= d.h) return;
    const i = this.decorAt(p.x, p.y); if (i >= 0 && d.decor[i][2] === this.decor) return;
    d.decor = d.decor || [];
    if (i >= 0) d.decor[i][2] = this.decor; else d.decor.push([p.x, p.y, this.decor]);
    this.drag.painted = true; this.map = buildTown(this.id, d);
  },
  // erase the top thing on a tile: a decoration, a pier, a path, water, an exit, then a building
  erase(x, y) {
    const d = this.def;
    const order = [['decor', () => this.decorAt(x, y)], ['piers', () => this.rectIn(d.piers, x, y)], ['paths', () => this.rectIn(d.paths, x, y, true)], ['water', () => this.rectIn(d.water, x, y)], ['exits', () => this.exitAt(x, y)], ['buildings', () => this.buildingAt(x, y)]];
    for (const [k, find] of order) { const i = find(); if (i >= 0) { this.change(d => d[k].splice(i, 1)); this.sel = null; return; } }
  },

  // ---- keys ----
  listen() {
    cv.addEventListener('mousedown', e => this.down(e));
    window.addEventListener('mousemove', e => this.move(e));
    window.addEventListener('mouseup', () => this.up());
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (this.walking) return; e.preventDefault(); this.cam.x += e.deltaX; this.cam.y += e.deltaY; this.clampCam(); }, { passive: false });
    window.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (this.walking) { if (e.key === 'Escape' && !Script.running && !UI.stack.length) { e.stopImmediatePropagation(); this.stopWalking(); } return; }
      e.stopImmediatePropagation();
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); this.redo(); return; }
      if ((k === 'delete' || k === 'backspace') && this.sel) { const s = this.sel, key = { building: 'buildings', decor: 'decor', exit: 'exits' }[s.type]; this.change(d => d[key].splice(s.i, 1)); this.sel = null; this.refreshPanel(); return; }
      const pan = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] }[k];
      if (pan) { this.cam.x += pan[0] * TS; this.cam.y += pan[1] * TS; this.clampCam(); }
      const tools = { 1: 'select', 2: 'building', 3: 'path', 4: 'water', 5: 'pier', 6: 'decor', 7: 'exit', 8: 'erase' }[k];
      if (tools) { this.tool = tools; this.refreshPanel(); }
    }, true);
  },

  // ---- walking around in it ----
  startWalking() {
    const d = this.def, tx = Math.floor((this.cam.x + W / 2) / TS), ty = Math.floor((this.cam.y + H / 2) / TS);
    // start on the walkable tile nearest the middle of the view, or at an exit
    Field.map = this.map; let best = null;
    for (let y = 1; y < d.h - 1; y++) for (let x = 1; x < d.w - 1; x++) if (Field.walkable(x, y) && !this.map.entities.some(n => n.x === x && n.y === y)) { const dist = Math.abs(x - tx) + Math.abs(y - ty); if (!best || dist < best[2]) best = [x, y, dist]; }
    if (!best) { toast('Nowhere to stand'); return; }
    this.walking = true; Field.noPlayer = false; Field.camAt = null;
    this.panel.querySelector('#ed-walk-note').style.display = 'block';
    Field.enter(this.id, best[0], best[1], 'down');
  },
  stopWalking() {
    this.walking = false; Field.noPlayer = true; Audio_.stop && Audio_.stop();
    this.panel.querySelector('#ed-walk-note').style.display = 'none';
    this.rebuild(); G.scene = EditorScene;
  },

  // ---- export ----
  modJson() { return JSON.stringify({ towns: { [this.id]: this.def } }, null, 2) + '\n'; },
  entryJson() { return `"${this.id}": ` + JSON.stringify(this.def, null, 2); },
  download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // ---- the side panel (plain HTML) ----
  buildPanel() {
    const css = document.createElement('style');
    css.textContent = `#ed{position:fixed;top:0;right:0;width:${SIDE_PANEL}px;height:100%;overflow-y:auto;box-sizing:border-box;padding:12px 14px;background:#120f22;color:#e8e4f4;font:13px system-ui,sans-serif;border-left:1px solid #2c2650}
#ed h1{font:600 16px Georgia,serif;margin:0 0 8px;color:#ffd27a}#ed h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#9c94c8;margin:14px 0 6px}
#ed button{background:#2a2450;color:#e8e4f4;border:1px solid #453c80;border-radius:6px;padding:4px 8px;margin:2px;cursor:pointer;font:inherit}#ed button:hover{background:#3a3270}#ed button.on{background:#ffd27a;color:#1a1430;border-color:#ffd27a}
#ed select,#ed input{background:#1c1838;color:#e8e4f4;border:1px solid #453c80;border-radius:5px;padding:3px 5px;font:inherit;box-sizing:border-box}#ed label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:3px 0}#ed label>*:last-child{width:150px}
#ed .row{display:flex;flex-wrap:wrap}#ed .p{color:#ff9a8a;cursor:pointer;margin:3px 0}#ed .p:hover{text-decoration:underline}#ed .ok{color:#8ad89a}#ed .hint{color:#9c94c8;font-size:12px;line-height:1.4}
#ed textarea{width:100%;height:150px;background:#0c0a18;color:#cfe;border:1px solid #453c80;font:11px ui-monospace,monospace}#ed-walk-note{display:none;position:fixed;left:12px;top:12px;background:#ffd27a;color:#1a1430;padding:6px 10px;border-radius:6px;font:600 13px system-ui}`;
    document.head.appendChild(css);
    const p = document.createElement('div'); p.id = 'ed'; document.body.appendChild(p); this.panel = p;
    const note = document.createElement('div'); note.id = 'ed-walk-note'; note.textContent = 'Walking around. Press Esc to go back to editing.'; p.appendChild(note);
    p.addEventListener('input', e => this.onInput(e));
    p.addEventListener('change', e => this.onInput(e));
    p.addEventListener('click', e => this.onClick(e));
  },
  refreshPanel() {
    const d = this.def, s = this.sel, b = s && s.type === 'building' ? d.buildings[s.i] : null, esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const opt = (list, v) => list.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('');
    const tool = (id, label, key) => `<button data-tool="${id}" class="${this.tool === id ? 'on' : ''}" title="key ${key}">${label}</button>`;
    const changed = !!this.drafts[this.id];
    let h = `<h1>Town editor</h1>
<label>Town <select data-act="town">${Object.keys(TOWN_DEFS).map(id => `<option value="${id}"${id === this.id ? ' selected' : ''}>${esc(TOWN_DEFS[id].name)}${this.drafts[id] ? ' (edited)' : ''}</option>`).join('')}</select></label>
<div class="row"><button data-act="undo"${this.undoStack.length ? '' : ' disabled'}>Undo</button><button data-act="redo"${this.redoStack.length ? '' : ' disabled'}>Redo</button><button data-act="walk">Walk around</button>${changed ? '<button data-act="reset">Reset to the game\'s</button>' : ''}</div>
<h2>Tool</h2><div class="row">${tool('select', 'Select / move', 1)}${tool('building', 'Building', 2)}${tool('path', 'Path', 3)}${tool('water', 'Water', 4)}${tool('pier', 'Pier', 5)}${tool('decor', 'Decoration', 6)}${tool('exit', 'Exit', 7)}${tool('erase', 'Erase', 8)}</div>
<div class="hint">${{ select: 'Click a building, decoration or exit; drag to move it; Delete removes it.', building: 'Drag a rectangle (3 × 3 or more).', path: 'Drag a rectangle of path.', water: 'Drag a rectangle of water.', pier: 'Drag a rectangle of pier (walkable, over water).', decor: 'Click or drag to place.', exit: 'Click a tile on the edge to add or remove an exit.', erase: 'Click to remove the top thing on a tile.' }[this.tool]} Right-drag, the wheel or the arrow keys move the view.</div>`;
    if (this.tool === 'decor') h += `<div class="row">${Object.entries(TOWN_DECOR).map(([c, n]) => `<button data-decor="${c}" class="${this.decor === c ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (b) h += `<h2>Building</h2>
<label>Id <input data-b="id" value="${esc(b.id)}"></label>
<label>Kind <select data-b="kind">${opt(['house', 'inn', 'shop', 'hall', 'chapel', 'jail', 'arena'], b.kind)}</select></label>
<label>Size <span><input data-b="w" type="number" min="3" max="9" value="${b.w}" style="width:60px"> × <input data-b="h" type="number" min="3" max="6" value="${b.h}" style="width:60px"></span></label>
<label>Roof <input data-b="roof" type="color" value="${b.roof}"></label>
<label>Walls <span><input data-b="wall" type="color" value="${b.wall || '#d8cfc0'}" style="width:80px">${b.wall ? '<button data-act="nowall">Theme</button>' : ''}</span></label>
<label>Sign <select data-b="sign"><option value="">none</option>${opt(['inn', 'item', 'arms', 'hall', 'anchor', 'arena', 'jail'], b.sign)}</select></label>
<label>Chimney <input data-b="chimney" type="checkbox" ${b.chimney ? 'checked' : ''} style="width:auto"></label>
${b.kind === 'shop' ? `<label>Sells <select data-b="shop">${opt(Object.keys(SHOPS), b.shop)}</select></label>` : ''}
${b.kind === 'inn' ? `<label>Price a night <input data-b="price" type="number" min="0" value="${b.price || 0}"></label>` : ''}
<button data-act="delete">Delete building</button>`;
    h += `<h2>Town</h2>
<label>Name <input data-t="name" value="${esc(d.name)}"></label>
<label>Size <span><input data-t="w" type="number" min="10" max="40" value="${d.w}" style="width:60px"> × <input data-t="h" type="number" min="10" max="40" value="${d.h}" style="width:60px"></span></label>
<label>Ground <select data-t="theme">${opt(['grass', 'snow', 'sand', 'stone', 'ash'], d.theme)}</select></label>
<label>Edge <select data-t="border">${['t', 'P', 'r', 'm'].map(c => `<option value="${c}"${c === d.border ? ' selected' : ''}>${{ t: 'trees', P: 'pines', r: 'rocks', m: 'cliffs' }[c]}</option>`).join('')}</select></label>
<label>Music <select data-t="music">${opt(Object.keys(TRACKS), d.music)}</select></label>
<h2>People</h2><div class="row"><button data-act="night" class="${this.night ? 'on' : ''}">At night</button><button data-act="post" class="${this.post ? 'on' : ''}">After the ending</button></div>
<div class="hint">The townspeople the game puts here at that time. The check below tries all four.</div>
<h2>Check</h2>${this.problems.length ? this.problems.map((p, i) => `<div class="p" data-prob="${i}">● ${esc(p.msg)}</div>`).join('') : '<div class="ok">✓ Every door and person can be reached from the way in.</div>'}
<h2>Export</h2><div class="row"><button data-act="mod">Save as a mod file</button><button data-act="entry">Copy for content/towns.json</button></div>
<div class="hint">A mod file goes in <code>mods/&lt;your-mod&gt;/content/towns.json</code> beside a <code>mod.json</code>; build with <code>python3 build.py --mod mods/&lt;your-mod&gt;</code>. Edits are kept in this browser until you reset them.</div>
<textarea id="ed-out" readonly style="display:none"></textarea>`;
    const note = this.panel.querySelector('#ed-walk-note');
    this.panel.innerHTML = h; this.panel.appendChild(note);
  },
  onInput(e) {
    const t = e.target, d = this.def;
    if (t.dataset.act === 'town' && e.type === 'change') { this.open(t.value); return; }
    const num = v => Math.max(0, parseInt(v, 10) || 0);
    if (t.dataset.b && e.type === 'change') {
      const i = this.sel.i, k = t.dataset.b;
      this.change(d => {
        const b = d.buildings[i];
        if (k === 'chimney') { if (t.checked) b.chimney = true; else delete b.chimney; }
        else if (k === 'sign') { if (t.value) b.sign = t.value; else delete b.sign; }
        else if (k === 'w' || k === 'h' || k === 'price') b[k] = num(t.value);
        else b[k] = t.value;
        if (b.kind === 'shop' && !b.shop) b.shop = Object.keys(SHOPS)[0];
        if (b.kind !== 'shop') delete b.shop;
        if (b.kind === 'inn' && b.price === undefined) b.price = 50;
        if (b.kind !== 'inn') delete b.price;
      });
    }
    if (t.dataset.t && e.type === 'change') { const k = t.dataset.t; this.change(d => { d[k] = k === 'w' || k === 'h' ? clamp(num(t.value), 10, 40) : t.value; }); this.clampCam(); }
  },
  onClick(e) {
    const t = e.target.closest('button,[data-prob]'); if (!t) return;
    if (t.dataset.tool) { this.tool = t.dataset.tool; this.refreshPanel(); return; }
    if (t.dataset.decor) { this.decor = t.dataset.decor; this.refreshPanel(); return; }
    if (t.dataset.prob !== undefined) { const p = this.problems[+t.dataset.prob]; this.centre(p.x + 0.5, p.y + 0.5); this.flash = { x: p.x, y: p.y, t: 1.5 }; return; }
    const a = t.dataset.act;
    if (a === 'undo') this.undo(); if (a === 'redo') this.redo(); if (a === 'walk') this.startWalking();
    if (a === 'reset' && confirm(`Throw away your edits to ${this.def.name}?`)) { delete this.drafts[this.id]; this.open(this.id); this.rebuild(); this.refreshPanel(); }
    if (a === 'delete') { const i = this.sel.i; this.sel = null; this.change(d => d.buildings.splice(i, 1)); }
    if (a === 'nowall') { const i = this.sel.i; this.change(d => { delete d.buildings[i].wall; }); }
    if (a === 'night') { this.night = !this.night; this.rebuild(); this.refreshPanel(); }
    if (a === 'post') { this.post = !this.post; this.rebuild(); this.refreshPanel(); }
    if (a === 'mod') { this.download('towns.json', this.modJson()); this.show(this.modJson()); }
    if (a === 'entry') { const txt = this.entryJson(); this.show(txt); try { navigator.clipboard.writeText(txt); toast('Copied'); } catch (err) { } }
  },
  show(text) { const o = this.panel.querySelector('#ed-out'); o.style.display = 'block'; o.value = text; o.select(); },
};

const EditorScene = {
  t: 0,
  update(dt) { this.t += dt; Field.t = (Field.t || 0) + dt; if (Editor.flash) { Editor.flash.t -= dt; if (Editor.flash.t <= 0) Editor.flash = null; } },
  draw(g) {
    const E = Editor, m = E.map;
    Field.map = m; Field.camAt = { x: Math.round(E.cam.x), y: Math.round(E.cam.y) }; Field.noPlayer = true; Field.banner = null; Field.anim = null;
    Field.draw(g);
    const cx = Field.camAt.x, cy = Field.camAt.y, sx = x => x * TS - cx, sy = y => y * TS - cy;
    g.save();
    // a faint grid, the exits, the doors
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let x = 0; x <= m.w; x++) { g.beginPath(); g.moveTo(sx(x), sy(0)); g.lineTo(sx(x), sy(m.h)); g.stroke(); }
    for (let y = 0; y <= m.h; y++) { g.beginPath(); g.moveTo(sx(0), sy(y)); g.lineTo(sx(m.w), sy(y)); g.stroke(); }
    g.strokeStyle = '#7aff9a'; g.lineWidth = 2;
    for (const [x, y] of E.def.exits) g.strokeRect(sx(x) + 2, sy(y) + 2, TS - 4, TS - 4);
    for (const b of E.def.buildings) { const dx = b.x + Math.floor(b.w / 2); g.strokeStyle = 'rgba(255,210,122,.8)'; g.setLineDash([3, 3]); g.strokeRect(sx(dx) + 4, sy(b.y + b.h) + 4, TS - 8, TS - 8); g.setLineDash([]); }
    // the selection
    const s = E.sel;
    if (s) {
      g.strokeStyle = '#ffd27a'; g.lineWidth = 2.5;
      if (s.type === 'building') { const b = E.def.buildings[s.i]; if (b) g.strokeRect(sx(b.x), sy(b.y), b.w * TS, b.h * TS); }
      if (s.type === 'decor') { const dd = E.def.decor[s.i]; if (dd) g.strokeRect(sx(dd[0]), sy(dd[1]), TS, TS); }
      if (s.type === 'exit') { const ee = E.def.exits[s.i]; if (ee) g.strokeRect(sx(ee[0]), sy(ee[1]), TS, TS); }
    }
    // the rectangle being dragged
    const dr = E.drag;
    if (dr && dr.rect) {
      const x = Math.min(dr.x0, dr.x1), y = Math.min(dr.y0, dr.y1), w = Math.abs(dr.x1 - dr.x0) + 1, h = Math.abs(dr.y1 - dr.y0) + 1;
      g.fillStyle = { building: 'rgba(255,210,122,.25)', path: 'rgba(220,190,140,.35)', water: 'rgba(80,160,255,.35)', pier: 'rgba(170,120,70,.4)' }[E.tool] || 'rgba(255,255,255,.2)';
      g.fillRect(sx(x), sy(y), w * TS, h * TS); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(sx(x), sy(y), w * TS, h * TS);
      text(g, `${w} × ${h}`, sx(x) + 4, sy(y) + 4, { size: 12, color: '#fff' });
    }
    // problems
    for (const p of E.problems) { g.strokeStyle = '#ff5a4a'; g.lineWidth = 2.5; g.beginPath(); g.arc(sx(p.x) + TS / 2, sy(p.y) + TS / 2, 13, 0, Math.PI * 2); g.stroke(); }
    if (E.flash) { g.strokeStyle = `rgba(255,255,255,${Math.min(1, E.flash.t)})`; g.lineWidth = 3; g.beginPath(); g.arc(sx(E.flash.x) + TS / 2, sy(E.flash.y) + TS / 2, 20, 0, Math.PI * 2); g.stroke(); }
    // the tile under the mouse
    const hv = E.hover;
    if (hv && !dr) {
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.strokeRect(sx(hv.x), sy(hv.y), TS, TS);
      const bi = E.buildingAt(hv.x, hv.y), tile = m.at(hv.x, hv.y);
      text(g, `${hv.x}, ${hv.y}${bi >= 0 ? '  ' + E.def.buildings[bi].id : tile && TOWN_DECOR[tile] ? '  ' + TOWN_DECOR[tile] : ''}`, 8, H - 20, { size: 12, color: '#fff' });
    }
    g.restore();
  },
};
