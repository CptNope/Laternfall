'use strict';
// ============================================================
//  MAPS — world generation, towns, dungeons
// ============================================================
class GameMap {
  constructor(o) { Object.assign(this, { entities: [], buildings: [] }, o); }
  at(x, y) { if (y < 0 || y >= this.h || x < 0 || x >= this.w) return undefined; return this.tiles[y][x]; }
  // rev counts changes, so the tile cache knows to redraw (tilecache.js)
  set(x, y, c) { if (y >= 0 && y < this.h && x >= 0 && x < this.w && this.tiles[y][x] !== c) { this.tiles[y][x] = c; this.rev = (this.rev || 0) + 1; } }
}

function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
function fbm(x, y, seed) { return (vnoise(x, y, seed) * 0.6 + vnoise(x * 2.1, y * 2.1, seed + 1) * 0.28 + vnoise(x * 4.3, y * 4.3, seed + 2) * 0.12); }

// ------------ WORLD ------------
const WORLD_LOC = {
  A: { x: 14, y: 43, town: 'brightwater', name: 'Brightwater' },
  B: { x: 38, y: 38, town: 'halden', name: 'Port Halden' },
  C: { x: 40, y: 15, town: 'ironhold', name: 'Ironhold' },
  D: { x: 28, y: 8, town: 'frostmere', name: 'Frostmere' },
  E: { x: 79, y: 38, town: 'mirage', name: 'Mirage' },
  F: { x: 87, y: 24, town: 'aerie', name: 'Aerie' },
  1: { x: 8, y: 31, dungeon: 'hollow', name: 'Whisperwood Hollow' },
  2: { x: 35, y: 50, dungeon: 'shrine', name: 'Sunken Shrine' },
  3: { x: 52, y: 6, dungeon: 'mine', name: 'Emberdeep Mines' },
  4: { x: 60, y: 40, dungeon: 'spire', name: 'Hollow Spire' },
  5: { x: 9, y: 12, dungeon: 'observatory', name: 'Starfall Observatory' },
  6: { x: 85, y: 45, dungeon: 'tomb', name: 'Tomb of the First King' },
  // Chapter VI — the Ashen Isle (hidden under the sea until G.flags.isle)
  G: { x: 79, y: 9, town: 'lastlight', name: 'Lastlight' },
  7: { x: 88, y: 7, dungeon: 'abyss', name: 'Crownfall Abyss' },
  // 1.5 Hearts of the Lamplighters
  8: { x: 20, y: 40, dungeon: 'embercave', name: 'Ember Caves' },
  9: { x: 42, y: 40, dungeon: 'grotto', name: 'Sea Mother\'s Grotto' }
};
// Arin's quest: twelve roadside lamps, each beside a road
// 1.7 The Drowned Kingdom: locations on the sea floor ('deep' map), dive spots and dig spots
const DEEP_LOC = {
  H: { x: 24, y: 15, town: 'nerith', name: 'Nerith', map: 'deep' },
  0: { x: 30, y: 12, dungeon: 'palace', name: 'The Drowned Palace', map: 'deep' },
  I: { x: 40, y: 24, dungeon: 'hadal', name: 'The Hadal Rift', map: 'deep' }
};
// world coordinates of the four patches of black water; each is directly above (x/2, y/2) on the sea floor
const DIVE_SPOTS = [{ x: 20, y: 22, name: 'the North Shallows' }, { x: 46, y: 48, name: 'the Shrine Deep' }, { x: 68, y: 26, name: 'the Open Sea' }, { x: 88, y: 50, name: 'the Far Reach' }];
// treasure-map dig spots (world); genWorld nudges each onto the nearest walkable tile
const TREASURE_SPOTS = { 1: [33, 49], 2: [33, 6], 3: [80, 43], 4: [12, 35], 5: [79, 11] };
function locDef(ch) { return WORLD_LOC[ch] || DEEP_LOC[ch]; }
function locMap(ch) { return (DEEP_LOC[ch] && !WORLD_LOC[ch]) ? 'deep' : 'world'; }
const ROAD_LAMPS = [[13, 31], [15, 34], [17, 42], [26, 42], [33, 40], [37, 46], [46, 10], [43, 13], [33, 7], [79, 42], [56, 41], [83, 6]];
const ISLE_LOCS = ['G', '7'];
const SHIP_HOME = { x: 40, y: 38 };
const BRIDGE_Y = 43;
function riverX(y) { return 29 + Math.round(Math.sin(y * 0.35) * 1.2); }

