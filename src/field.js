'use strict';
// ============================================================
//  FIELD — exploration scene
// ============================================================
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const URLP = new URLSearchParams(location.search);
const NO_ENC = URLP.has('noenc');

function getMap(id) {
  if (G.maps[id]) return G.maps[id];
  let m;
  if (id === 'world') m = genWorld();
  else if (TOWN_DEFS[id]) m = buildTown(id);
  else { const [did, f] = id.split(':'); m = genDungeonFloor(did, parseInt(f)); }
  G.maps[id] = m;
  return m;
}
function populate(map) {
  map.entities = [];
  if (map.kind === 'world') applyWorldFlags(map);
  if (map.kind === 'town') {
    for (const n of townNpcs(map.id)) map.entities.push({ kind: 'npc', dir: 'down', home: { x: n.x, y: n.y }, ox: 0, oy: 0, mt: 0, wt: 1 + Math.random() * 3, ...n });
  } else if (map.kind === 'dungeon') {
    const did = map.dungeon, def = DUNGEONS[did];
    for (const c of map.extras.chests) {
      const key = `chest:${map.id}:${c.x},${c.y}`;
      map.entities.push({ kind: 'chest', x: c.x, y: c.y, key, loot: c.loot, opened: !!G.flags[key] });
    }
    if (map.extras.lantern) map.entities.push({ kind: 'lantern', x: map.extras.lantern.x, y: map.extras.lantern.y, did, lit: !!G.flags['lantern_' + did], col: def.lanternCol });
    if (map.extras.boss && !G.flags['boss_' + did]) map.entities.push({ kind: 'boss', x: map.extras.boss.x, y: map.extras.boss.y, did, def: MONSTERS[def.boss] });
  }
}
function refreshEntities() { if (Field.map) populate(Field.map); }