function genWorld() {
  const w = 98, h = 56;
  const tiles = [], region = [];
  const blobs = [
    { id: 'A', cx: 21, cy: 39, rx: 20, ry: 13, ok: (x, y) => y >= 25 && x <= 45 },
    { id: 'B', cx: 44, cy: 12, rx: 24, ry: 8.5, ok: (x, y) => y <= 21 && x <= 69 },
    { id: 'F', cx: 84, cy: 33, rx: 11, ry: 15, ok: (x, y) => x >= 73 },
    { id: 'C', cx: 60, cy: 40, rx: 7.5, ry: 6.5, ok: (x, y) => x >= 52 && y >= 32 },
    { id: 'E', cx: 9, cy: 12, rx: 5.5, ry: 4.5, ok: (x, y) => x <= 15 && y <= 20 },
    { id: 'H', cx: 84, cy: 8, rx: 10, ry: 5, ok: (x, y) => x >= 74 && y <= 14 }
  ];
  for (let y = 0; y < h; y++) {
    tiles.push([]); region.push([]);
    for (let x = 0; x < w; x++) {
      let ch = '~', reg = null;
      if (x >= 2 && y >= 2 && x < w - 2 && y < h - 2) {
        for (const b of blobs) {
          const dx = (x - b.cx) / b.rx, dy = (y - b.cy) / b.ry, v = dx * dx + dy * dy;
          const n = fbm(x * 0.17, y * 0.17, b.id.charCodeAt(0));
          if (v < 1 + (n - 0.5) * 0.9 && b.ok(x, y)) { ch = '.'; reg = b.id; }
        }
      }
      tiles[y].push(ch); region[y].push(reg);
    }
  }
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w) ? '~' : tiles[y][x];
  const set = (x, y, c) => { if (y >= 0 && y < h && x >= 0 && x < w) tiles[y][x] = c; };
  // terrain
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (tiles[y][x] === '~') continue;
    const reg = region[y][x];
    const e = fbm(x * 0.13, y * 0.13, 11), m = fbm(x * 0.17, y * 0.17, 23);
    let c = '.';
    if (reg === 'C') c = e > 0.68 ? '^' : m > 0.5 ? 'd' : 'q';
    else if (reg === 'F') c = e > 0.66 ? 'm' : hash(x, y, 91) < 0.07 ? 'v' : 'z';
    else if (reg === 'H') c = e > 0.7 ? '^' : m > 0.6 ? 'd' : '.';
    else if (reg === 'B') {
      const snow = y < 10;
      if (e > 0.62) c = snow ? 'M' : '^'; else if (e > 0.57) c = snow ? '*' : 'n'; else if (m > 0.55) c = snow ? 'P' : 'T'; else c = snow ? '*' : '.';
    } else {
      if (e > 0.67) c = '^'; else if (e > 0.6) c = 'n'; else if (m > 0.57) c = 'T'; else c = '.';
    }
    tiles[y][x] = c;
  }
  // beaches
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = tiles[y][x];
    if (c === '.' || c === 'n' || c === 'T') {
      if ([[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => at(x + dx, y + dy) === '~') && hash(x, y, 77) < 0.75) tiles[y][x] = 's';
    }
  }
  // river on continent A
  for (let y = 0; y < h; y++) {
    const rx = riverX(y);
    for (const xx of [rx, rx + 1]) if (region[y][xx] === 'A' && tiles[y][xx] !== '~') tiles[y][xx] = 'r';
  }
  const groundFor = (x, y) => region[y][x] === 'C' ? 'q' : (region[y][x] === 'B' && y < 10) ? '*' : '.';
  const clearAround = (cx, cy, r, keepForest) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const c = at(x, y);
      if (c === '~' || c === 'r' || c === undefined) continue;
      if (c === '^' || c === 'M' || (!keepForest && (c === 'T' || c === 'P' || c === 'd'))) set(x, y, groundFor(x, y));
    }
  };
  const road = (x0, y0, x1, y1, allowWater = false, yFirst = false) => {
    let x = x0, y = y0;
    const step = () => {
      const c = at(x, y);
      if (isLoc(c)) return;
      if (c === '~' || c === 'r') { if (allowWater && c === '~') { set(x, y, '='); region[y][x] = region[y][x] || 'A'; } return; }
      set(x, y, '=');
    };
    step();
    let n = 0;
    while ((x !== x1 || y !== y1) && n++ < 400) {
      const dx = x1 - x, dy = y1 - y;
      const goY = yFirst ? dy !== 0 : (Math.abs(dy) > Math.abs(dx) || dx === 0);
      if (goY && dy !== 0) y += Math.sign(dy); else x += Math.sign(dx);
      step();
    }
  };
  // force land near shrine (peninsula)
  for (let y = 46; y <= 52; y++) for (let x = 33; x <= 37; x++) {
    const d = Math.abs(x - 35) + Math.abs(y - 50) * 0.8;
    if (d <= 3 && (tiles[y][x] === '~')) { tiles[y][x] = 's'; region[y][x] = 'A'; }
  }
  // Whisperwood forest ring
  for (let y = 26; y <= 36; y++) for (let x = 3; x <= 14; x++) {
    if (region[y][x] === 'A' && tiles[y][x] !== '~' && tiles[y][x] !== 'r' && Math.hypot(x - 8, y - 31) < 4.6 + hash(x, y, 4) * 1.5) tiles[y][x] = 'T';
  }
  // Sunscar: oasis by Mirage, palm groves
  for (let y = 34; y <= 42; y++) for (let x = 75; x <= 84; x++) {
    if (region[y][x] !== 'F' || tiles[y][x] === '~') continue;
    const d = Math.hypot(x - 81, y - 37);
    if (d < 1.6) tiles[y][x] = '~'; else if (d < 3.2 && hash(x, y, 5) < 0.6) tiles[y][x] = 'T'; else if (tiles[y][x] === 'm') tiles[y][x] = 'z';
  }
  // Skyreach: a valley walled in by mesas — reachable only from the air
  for (let y = 18; y <= 30; y++) for (let x = 80; x <= 94; x++) {
    const d = Math.hypot(x - 87, (y - 24) * 1.1);
    if (d < 2.6) { tiles[y][x] = '.'; region[y][x] = 'G'; }
    else if (d < 4.4) { tiles[y][x] = 'm'; region[y][x] = 'F'; }
  }
  // place locations
  for (const k in WORLD_LOC) {
    const L = WORLD_LOC[k];
    if (ISLE_LOCS.includes(k)) region[L.y][L.x] = 'H';
    else if (tiles[L.y][L.x] === '~') region[L.y][L.x] = region[L.y][L.x] || (k === '4' ? 'C' : 'A');
    clearAround(L.x, L.y, 1, k === '1');
    tiles[L.y][L.x] = k;
  }
  // channel for the harbor
  for (let x = SHIP_HOME.x; x <= 50; x++) { if (tiles[38][x] !== 'B') tiles[38][x] = '~'; }
  for (let x = SHIP_HOME.x + 1; x <= 50; x++) tiles[37][x] = tiles[37][x] === '.' || tiles[37][x] === 's' || tiles[37][x] === 'T' || tiles[37][x] === 'n' || tiles[37][x] === '^' ? tiles[37][x] : tiles[37][x];
  // roads
  road(14, 42, 9, 32, false, true);         // Brightwater -> Hollow
  const rx = riverX(BRIDGE_Y);
  road(15, 43, rx - 1, BRIDGE_Y);            // Brightwater -> bridge
  set(rx, BRIDGE_Y, 'x'); set(rx + 1, BRIDGE_Y, 'x');
  road(rx + 2, BRIDGE_Y, 37, 38);            // bridge -> Halden
  road(38, 39, 35, 49, true, true);           // Halden -> Shrine
  road(40, 16, 51, 6, false, false);          // Ironhold -> Mines
  road(39, 15, 29, 8, false, true);           // Ironhold -> Frostmere
  road(80, 39, 84, 45, false, true);          // Mirage -> Tomb
  // mountain ring for the mines
  for (let y = 2; y <= 10; y++) for (let x = 47; x <= 58; x++) {
    const d = Math.hypot(x - 52, y - 6);
    if (d > 1.8 && d < 3.6 && tiles[y][x] !== '=' && tiles[y][x] !== '~' && region[y][x] === 'B') tiles[y][x] = 'M';
  }
  // corrupted island: dark mountains ring with opening on the west
  for (let y = 36; y <= 44; y++) for (let x = 56; x <= 64; x++) {
    const d = Math.hypot(x - 60, y - 40);
    if (d > 1.5 && d < 2.6 && !(x < 60 && Math.abs(y - 40) <= 1) && region[y][x] === 'C' && tiles[y][x] !== '~') tiles[y][x] = '^';
  }
  road(54, 40, 59, 40);
  // Ashen Isle: a crater ring of black rock around the Abyss, open to the west
  for (let y = 2; y <= 12; y++) for (let x = 83; x <= 94; x++) {
    const d = Math.hypot(x - 88, y - 7);
    if (isLoc(tiles[y][x])) continue;
    if (d < 3.6) { if (tiles[y][x] === '~' || d < 2.6) tiles[y][x] = d < 3.1 ? '.' : 's'; region[y][x] = 'H'; }
    if (d > 1.5 && d < 2.6 && !(x < 88 && Math.abs(y - 7) <= 1)) tiles[y][x] = '^';
  }
  road(80, 9, 86, 7, false, true);
  // snapshot the isle, then sink it: applyWorldFlags raises it after the ending
  const isle = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (region[y][x] === 'H') { isle.push([x, y, tiles[y][x]]); tiles[y][x] = '~'; region[y][x] = null; }
  // the Leviathan's whirlpool: open sea nearest a fixed point
  let whirl = null, wd = 1e9;
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    let open = true;
    for (let dy = -2; dy <= 2 && open; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) !== '~') { open = false; break; }
    if (!open) continue;
    const d = Math.hypot(x - 50, y - 29);
    if (d < wd) { wd = d; whirl = { x, y }; }
  }
  // treasure dig spots: nearest plain walkable tile (the isle's spot is checked with the isle raised)
  const isleAt = new Map(isle.map(([x, y, c]) => [x + ',' + y, c]));
  const walk = (x, y) => { const c = isleAt.get(x + ',' + y) || at(x, y); return '.s*nqzd='.includes(c) && !isLoc(c); };
  const digs = {};
  for (const k in TREASURE_SPOTS) {
    const [tx, ty] = TREASURE_SPOTS[k]; let best = null, bd = 1e9;
    for (let y = ty - 4; y <= ty + 4; y++) for (let x = tx - 4; x <= tx + 4; x++) { const d = Math.abs(x - tx) + Math.abs(y - ty); if (walk(x, y) && d < bd) { bd = d; best = { x, y }; } }
    digs[k] = best;
  }
  const m = new GameMap({ id: 'world', kind: 'world', w, h, tiles, region, name: 'World', whirl, isle, digs });
  return m;
}