const Field = {
  map: null, anim: null, walkT: 0, banner: null, t: 0, lastStepSfx: 0,
  enter(mapId, x, y, dir) {
    const map = getMap(mapId);
    this.map = map; G.mapId = mapId; G.x = x; G.y = y; if (dir) G.dir = dir;
    this.anim = null;
    populate(map);
    G.scene = this;
    this.playMusic();
    if (map.kind !== 'world') this.banner = { text: map.name, t: 2.6 };
  },
  playMusic() {
    const m = this.map;
    if (m.kind === 'world') Audio_.play(G.onShip ? 'sea' : 'world');
    else if (m.kind === 'town') Audio_.play('town');
    else Audio_.play(m.dungeon === 'spire' ? 'spire' : 'dungeon');
  },
  entityAt(x, y) { return this.map.entities.find(e => e.x === x && e.y === y && e.kind !== 'ghost'); },
  buildingAt(x, y) { return (this.map.buildings || []).find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); },
  walkable(x, y) {
    const m = this.map, c = m.at(x, y);
    if (c === undefined) return false;
    if (m.kind === 'world') return !(c === '~' || c === 'r' || c === '^' || c === 'M' || c === 'x');
    if (m.kind === 'town') return !TOWN_SOLID.has(c) && !this.buildingAt(x, y);
    return !DUNGEON_SOLID.has(c);
  },
  update(dt) {
    if (this.anim) return;
    if (Input.p('cancel')) { runScript(openMainMenu); return; }
    if (Input.p('ok')) { this.interact(); return; }
    for (const d of ['up', 'down', 'left', 'right']) {
      if (Input.h(d) || Input.p(d)) { this.tryMove(d); break; }
    }
  },
  async interact() {
    const [dx, dy] = DIRS[G.dir];
    const tx = G.x + dx, ty = G.y + dy;
    const e = this.entityAt(tx, ty);
    if (e) {
      if (e.kind === 'npc' && e.talk) {
        e.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[G.dir];
        runScript(async () => { await e.talk(e); refreshEntities(); });
      } else if (e.kind === 'chest') runScript(() => openChest(e));
      else if (e.kind === 'lantern') runScript(() => examineLantern(e));
      else if (e.kind === 'boss') runScript(() => bossEncounter(e.did));
      return;
    }
    if (this.map.kind === 'town') {
      const b = this.buildingAt(tx, ty);
      if (b && tx === b.doorX && ty === b.y + b.h - 1) runScript(() => doorEvent(this.map.id, b));
      else if (b) runScript(() => narrate('A sturdy wall.'));
    }
  },
  tryMove(d) {
    G.dir = d;
    const [dx, dy] = DIRS[d];
    const nx = G.x + dx, ny = G.y + dy;
    const m = this.map;
    if (m.kind === 'town' && (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h)) { runScript(() => leaveTown()); return; }
    if (m.kind === 'world') {
      const c = m.at(nx, ny);
      if (c === undefined) return this.bump();
      if (G.onShip) {
        if (c === '~' || c === 'r') return this.startMove(nx, ny, true);
        if (this.walkable(nx, ny)) {
          G.ship = { x: G.x, y: G.y, dir: d };
          G.onShip = false;
          Audio_.play('world');
          return this.startMove(nx, ny);
        }
        return this.bump();
      }
      if (G.ship && G.flags.ship && G.ship.x === nx && G.ship.y === ny) {
        G.onShip = true; Audio_.play('sea');
        return this.startMove(nx, ny, true);
      }
      if (c === 'x') { runScript(() => narrate('The old bridge has collapsed into the river. There is no way across... yet.')); return this.bump(); }
      if (!this.walkable(nx, ny)) return this.bump();
      return this.startMove(nx, ny);
    }
    if (m.kind === 'town') {
      const b = this.buildingAt(nx, ny);
      if (b && nx === b.doorX && ny === b.y + b.h - 1) { runScript(() => doorEvent(m.id, b)); return; }
    }
    const e = this.entityAt(nx, ny);
    if (e || (G.x === nx && G.y === ny)) return this.bump();
    if (!this.walkable(nx, ny)) return this.bump();
    this.startMove(nx, ny);
  },
  bump() { if (this.t - (this._bt || 0) > 0.25) { Audio_.sfx('bump'); this._bt = this.t; } },
  startMove(nx, ny, ship = false) {
    const run = Input.h('run');
    this.anim = { fx: G.x, fy: G.y, tx: nx, ty: ny, t: 0, dur: ship ? 0.11 : run ? 0.1 : 0.16 };
  },
  tick(dt) {
    this.t += dt;
    G.playTime += dt;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    if (this.anim) {
      this.anim.t += dt / this.anim.dur;
      this.walkT += dt;
      if (this.anim.t >= 1) {
        G.x = this.anim.tx; G.y = this.anim.ty;
        if (G.onShip) G.ship = { x: G.x, y: G.y, dir: G.dir };
        this.anim = null;
        this.onStep();
      }
    }
    // NPC wandering
    if (this.map.kind === 'town') {
      for (const e of this.map.entities) {
        if (e.kind !== 'npc') continue;
        if (e.mv) {
          e.mv.t += dt / 0.3;
          if (e.mv.t >= 1) { e.x = e.mv.tx; e.y = e.mv.ty; e.mv = null; }
          continue;
        }
        if (!e.wander || Script.running) continue;
        e.wt -= dt;
        if (e.wt <= 0) {
          e.wt = 1.5 + Math.random() * 3;
          const d = pick(['up', 'down', 'left', 'right']);
          const [dx, dy] = DIRS[d];
          const nx = e.x + dx, ny = e.y + dy;
          e.dir = d;
          const tx = this.anim ? this.anim.tx : G.x, ty = this.anim ? this.anim.ty : G.y;
          if (Math.abs(nx - e.home.x) + Math.abs(ny - e.home.y) <= 2 && this.walkable(nx, ny) && !this.entityAt(nx, ny) && !(nx === G.x && ny === G.y) && !(nx === tx && ny === ty) && this.map.at(nx, ny) !== undefined)
            e.mv = { fx: e.x, fy: e.y, tx: nx, ty: ny, t: 0 };
        }
      }
    }
  },
  onStep() {
    const m = this.map;
    if (m.kind === 'world') {
      const c = m.at(G.x, G.y);
      if (/[A-C1-4]/.test(c) && !G.onShip) { runScript(() => enterLocation(c)); return; }
      this.encounterCheck(c === 'T' || c === 'P' || c === 'd' || c === 'n' ? 1.5 : 1);
    } else if (m.kind === 'dungeon') {
      const c = m.at(G.x, G.y);
      if (c === '<') { runScript(() => stairs(-1)); return; }
      if (c === '>') { runScript(() => stairs(1)); return; }
      const boss = m.entities.find(e => e.kind === 'boss');
      if (boss && Math.abs(boss.x - G.x) + Math.abs(boss.y - G.y) <= 2) { runScript(() => bossEncounter(boss.did)); return; }
      this.encounterCheck(1);
    }
  },
  encounterCheck(w) {
    if (NO_ENC || G.flags.noEnc) return;
    G.encSteps -= w;
    if (G.encSteps > 0) return;
    G.encSteps = irnd(14, 30);
    const m = this.map;
    let table, bg;
    if (m.kind === 'world') { table = worldRegionAt(m, G.x, G.y); bg = worldBattleBG(m, G.x, G.y); if (table === 'sea' && !G.onShip) table = 'r2'; }
    else { table = m.enc; bg = m.bg; }
    const grp = weighted(ENCOUNTERS[table]).g;
    runScript(async () => {
      const r = await startBattle(grp, { bg });
      if (r === 'lose') await gameOver();
    });
  },
  // -------- drawing --------
  camera() {
    let px = G.x * TS, py = G.y * TS;
    if (this.anim) { const k = this.anim.t; px = lerp(this.anim.fx, this.anim.tx, k) * TS; py = lerp(this.anim.fy, this.anim.ty, k) * TS; }
    const m = this.map;
    let cx = px - W / 2 + TS / 2, cy = py - H / 2 + TS / 2;
    const mw = m.w * TS, mh = m.h * TS;
    cx = mw <= W ? (mw - W) / 2 : clamp(cx, 0, mw - W);
    cy = mh <= H ? (mh - H) / 2 : clamp(cy, 0, mh - H);
    return { cx: Math.round(cx * 2) / 2, cy: Math.round(cy * 2) / 2, px, py };
  },
  draw(g) {
    const m = this.map, t = this.t;
    const { cx, cy, px, py } = this.camera();
    g.fillStyle = m.kind === 'dungeon' ? '#000' : m.kind === 'town' ? (m.theme === 'stone' ? '#5f574f' : '#2f6a2a') : WPAL.water;
    g.fillRect(0, 0, W, H);
    const x0 = Math.floor(cx / TS) - 1, y0 = Math.floor(cy / TS) - 1, x1 = x0 + VW + 3, y1 = y0 + VH + 3;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = x * TS - cx, sy = y * TS - cy;
      if (m.kind === 'world') drawWorldTile(g, m, x, y, sx, sy, t);
      else if (m.kind === 'town') { if (m.at(x, y) !== undefined) drawTownTile(g, m, x, y, sx, sy, t); }
      else drawDungeonTile(g, m, x, y, sx, sy, t);
    }
    // sortable drawables
    const list = [];
    for (const b of m.buildings || []) list.push({ y: (b.y + b.h) * TS - 1, draw: () => drawBuilding(g, b, cx, cy, t, m.theme) });
    for (const e of m.entities) {
      let ex = e.x, ey = e.y;
      if (e.mv) { ex = lerp(e.mv.fx, e.mv.tx, e.mv.t); ey = lerp(e.mv.fy, e.mv.ty, e.mv.t); }
      const sx = ex * TS - cx + TS / 2, sy = ey * TS - cy + TS - 2;
      list.push({ y: ey * TS + TS / 2, draw: () => drawEntity(g, e, sx, sy, t) });
    }
    if (m.kind === 'world' && G.ship && G.flags.ship && !G.onShip) {
      const sx = G.ship.x * TS - cx + TS / 2, sy = G.ship.y * TS - cy + TS - 4;
      list.push({ y: G.ship.y * TS + 10, draw: () => drawShip(g, sx, sy, t, G.ship.dir) });
    }
    const step = this.anim ? (Math.floor(this.walkT * 8) % 2 ? 1 : 2) : 0;
    const psx = px - cx + TS / 2, psy = py - cy + TS - 2;
    list.push({
      y: py + TS / 2 + 0.5, draw: () => {
        if (G.onShip) drawShip(g, psx, psy - 2, t, G.dir);
        else drawChar(g, HEROES[G.party[0].id].look, psx, psy, G.dir, step, 1, null, t);
      }
    });
    list.sort((a, b) => a.y - b.y).forEach(d => d.draw());
    // dungeon lighting
    if (m.kind === 'dungeon') {
      const th = DTHEME[m.theme];
      const R = th.light + Math.sin(t * 3) * 4;
      const gr = g.createRadialGradient(psx, psy - 14, R * 0.3, psx, psy - 14, R);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.8)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const k of m.torches) {
        const [tx, ty] = k.split(',').map(Number);
        const sx = tx * TS - cx + 16, sy = ty * TS - cy + 8;
        if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
        const lg = g.createRadialGradient(sx, sy, 2, sx, sy, 70);
        lg.addColorStop(0, 'rgba(255,150,60,.35)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
        g.fillStyle = lg; g.fillRect(sx - 70, sy - 70, 140, 140);
      }
      for (const e of m.entities) if (e.kind === 'lantern' && e.lit) {
        const sx = e.x * TS - cx + 16, sy = e.y * TS - cy - 6;
        const lg = g.createRadialGradient(sx, sy, 4, sx, sy, 160);
        lg.addColorStop(0, rgba(e.col, 0.5)); lg.addColorStop(1, rgba(e.col, 0));
        g.fillStyle = lg; g.fillRect(sx - 160, sy - 160, 320, 320);
      }
      g.restore();
    }
    if (m.kind === 'world' && G.flags.lantern3 && !G.flags.ending) {
      // the sky darkens as the King stirs
      g.fillStyle = 'rgba(40,10,60,.12)'; g.fillRect(0, 0, W, H);
    }
    if (this.banner) {
      g.save(); g.globalAlpha = clamp(this.banner.t, 0, 1);
      g.font = font(20, true, SERIF);
      const w = g.measureText(this.banner.text).width + 60;
      drawWindow(g, (W - w) / 2, 20, w, 42);
      text(g, this.banner.text, W / 2, 31, { size: 20, bold: true, fam: SERIF, align: 'center', color: '#ffe9a8' });
      g.restore();
    }
  }
};
function drawEntity(g, e, sx, sy, t) {
  if (e.kind === 'npc') {
    const step = e.mv ? (Math.floor(t * 8) % 2 ? 1 : 2) : 0;
    drawChar(g, e.look, sx, sy, e.dir, step, 1, null, t);
    if (e.mark) { const b = Math.sin(t * 5) * 2; rrect(g, sx - 8, sy - 74 + b, 16, 20, 6, '#fff8d0', OUT, 1.5); poly(g, [sx - 3, sy - 55 + b, sx + 3, sy - 55 + b, sx, sy - 50 + b], '#fff8d0'); text(g, '!', sx, sy - 72 + b, { size: 15, bold: true, align: 'center', color: '#c0302a', shadow: false }); }
  } else if (e.kind === 'chest') drawChest(g, sx, sy + 1, e.opened);
  else if (e.kind === 'lantern') drawLantern(g, sx, sy + 2, e.lit, t, e.col);
  else if (e.kind === 'boss') {
    const s = 0.45;
    drawMonster(g, e.def, sx, sy + 2, { t, scale: s });
  }
}

// ---------- transitions ----------
async function changeMap(mapId, x, y, dir) {
  Audio_.sfx('door');
  await fadeTo(1, 220);
  Field.enter(mapId, x, y, dir);
  await fadeTo(0, 260);
}
function freeNeighbor(map, x, y) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const c = map.at(x + dx, y + dy);
    if (c !== undefined && !DUNGEON_SOLID.has(c) && c !== '<' && c !== '>' && !map.extras.chests.some(ch => ch.x === x + dx && ch.y === y + dy)) return [x + dx, y + dy];
  }
  return [x, y + 1];
}
async function enterLocation(ch) {
  const L = WORLD_LOC[ch];
  if (L.town) {
    const d = TOWN_DEFS[L.town];
    const [ex, ey] = d.exits[0];
    let sx = ex, sy = ey, dir = 'up';
    if (ey === d.h - 1) { sy = ey - 1; dir = 'up'; } else if (ex === 0) { sx = 1; dir = 'right'; }
    await changeMap(L.town, sx, sy, dir);
    await onEnterTown(L.town);
  } else {
    const ok = await canEnterDungeon(L.dungeon);
    if (!ok) return;
    const m = getMap(L.dungeon + ':0');
    const [x, y] = freeNeighbor(m, m.up.x, m.up.y);
    await changeMap(m.id, x, y, 'down');
    await onEnterDungeon(L.dungeon);
  }
}
async function leaveTown() {
  const loc = WORLD_LOC[Field.map.loc];
  await changeMap('world', loc.x, loc.y, G.dir);
}
async function stairs(d) {
  const m = Field.map, did = m.dungeon, f = m.floor + d;
  Audio_.sfx('stairs');
  if (f < 0) {
    const loc = WORLD_LOC[DUNGEONS[did].loc];
    await changeMap('world', loc.x, loc.y, 'down');
    return;
  }
  const nm = getMap(did + ':' + f);
  const target = d > 0 ? nm.up : nm.down;
  const [x, y] = freeNeighbor(nm, target.x, target.y);
  await changeMap(nm.id, x, y, d > 0 ? 'down' : 'up');
}
async function openChest(e) {
  if (e.opened) { await narrate('The chest is empty.'); return; }
  e.opened = true; G.flags[e.key] = true;
  Audio_.sfx('chest');
  if (e.loot.startsWith('gold:')) { const n = parseInt(e.loot.slice(5)); G.gold += n; await narrate(`Found ${n} gold!`); }
  else { addItem(e.loot); await narrate(`Found ${ITEMS[e.loot].name}!`); }
}
async function gameOver() {
  Audio_.play('gameover');
  G.scene = GameOverScene; GameOverScene.t = 0;
  await fadeTo(0, 400);
  await wait(1800);
  await narrate('...A warm light finds you in the dark.');
  await fadeTo(1, 600);
  const inn = G.lastInn || { town: 'brightwater' };
  const d = TOWN_DEFS[inn.town];
  const b = d.buildings.find(b => b.kind === 'inn');
  G.gold = Math.floor(G.gold / 2);
  healAll();
  G.onShip = false;
  Field.enter(inn.town, b.x + Math.floor(b.w / 2), b.y + b.h, 'down');
  await fadeTo(0, 600);
  await narrate('You wake at the inn, battered but alive. Half your gold is gone.');
}
const GameOverScene = {
  t: 0,
  tick(dt) { this.t += dt; }, update() { },
  draw(g) {
    g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = clamp(this.t / 1.5, 0, 1);
    text(g, 'The lantern-light fades...', W / 2, H / 2 - 20, { size: 28, fam: SERIF, align: 'center', color: '#c8b8e8' });
    g.restore();
  }
};