// ------------ THE SEA FLOOR (1.7) ------------
// Half the world's resolution: a seabed tile lies under four open-sea world tiles; everything else is rock.
// Tunnels join the dive spots, Nerith, the Palace and the Rift, so every place is reachable.
// Legend: # rock, . sand, k kelp (more encounters), o boulder, c coral, v vent, w wreck, u diving-bell line (surface), H I 0 locations
const DEEP_SOLID = new Set(['#', 'o', 'c', 'w']);
function genDeep() {
  const world = genWorld();
  for (const [x, y, c] of world.isle) world.tiles[y][x] = c;
  const w = Math.floor(world.w / 2), h = Math.floor(world.h / 2);
  const T = [];
  for (let y = 0; y < h; y++) {
    T.push([]);
    for (let x = 0; x < w; x++) {
      let sea = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (world.at(x * 2 + dx, y * 2 + dy) === '~') sea++;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      T[y].push(!edge && sea === 4 ? '.' : '#');
    }
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : T[y][x];
  const carve = (x0, y0, x1, y1) => {
    let x = x0, y = y0, n = 0;
    while ((x !== x1 || y !== y1) && n++ < 300) {
      if (x !== x1 && (y === y1 || hash(x, y, 1701) < 0.5)) x += Math.sign(x1 - x); else y += Math.sign(y1 - y);
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && T[y][x] === '#') T[y][x] = '.';
    }
  };
  const P = DIVE_SPOTS.map(s => ({ x: s.x / 2, y: s.y / 2 }));
  const L = DEEP_LOC;
  // the trench network
  carve(P[0].x, P[0].y, L.H.x, L.H.y); carve(P[1].x, P[1].y, L.H.x, L.H.y); carve(P[2].x, P[2].y, L.H.x, L.H.y);
  carve(L.H.x, L.H.y, L[0].x, L[0].y); carve(P[2].x, P[2].y, L[0].x, L[0].y);
  carve(P[3].x, P[3].y, L.I.x, L.I.y); carve(P[3].x, P[3].y, P[2].x, P[2].y);
  // features
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (T[y][x] !== '.') continue;
    const n = fbm(x * 0.21, y * 0.21, 4242), k = fbm(x * 0.3, y * 0.3, 77);
    const nearRock = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === '#');
    if (k > 0.6) T[y][x] = 'k';
    else if (n > 0.74 && !nearRock) T[y][x] = 'o';
    else if (nearRock && hash(x, y, 31) < 0.1) T[y][x] = 'c';
    else if (hash(x, y, 32) < 0.025) T[y][x] = 'v';
  }
  // keep the network open: clear features on every carved line and around key points
  const keep = [...P, L.H, L[0], L.I];
  for (const p of keep) for (let y = p.y - 1; y <= p.y + 1; y++) for (let x = p.x - 1; x <= p.x + 1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1) T[y][x] = '.';
  const reachAll = () => {
    const D = new Set([P[0].x + ',' + P[0].y]), q = [[P[0].x, P[0].y]];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, key = nx + ',' + ny; if (!D.has(key) && !DEEP_SOLID.has(at(nx, ny))) { D.add(key); q.push([nx, ny]); } } }
    return keep.every(p => D.has(p.x + ',' + p.y));
  };
  // boulders and coral that cut the network are removed until everything connects
  for (let pass = 0; pass < 40 && !reachAll(); pass++)
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if ((T[y][x] === 'o' || T[y][x] === 'c') && hash(x, y, 900 + pass) < 0.3) T[y][x] = '.';
  // wrecks (chests sit next to them)
  const wrecks = [];
  for (const [wx, wy] of [[16, 9], [36, 20], [8, 16]]) {
    let best = null, bd = 1e9;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 2; x++) if (T[y][x] === '.' && T[y][x + 1] === '.' && !keep.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) { const d = Math.abs(x - wx) + Math.abs(y - wy); if (d < bd) { bd = d; best = { x, y }; } }
    if (best) { T[best.y][best.x] = 'w'; if (!reachAll()) T[best.y][best.x] = '.'; else wrecks.push({ x: best.x + 1, y: best.y }); }
  }
  for (const p of P) T[p.y][p.x] = 'u';
  T[L.H.y][L.H.x] = 'H'; T[L[0].y][L[0].x] = '0';
  // the Rift stays sealed rock until the Tide calls (applyDeepFlags opens it)
  T[L.I.y][L.I.x] = '#';
  return new GameMap({ id: 'deep', kind: 'deep', w, h, tiles: T, name: 'The Sea Floor', wrecks, enc: 'u1', bg: 'deep' });
}
function worldRegionAt(map, x, y) {
  const c = map.at(x, y);
  if (c === '~' || c === 'r') return 'sea';
  const reg = map.region[y][x];
  if (reg === 'A') return x < riverX(y) ? 'r1' : 'r2';
  if (reg === 'B') return 'r3';
  if (reg === 'C') return 'r4';
  if (reg === 'E') return 'r3';
  if (reg === 'F' || reg === 'G') return 'r5';
  if (reg === 'H') return 'r6';
  return 'r1';
}
function worldBattleBG(map, x, y) {
  const c = map.at(x, y), reg = map.region[y] && map.region[y][x];
  if (c === '~' || c === 'r') return 'sea';
  if (reg === 'C') return 'dusk';
  if (reg === 'H') return 'ash';
  if (reg === 'F' || reg === 'G') return 'desert';
  if (c === '*' || c === 'P' || c === 'M') return 'snow';
  if (c === 'T') return 'forest';
  if (c === 's') return 'beach';
  return 'plains';
}

// ------------ TOWNS ------------
const TOWN_DEFS = {
  brightwater: {
    name: 'Brightwater', w: 24, h: 18, border: 't', theme: 'grass', music: 'town', loc: 'A',
    exits: [[11, 17], [12, 17]],
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, kind: 'hall', roof: '#b5533c', sign: 'hall', chimney: true, id: 'hall' },
      { x: 10, y: 2, w: 4, h: 4, kind: 'house', roof: '#7a5a9a', id: 'arinhouse', chimney: true },
      { x: 16, y: 2, w: 6, h: 4, kind: 'inn', roof: '#3a6ad0', sign: 'inn', id: 'inn', price: 10 },
      { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#3a8a4a', sign: 'item', id: 'items', shop: 'brightwater_items' },
      { x: 17, y: 10, w: 5, h: 4, kind: 'shop', roof: '#8a5a2a', sign: 'arms', id: 'arms', shop: 'brightwater_arms' }
    ],
    paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
    water: [[15, 15, 4, 2]],
    decor: [[14, 9, 'w'], [9, 9, 'l'], [15, 12, 'l'], [8, 15, 'F'], [9, 15, 'F'], [10, 15, 'F'], [1, 8, 'f'], [2, 8, 'f'], [21, 8, 'f'], [5, 16, 'f'], [6, 16, 'f']]
  },
  halden: {
    name: 'Port Halden', w: 26, h: 20, border: 't', theme: 'grass', music: 'town', loc: 'B',
    exits: [[0, 9], [0, 10]],
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#3a6ad0', sign: 'inn', id: 'inn', price: 30, chimney: true },
      { x: 10, y: 1, w: 6, h: 5, kind: 'chapel', roof: '#3a5a9a', id: 'chapel' },
      { x: 18, y: 2, w: 3, h: 4, kind: 'house', roof: '#c08a3a', id: 'house1' },
      { x: 2, y: 12, w: 5, h: 4, kind: 'shop', roof: '#3a8a4a', sign: 'item', id: 'items', shop: 'halden_items' },
      { x: 8, y: 12, w: 5, h: 4, kind: 'shop', roof: '#8a5a2a', sign: 'arms', id: 'arms', shop: 'halden_arms' },
      { x: 15, y: 12, w: 5, h: 4, kind: 'house', roof: '#2a8ab8', sign: 'anchor', id: 'harbor' }
    ],
    paths: [[0, 9, 21, 10], [4, 6, 19, 6], [9, 6, 9, 10], [4, 16, 19, 16], [14, 10, 14, 16]],
    water: [[22, 1, 3, 18]],
    piers: [[21, 9, 4, 2], [21, 15, 3, 1]],
    decor: [[20, 11, 'c'], [20, 8, 'c'], [13, 8, 'l'], [5, 8, 'l'], [16, 18, 'f'], [17, 18, 'f'], [3, 18, 'f'], [8, 18, 'g']]
  },
  frostmere: {
    name: 'Frostmere', w: 24, h: 18, border: 'P', theme: 'snow', music: 'town', loc: 'D',
    exits: [[11, 17], [12, 17]],
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#4a6a9a', sign: 'inn', id: 'inn', price: 120, chimney: true },
      { x: 10, y: 1, w: 5, h: 5, kind: 'house', roof: '#3a3a6a', id: 'wren', chimney: true },
      { x: 17, y: 2, w: 5, h: 4, kind: 'shop', roof: '#3a7a6a', sign: 'item', id: 'items', shop: 'frostmere_items' },
      { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#7a4a3a', sign: 'arms', id: 'arms', shop: 'frostmere_arms', chimney: true },
      { x: 17, y: 10, w: 5, h: 4, kind: 'house', roof: '#8a6a3a', id: 'sable', chimney: true }
    ],
    paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
    water: [[15, 15, 3, 2]],
    decor: [[9, 9, 'l'], [14, 9, 'l'], [14, 12, 'w'], [7, 15, 'c'], [20, 16, 'P'], [3, 16, 'P'], [9, 12, 'P']]
  },
  mirage: {
    name: 'Mirage', w: 24, h: 18, border: 'm', theme: 'sand', music: 'town', loc: 'E',
    exits: [[11, 17], [12, 17]],
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#c06a3a', sign: 'inn', id: 'inn', price: 150, wall: '#e8c898' },
      { x: 10, y: 1, w: 5, h: 5, kind: 'hall', roof: '#3a8a8a', sign: 'hall', id: 'palace', wall: '#e8d0a8' },
      { x: 17, y: 2, w: 5, h: 4, kind: 'shop', roof: '#8a3a5a', sign: 'item', id: 'items', shop: 'mirage_items', wall: '#e8c898' },
      { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#6a4a8a', sign: 'arms', id: 'arms', shop: 'mirage_arms', wall: '#e8c898' },
      { x: 17, y: 10, w: 5, h: 4, kind: 'house', roof: '#c08a3a', id: 'house1', wall: '#e8c898' }
    ],
    paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
    water: [[9, 9, 6, 3]],
    decor: [[8, 9, 't'], [15, 9, 't'], [8, 11, 't'], [15, 11, 't'], [5, 16, 'c'], [20, 16, 'c'], [9, 15, 'l'], [14, 15, 'l']]
  },
  aerie: {
    name: 'Aerie', w: 24, h: 18, border: 'm', theme: 'grass', music: 'town', loc: 'F',
    exits: [[11, 17], [12, 17]],
    buildings: [
      { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#5a8ad0', sign: 'inn', id: 'inn', price: 200, chimney: true },
      { x: 9, y: 1, w: 7, h: 5, kind: 'arena', roof: '#a03a2a', sign: 'arena', id: 'arena', wall: '#d8cfc0' },
      { x: 17, y: 2, w: 5, h: 4, kind: 'shop', roof: '#3a8a5a', sign: 'item', id: 'items', shop: 'aerie_items' },
      { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#8a5a2a', sign: 'arms', id: 'arms', shop: 'aerie_arms' },
      { x: 17, y: 10, w: 5, h: 4, kind: 'house', roof: '#7a5a9a', id: 'house1', chimney: true }
    ],
    paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
    water: [],
    decor: [[9, 9, 'w'], [14, 9, 'l'], [9, 12, 'f'], [14, 12, 'f'], [5, 16, 't'], [19, 16, 't'], [8, 16, 'f'], [15, 16, 'f']]
  },
  ironhold: {
    name: 'Ironhold', w: 26, h: 20, border: 'r', theme: 'stone', music: 'town', loc: 'C',
    exits: [[12, 19], [13, 19]],
    buildings: [
      { x: 2, y: 2, w: 7, h: 5, kind: 'hall', roof: '#4a4a6a', sign: 'hall', id: 'barracks', wall: '#a8a296' },
      { x: 10, y: 2, w: 6, h: 4, kind: 'inn', roof: '#7a3a3a', sign: 'inn', id: 'inn', price: 80, wall: '#b8b2a6', chimney: true },
      { x: 18, y: 2, w: 6, h: 4, kind: 'jail', roof: '#3a3a40', sign: 'jail', id: 'jail' },
      { x: 2, y: 11, w: 5, h: 4, kind: 'shop', roof: '#3a5a4a', sign: 'item', id: 'items', shop: 'ironhold_items' },
      { x: 9, y: 11, w: 4, h: 4, kind: 'house', roof: '#6a5a4a', id: 'house1' },
      { x: 17, y: 11, w: 6, h: 4, kind: 'shop', roof: '#5a3a2a', sign: 'arms', id: 'arms', shop: 'ironhold_arms', chimney: true }
    ],
    paths: [[12, 7, 13, 19], [4, 7, 21, 8], [4, 15, 21, 16]],
    water: [],
    decor: [[16, 13, 'a'], [24, 14, 'c'], [1, 9, 'l'], [24, 9, 'l'], [9, 17, 'l'], [16, 17, 'l'], [7, 9, 'P'], [18, 9, 'P']]
  }
};
TOWN_DEFS.lastlight = {
  name: 'Lastlight', w: 24, h: 18, border: 'r', theme: 'ash', music: 'ashtown', loc: 'G',
  exits: [[11, 17], [12, 17]],
  buildings: [
    { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#5a4a5a', sign: 'inn', id: 'inn', price: 300, chimney: true, wall: '#8a8480' },
    { x: 9, y: 1, w: 6, h: 5, kind: 'hall', roof: '#7a3a2a', sign: 'hall', id: 'wardhall', wall: '#9a948a' },
    { x: 17, y: 2, w: 5, h: 4, kind: 'chapel', roof: '#4a3a5a', id: 'chapel' },
    { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#3a5a4a', sign: 'item', id: 'items', shop: 'lastlight_items', wall: '#8a8480' },
    { x: 17, y: 10, w: 5, h: 4, kind: 'shop', roof: '#6a3a2a', sign: 'arms', id: 'arms', shop: 'lastlight_arms', chimney: true, wall: '#8a8480' }
  ],
  paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
  water: [[8, 15, 3, 2]],
  decor: [[11, 9, 'b'], [12, 9, 'b'], [8, 9, 'l'], [15, 9, 'l'], [8, 12, 'g'], [9, 12, 'g'], [15, 12, 'g'], [20, 16, 'c'], [3, 16, 'c'], [14, 16, 'l']]
};
// 1.7: Nerith, the Sea Mother's sunken city (it keeps its own air), and the Undermarket beneath Ironhold
TOWN_DEFS.nerith = {
  name: 'Nerith', w: 24, h: 18, border: 'r', theme: 'stone', music: 'nerith', loc: 'H', underwater: true,
  exits: [[11, 17], [12, 17]],
  buildings: [
    { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#2a6a7a', sign: 'inn', id: 'inn', price: 500, wall: '#9ab8c0' },
    { x: 9, y: 1, w: 6, h: 5, kind: 'chapel', roof: '#3a8a9a', id: 'temple', wall: '#b8d0d4' },
    { x: 17, y: 2, w: 5, h: 4, kind: 'hall', roof: '#2a5a6a', sign: 'hall', id: 'archive', wall: '#9ab8c0' },
    { x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#3a7a6a', sign: 'item', id: 'items', shop: 'nerith_items', wall: '#9ab8c0' },
    { x: 17, y: 10, w: 5, h: 4, kind: 'shop', roof: '#2a4a6a', sign: 'arms', id: 'arms', shop: 'nerith_arms', wall: '#9ab8c0' }
  ],
  paths: [[11, 6, 12, 17], [3, 6, 20, 7], [4, 14, 19, 14]],
  water: [[8, 15, 3, 2], [14, 15, 3, 2]],
  decor: [[11, 9, 'w'], [8, 9, 'l'], [15, 9, 'l'], [8, 12, 'P'], [15, 12, 'P'], [20, 16, 'g'], [3, 16, 'g'], [5, 8, 'l'], [19, 8, 'l']]
};
TOWN_DEFS.undermarket = {
  name: 'The Undermarket', w: 22, h: 16, border: 'r', theme: 'stone', music: 'undermarket', loc: 'C', underground: true,
  exitTo: { map: 'in:ironhold:jail', x: 6, y: 6 },
  exits: [[10, 15], [11, 15]],
  buildings: [
    { x: 2, y: 2, w: 6, h: 4, kind: 'inn', roof: '#4a3a2a', sign: 'inn', id: 'inn', price: 40, wall: '#7a746a' },
    { x: 9, y: 1, w: 5, h: 5, kind: 'hall', roof: '#3a3a3a', sign: 'hall', id: 'guild', wall: '#6a645a' },
    { x: 15, y: 2, w: 5, h: 4, kind: 'house', roof: '#5a3a4a', id: 'broker', wall: '#7a746a' },
    { x: 8, y: 9, w: 6, h: 4, kind: 'shop', roof: '#2a2a2a', sign: 'item', id: 'market', shop: 'blackmarket', wall: '#6a645a' }
  ],
  paths: [[10, 6, 11, 15], [3, 6, 18, 7], [3, 13, 18, 13]],
  water: [[1, 9, 3, 3]],
  decor: [[5, 9, 'c'], [6, 10, 'c'], [16, 9, 'c'], [17, 10, 'l'], [4, 8, 'l'], [15, 12, 'b'], [18, 14, 'g']]
};
const TOWN_SOLID = new Set(['t', 'P', 'r', '~', 'F', 'w', 'c', 'a', 'g', 'l', 'm', 'b']);
function buildTown(id) {
  const d = TOWN_DEFS[id];
  const tiles = [];
  for (let y = 0; y < d.h; y++) {
    tiles.push([]);
    for (let x = 0; x < d.w; x++) {
      const edge = x === 0 || y === 0 || x === d.w - 1 || y === d.h - 1;
      tiles[y].push(edge ? d.border : (hash(x, y, 31) < 0.06 && d.theme !== 'stone' && d.theme !== 'ash' ? 'f' : '.'));
    }
  }
  for (const [x, y, w, h] of d.water || []) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = '~';
  for (const [x0, y0, x1, y1] of d.paths) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) tiles[y][x] = ':';
  for (const [x, y, w, h] of d.piers || []) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) tiles[yy][xx] = 'p';
  for (const [x, y, c] of d.decor || []) tiles[y][x] = c;
  for (const [x, y] of d.exits) tiles[y][x] = ':';
  const buildings = d.buildings.map(b => ({ ...b, doorX: b.x + Math.floor(b.w / 2) }));
  if (d.theme === 'snow' || d.theme === 'sand' || d.theme === 'ash') for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (tiles[y][x] === 'f') tiles[y][x] = '.';
  const m = new GameMap({ id, kind: 'town', w: d.w, h: d.h, tiles, buildings, theme: d.theme, name: d.name, music: d.music, loc: d.loc, underwater: !!d.underwater, underground: !!d.underground });
  return m;
}

// ------------ DUNGEONS ------------
const DUNGEONS = {
  hollow: { name: 'Whisperwood Hollow', theme: 'hollow', floors: 2, w: 34, h: 26, seed: 101, enc: 'd1', bg: 'cave', loc: '1',
    loot: [['potion', 'potion', 'antidote', 'gold:120'], ['iron_sword', 'ether', 'plume']], boss: 'gloomcap', lantern: 'ember', lanternCol: '#ff9a3a' },
  shrine: { name: 'Sunken Shrine', theme: 'shrine', floors: 2, w: 38, h: 28, seed: 202, enc: 'd2', bg: 'shrine', loc: '2', deco: '~', deco2: 'k',
    loot: [['hipotion', 'silk_robe', 'gold:400', 'ether'], ['tide_mace', 'chain_mail', 'plume', 'hipotion']], boss: 'warden', lantern: 'tide', lanternCol: '#5af0d0' },
  mine: { name: 'Emberdeep Mines', theme: 'mine', floors: 3, w: 38, h: 28, seed: 303, enc: 'd3', bg: 'mine', loc: '3', deco: 'L',
    loot: [['hipotion', 'hipotion', 'gold:900', 'bomb'], ['mythril_sword', 'star_rod', 'ether', 'plume'], ['mythril_mail', 'mythril_knife', 'elixir', 'star_robe']], boss: 'vesper', lantern: 'stone', lanternCol: '#ff6a2a' },
  spire: { name: 'Hollow Spire', theme: 'spire', floors: 3, w: 36, h: 28, seed: 404, enc: 'd4', bg: 'spire', loc: '4', deco2: 'k',
    loot: [['xpotion', 'hiether', 'shadow_garb', 'gold:3000'], ['dawn_plate', 'seraph_mace', 'ember_scepter', 'elixir'], ['dawnblade', 'shadow_fang', 'megalixir', 'xpotion']], boss: 'king', lantern: 'dawn', lanternCol: '#ffe08a' },
  tomb: { name: 'Tomb of the First King', theme: 'tomb', floors: 3, w: 36, h: 28, seed: 606, enc: 'd6', bg: 'tomb', loc: '6', deco2: 'o',
    loot: [['hiether', 'gold:5000', 'xpotion', 'desert_veil'], ['pharaoh_mace', 'sand_kris', 'elixir', 'megalixir'], ['nocturne', 'xpotion', 'hiether']], boss: 'firstking', lantern: 'sun', lanternCol: '#ffc04a' },
  observatory: { name: 'Starfall Observatory', theme: 'astral', floors: 3, w: 36, h: 28, seed: 505, enc: 'd5', bg: 'astral', loc: '5', deco2: 'k',
    loot: [['swift_boots', 'megalixir', 'gold:8000', 'xpotion'], ['ember_heart', 'celestia', 'astral_mace', 'elixir'], ['lightbringer', 'comet_edge', 'megalixir', 'hiether']], boss: 'wyrm', lantern: 'fifth', lanternCol: '#a8d8ff' },
  embercave: { name: 'Ember Caves', theme: 'mine', floors: 2, w: 34, h: 26, seed: 808, enc: 'd8', bg: 'mine', loc: '8', deco: 'L', noLantern: true,
    loot: [['xpotion', 'ember_core', 'gold:6000', 'hiether'], ['megalixir', 'ember_core', 'star_bomb']], boss: 'hearthwarden' },
  grotto: { name: 'Sea Mother\'s Grotto', theme: 'shrine', floors: 2, w: 34, h: 26, seed: 909, enc: 'd9', bg: 'shrine', loc: '9', deco: '~', deco2: 'k', noLantern: true,
    loot: [['xpotion', 'frost_crystal', 'gold:6000', 'hiether'], ['megalixir', 'sun_gold', 'elixir']], boss: 'abbot' },
  undercity: { name: 'The Undercity', theme: 'undercity', floors: 2, w: 36, h: 26, seed: 1010, enc: 'd10', bg: 'mine', loc: 'C', deco: '~', deco2: 'o', noLantern: true,
    exitTo: { map: 'in:ironhold:jail', x: 6, y: 6 },
    loot: [['xpotion', 'dusk_silk', 'gold:9000', 'elixir'], ['megalixir', 'dusk_silk', 'gold:15000']], boss: 'vane' },
  // 1.7 The Drowned Kingdom
  palace: { name: 'The Drowned Palace', theme: 'palace', floors: 4, w: 38, h: 30, seed: 1111, enc: 'd11', bg: 'palace', loc: '0', deco: '~', deco2: 'k', noLantern: true,
    loot: [['deep_pearl', 'xpotion', 'gold:14000', 'hiether'], ['kelp_robe', 'megalixir', 'deep_pearl', 'star_bomb'], ['pressure_ring', 'elixir', 'deep_pearl', 'megalixir'], ['megalixir', 'gold:25000', 'deep_pearl']], boss: 'nereus' },
  hadal: { name: 'The Hadal Rift', theme: 'hadal', floors: 2, w: 36, h: 28, seed: 1212, enc: 'd12', bg: 'hadal', loc: 'I', deco: '~', deco2: 'k', noLantern: true,
    loot: [['deep_pearl', 'megalixir', 'gold:30000', 'elixir'], ['megalixir', 'deep_pearl', 'megalixir']], boss: 'tide' },
  abyss: { name: 'Crownfall Abyss', theme: 'abyss', floors: 4, w: 38, h: 30, seed: 707, enc: 'd7', bg: 'abyss', loc: '7', deco: 'L', deco2: 'k',
    loot: [['abyss_ash', 'xpotion', 'gold:12000', 'hiether'], ['ash_robe', 'megalixir', 'abyss_ash', 'star_bomb'], ['ash_mail', 'elixir', 'abyss_ash', 'megalixir'], ['nightglass', 'megalixir', 'gold:20000', 'abyss_ash']], boss: 'crown', lantern: 'night', lanternCol: '#b8a8ff' }
};
const DUNGEON_SOLID = new Set(['#', '~', 'L', 'o', 'k']);
function genDungeonFloor(did, f) {
  const def = DUNGEONS[did];
  const rng = mulberry(def.seed + f * 977);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const w = def.w, h = def.h;
  const T = Array.from({ length: h }, () => Array(w).fill('#'));
  const last = f === def.floors - 1;
  const rooms = [];
  if (last) rooms.push({ x: Math.floor((w - 11) / 2), y: 2, w: 11, h: 9, boss: true });
  let tries = 0;
  const target = last ? 8 : 9;
  while (rooms.length < target && tries++ < 600) {
    const rw = ri(4, 8), rh = ri(4, 6);
    const rx = ri(1, w - rw - 2), ry = ri(2, h - rh - 2);
    if (rooms.some(r => rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y)) continue;
    rooms.push({ x: rx, y: ry, w: rw, h: rh });
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) T[y][x] = '.';
  const ctr = r => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)];
  const corridor = (a, b) => {
    let [x, y] = ctr(a); const [x1, y1] = ctr(b);
    const hFirst = rng() < 0.5;
    const stepX = () => { while (x !== x1) { x += Math.sign(x1 - x); T[y][x] = '.'; } };
    const stepY = () => { while (y !== y1) { y += Math.sign(y1 - y); T[y][x] = '.'; } };
    if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
  };
  // connect: each room to nearest earlier room (in a shuffled order)
  const order = rooms.slice(); // keep boss first
  for (let i = 1; i < order.length; i++) {
    let best = null, bd = 1e9;
    for (let j = 0; j < i; j++) { const [ax, ay] = ctr(order[i]), [bx, by] = ctr(order[j]); const d = Math.abs(ax - bx) + Math.abs(ay - by); if (d < bd) { bd = d; best = order[j]; } }
    corridor(order[i], best);
  }
  for (let k = 0; k < 2; k++) { const a = order[ri(0, order.length - 1)], b = order[ri(0, order.length - 1)]; if (a !== b && !a.boss && !b.boss) corridor(a, b); }
  // keep top border rows solid
  for (let x = 0; x < w; x++) { T[0][x] = '#'; T[1][x] = '#'; T[h - 1][x] = '#'; }
  for (let y = 0; y < h; y++) { T[y][0] = '#'; T[y][w - 1] = '#'; }
  const bfs = (sx, sy, blockSet = DUNGEON_SOLID) => {
    const D = Array.from({ length: h }, () => Array(w).fill(-1));
    const q = [[sx, sy]]; D[sy][sx] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || D[ny][nx] >= 0 || blockSet.has(T[ny][nx]) || T[ny][nx] === 'C') continue;
        D[ny][nx] = D[y][x] + 1; q.push([nx, ny]);
      }
    }
    return D;
  };
  let start, end, bossRoom = null;
  if (last) {
    bossRoom = rooms[0];
    const [bx, by] = ctr(bossRoom);
    const D = bfs(bx, by);
    let far = null, fd = -1;
    for (const r of rooms.slice(1)) { const [x, y] = ctr(r); if (D[y][x] > fd) { fd = D[y][x]; far = r; } }
    start = far;
  } else {
    start = rooms[1] || rooms[0];
    const [sx, sy] = ctr(start);
    const D = bfs(sx, sy);
    let far = null, fd = -1;
    for (const r of rooms) { if (r === start) continue; const [x, y] = ctr(r); if (D[y][x] > fd) { fd = D[y][x]; far = r; } }
    end = far;
  }
  const [ux, uy] = ctr(start);
  T[uy][ux] = '<';
  let down = null;
  if (end) { const [dx, dy] = ctr(end); T[dy][dx] = '>'; down = { x: dx, y: dy }; }
  // all key points that must stay reachable
  const keys = rooms.map(ctr);
  const reachableAll = () => {
    const D = bfs(ux, uy);
    return keys.every(([x, y]) => D[y][x] >= 0);
  };
  const tryPlace = (cells, ch) => {
    if (cells.some(([x, y]) => T[y][x] !== '.')) return false;
    const old = cells.map(([x, y]) => T[y][x]);
    cells.forEach(([x, y]) => T[y][x] = ch);
    if (!reachableAll()) { cells.forEach(([x, y], i) => T[y][x] = old[i]); return false; }
    return true;
  };
  // boss room furniture
  const extras = { chests: [], boss: null, lantern: null };
  if (bossRoom) {
    const [cx] = ctr(bossRoom);
    extras.lantern = { x: cx, y: bossRoom.y + 1 };
    extras.boss = { x: cx, y: bossRoom.y + 4 };
    for (const py of [bossRoom.y + 1, bossRoom.y + 5]) { tryPlace([[bossRoom.x + 1, py]], 'o'); tryPlace([[bossRoom.x + bossRoom.w - 2, py]], 'o'); }
  }
  // decorations
  for (const r of rooms) {
    if (r === start || r.boss) continue;
    if (def.deco && r.w >= 6 && r.h >= 5 && rng() < 0.7) {
      const corner = ri(0, 3);
      const x0 = corner % 2 ? r.x + r.w - 3 : r.x + 1, y0 = corner < 2 ? r.y + 1 : r.y + r.h - 3;
      tryPlace([[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]], def.deco);
    }
    if (def.deco2 && rng() < 0.5) tryPlace([[r.x + (rng() < 0.5 ? 0 : r.w - 1), r.y]], def.deco2);
  }
  // chests
  const loot = def.loot[f] || [];
  const chestRooms = rooms.filter(r => r !== start && !r.boss);
  let li = 0, guard = 0;
  while (li < loot.length && guard++ < 200) {
    const r = chestRooms[(li + guard) % chestRooms.length];
    const cand = [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]];
    const [x, y] = cand[ri(0, 3)];
    if (T[y][x] !== '.' || extras.chests.some(c => c.x === x && c.y === y)) continue;
    T[y][x] = 'C';
    if (!reachableAll()) { T[y][x] = '.'; continue; }
    extras.chests.push({ x, y, loot: loot[li] });
    li++;
  }
  // a free corner tile for quest objects
  for (const r of rooms) {
    if (extras.spot || r === start || r.boss || (end && r === end)) continue;
    for (const [x, y] of [[r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x, r.y], [r.x + r.w - 1, r.y + r.h - 1]]) {
      if (T[y][x] !== '.') continue;
      T[y][x] = 'C';
      const ok = reachableAll();
      T[y][x] = '.';
      if (ok) { extras.spot = { x, y }; break; }
    }
  }
  // torches
  const torches = new Set();
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) if (T[y][x] === '#' && T[y + 1][x] !== '#' && hash(x, y, def.seed + f) < 0.13) torches.add(x + ',' + y);
  // replace chest markers with floor (chests are entities)
  for (const c of extras.chests) T[c.y][c.x] = '.';
  return new GameMap({ id: did + ':' + f, kind: 'dungeon', dungeon: did, floor: f, w, h, tiles: T, theme: def.theme, name: def.name + (def.floors > 1 ? ` ${f + 1}F` : ''), up: { x: ux, y: uy }, down, extras, torches, enc: def.enc, bg: def.bg });
}
