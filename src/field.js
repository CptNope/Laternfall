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
  else if (id === 'deep') m = genDeep();
  else if (id === 'heist') m = buildHeist();
  else if (TOWN_DEFS[id]) m = buildTown(id);
  else if (id.startsWith('in:')) m = buildInterior(id);
  else { const [did, f] = id.split(':'); m = genDungeonFloor(did, parseInt(f)); }
  G.maps[id] = m;
  return m;
}
function populate(map) {
  map.entities = [];
  if (map.kind === 'world') { applyWorldFlags(map); for (const q of [...worldQuestEntities(map), ...mothLampEntities(map)]) map.entities.push(q); }
  if (map.kind === 'deep') { applyDeepFlags(map); for (const q of deepEntities(map)) map.entities.push(q); }
  if (map.kind === 'heist') { Heist.t = 0; for (const q of heistEntities(map)) map.entities.push(q); }
  if (map.kind === 'town') for (const q of heistTownEntities(map)) map.entities.push(q);
  if (map.kind === 'interior') {
    for (const n of interiorNpcs(map)) map.entities.push({ kind: 'npc', dir: 'down', home: { x: n.x, y: n.y }, ox: 0, oy: 0, mt: 0, wt: 1 + Math.random() * 3, ...n });
    for (const q of interiorQuestEntities(map)) map.entities.push(q);
  }
  if (map.kind === 'town') {
    // at night the wanderers go home and the night folk come out (1.9)
    const folk = isNight() && !map.underwater && !map.underground ? [...townNpcs(map.id).filter(n => !n.wander), ...nightNpcs(map.id)] : [...townNpcs(map.id), ...cardDayNpcs(map.id)];
    for (const n of folk) map.entities.push({ kind: 'npc', dir: 'down', home: { x: n.x, y: n.y }, ox: 0, oy: 0, mt: 0, wt: 1 + Math.random() * 3, ...n });
  } else if (map.kind === 'dungeon') {
    const did = map.dungeon, def = dungeonDef(did, map.floor);
    for (const c of map.extras.chests) {
      const key = `chest:${map.id}:${c.x},${c.y}`;
      map.entities.push({ kind: 'chest', x: c.x, y: c.y, key, loot: c.loot, opened: !!G.flags[key] });
    }
    if (map.extras.lantern && !def.noLantern) map.entities.push({ kind: 'lantern', x: map.extras.lantern.x, y: map.extras.lantern.y, did, lit: !!G.flags['lantern_' + did], col: def.lanternCol });
    for (const q of questEntities(map)) map.entities.push(q);
    if (map.extras.boss && !G.flags[bossFlag(map)]) map.entities.push({ kind: 'boss', x: map.extras.boss.x, y: map.extras.boss.y, did, def: MONSTERS[def.boss] });
  }
  const guest = guestFollower(map);   // 2.4: a guest walks right behind you, Mittens behind them
  if (guest) map.entities.push(guest);
  const cat = catFollower(map);   // 2.2: Mittens walks with you in Brightwater
  if (cat) map.entities.push(cat);
}
function refreshEntities() { if (Field.map) populate(Field.map); }
function worldTrack() {
  const m = Field.map, reg = m && m.region && m.region[G.y] && m.region[G.y][G.x];
  return G.inAir ? 'sky' : G.onShip ? 'sea' : (reg === 'F' || reg === 'G') ? 'desert' : reg === 'H' ? 'ash' : 'world';
}
// which fish table applies when facing (x, y), or null if it isn't fishable water
function fishingSpot(m, x, y) {
  const c = m.at(x, y);
  if (c !== '~' && c !== 'r') return null;
  if (m.kind === 'world') { const reg = m.region[G.y] && m.region[G.y][G.x]; return c === 'r' ? 'river' : reg === 'H' ? 'ash' : 'sea'; }
  if (m.kind === 'town') return FISH_SPOTS[m.id] ? m.id : null;
  if (m.kind === 'dungeon') return FISH_SPOTS[m.dungeon] ? m.dungeon : null;
  return null;
}

const Field = {
  map: null, anim: null, walkT: 0, banner: null, t: 0, lastStepSfx: 0,
  enter(mapId, x, y, dir) {
    const map = getMap(mapId);
    this.map = map; G.mapId = mapId; G.x = x; G.y = y; if (dir) G.dir = dir;
    this.anim = null;
    populate(map);
    G.scene = this;
    this.playMusic();
    this.banner = map.kind === 'town' || map.kind === 'dungeon' || map.kind === 'deep' || map.kind === 'heist' ? { text: map.name, t: 2.6 } : null;
  },
  playMusic() {
    const m = this.map;
    if (m.kind === 'world') Audio_.play(worldTrack());
    else if (m.kind === 'deep') Audio_.play('deep');
    else if (m.kind === 'heist') Audio_.play('undermarket');
    else if (m.kind === 'interior') Audio_.play(homeSong(m) || (TOWN_DEFS[m.town] && TOWN_DEFS[m.town].music) || 'town');
    else if (m.kind === 'town') Audio_.play(m.id === 'mirage' ? 'desert' : m.music || 'town');
    else Audio_.play(m.dungeon === 'spire' ? 'spire' : m.dungeon === 'abyss' || m.dungeon === 'hadal' ? 'abyss' : m.dungeon === 'palace' ? 'deep' : 'dungeon');
  },
  entityAt(x, y) { return this.map.entities.find(e => e.x === x && e.y === y && e.kind !== 'ghost' && !e.follow); },   // a follower never blocks the way
  buildingAt(x, y) { return (this.map.buildings || []).find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); },
  walkable(x, y) {
    const m = this.map, c = m.at(x, y);
    if (c === undefined) return false;
    if (m.kind === 'world') return !(c === '~' || c === 'r' || c === '^' || c === 'M' || c === 'x' || c === 'm');
    if (m.kind === 'interior') return !INT_SOLID.has(c) && c !== '#';
    if (m.kind === 'deep') return !DEEP_SOLID.has(c);
    if (m.kind === 'heist') return !HEIST_SOLID.has(c);
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
    if (this.map.kind === 'world') {
      if (G.inAir) { runScript(landAirship); return; }
      if (G.onMoth) { runScript(dismountMoth); return; }
      if (G.onShip && diveSpotAt(G.x, G.y)) { runScript(() => diveDown(diveSpotAt(G.x, G.y))); return; }
      if (!G.onShip && digSpotAt(G.x, G.y)) { runScript(() => digTreasure(digSpotAt(G.x, G.y))); return; }
      if (G.airship && G.flags.airship && !G.onShip && G.airship.x === G.x && G.airship.y === G.y) { boardAirship(); return; }
    }
    const [dx, dy] = DIRS[G.dir];
    const tx = G.x + dx, ty = G.y + dy;
    const e = this.entityAt(tx, ty) || this.map.entities.find(f => f.follow && !f.hidden && f.x === tx && f.y === ty && !f.mv);
    if (e) {
      if (e.talk) {
        if (e.kind === 'npc') e.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[G.dir];
        runScript(async () => { await e.talk(e); refreshEntities(); });
      } else if (e.kind === 'chest') runScript(() => openChest(e));
      else if (e.kind === 'lantern') runScript(() => examineLantern(e));
      else if (e.kind === 'boss') runScript(() => bossEncounter(e.did));
      return;
    }
    const spot = fishingSpot(this.map, tx, ty);
    if (spot && hasItem('fishing_rod') && !G.onShip && !G.inAir) { runScript(() => goFishing(spot)); return; }
    if (this.map.kind === 'interior') { runScript(() => interiorInteract(tx, ty, dx, dy)); return; }
    if (this.map.kind === 'town') {
      const b = this.buildingAt(tx, ty);
      if (b && tx === b.doorX && ty === b.y + b.h - 1) runScript(() => doorEvent(this.map.id, b));
      else if (b) runScript(() => narrate(tl('A sturdy wall.')));
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
      if (G.inAir) return this.startMove(nx, ny, 'air');
      if (G.onMoth) { if (!this.walkable(nx, ny) || this.entityAt(nx, ny)) return this.bump(); return this.startMove(nx, ny, 'moth'); }
      if (!G.onShip && G.flags.airship && G.airship && G.airship.x === nx && G.airship.y === ny && !isLoc(c)) { this.startMove(nx, ny); this._board = true; return; }
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
      if (c === 'x') { runScript(() => narrate(tl('The old bridge has collapsed into the river. There is no way across... yet.'))); return this.bump(); }
      if (this.entityAt(nx, ny)) return this.bump();
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
    const run = Input.h('run') !== !!CFG.dash;
    this.anim = { fx: G.x, fy: G.y, tx: nx, ty: ny, t: 0, dur: ship === 'air' ? 0.075 : ship === 'moth' ? 0.08 : ship ? 0.11 : run ? 0.1 : 0.16 };
    followStep(this.map, this.anim);
  },
  tick(dt) {
    this.t += dt;
    G.playTime += dt;
    advanceClock(dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    if (this.anim) {
      this.anim.t += dt / this.anim.dur;
      this.walkT += dt;
      if (this.anim.t >= 1) {
        G.x = this.anim.tx; G.y = this.anim.ty;
        if (G.onShip) G.ship = { x: G.x, y: G.y, dir: G.dir };
        if (G.inAir) G.airship = { x: G.x, y: G.y, dir: G.dir };
        this.anim = null;
        if (this._board) { this._board = false; boardAirship(); return; }
        this.onStep();
      }
    }
    if (this.map.kind === 'heist') Heist.tick(this.map, dt);
    // NPC wandering
    if (this.map.kind === 'town' || this.map.kind === 'interior') {
      for (const e of this.map.entities) {
        if (e.kind !== 'npc') continue;
        if (e.mv) {
          e.mv.t += dt / (e.mv.dur || 0.3);
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
      if (G.inAir) return;
      const c = m.at(G.x, G.y);
      const reg = m.region[G.y] && m.region[G.y][G.x];
      if (!G.onShip && Audio_.curName !== worldTrack()) this.playMusic();
      if (isLoc(c) && !G.onShip) { runScript(() => enterLocation(c)); return; }
      if (G.onShip && m.whirl && G.x === m.whirl.x && G.y === m.whirl.y && !G.flags.leviathan) { runScript(whirlpoolEvent); return; }
      if (G.onMoth) { if (isLoc(c)) { G.onMoth = false; runScript(() => enterLocation(c)); } return; }   // moths never meet monsters
      this.encounterCheck(c === 'T' || c === 'P' || c === 'd' || c === 'n' ? 1.5 : 1);
    } else if (m.kind === 'deep') {
      const c = m.at(G.x, G.y);
      if (isLoc(c)) { runScript(() => enterLocation(c)); return; }
      if (c === 'u') { runScript(surfacePrompt); return; }
      this.encounterCheck(c === 'k' ? 1.5 : 1);
    } else if (m.kind === 'heist') {
      if (m.at(G.x, G.y) === 'E') { runScript(heistExit); return; }
      Heist.check(m);
    } else if (m.kind === 'interior') {
      if (m.at(G.x, G.y) === 'E') { runScript(exitInterior); return; }
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
    if (NO_ENC || G.flags.noEnc || (CFG.noEnc && G.flags.ending)) return;
    G.encSteps -= partyHasAcc('fewer') ? w * 0.5 : w;
    if (G.encSteps > 0) return;
    G.encSteps = irnd(14, 30);
    const m = this.map;
    let table, bg;
    if (m.kind === 'world') { table = worldRegionAt(m, G.x, G.y); bg = worldBattleBG(m, G.x, G.y); if (table === 'sea' && !G.onShip) table = 'r2'; }
    else { table = m.enc; bg = m.bg; }
    const night = m.kind === 'world' && isNight() && NIGHT_ENC[table] && Math.random() < 0.5;
    const grp = weighted(night ? NIGHT_ENC[table] : ENCOUNTERS[table]).g;
    runScript(async () => {
      const r = await startBattle(grp, { bg });
      if (r === 'lose') await gameOver();
    });
  },
  // -------- drawing --------
  camera() {
    let px = G.x * TS, py = G.y * TS;
    if (this.camAt) return { cx: this.camAt.x, cy: this.camAt.y, px, py };   // the editor moves the camera itself
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
    let { cx, cy, px, py } = this.camera();
    // snap the camera to whole device pixels, so cached tile chunks line up exactly
    const k = g.getTransform().a || 1;
    cx = Math.round(cx * k) / k; cy = Math.round(cy * k) / k;
    if (!TileCache.draw(g, m, cx, cy, t)) drawTilesDirect(g, m, cx, cy, t);
    // sortable drawables
    const list = [];
    for (const b of m.buildings || []) list.push({ y: (b.y + b.h) * TS - 1, draw: () => drawBuilding(g, b, cx, cy, t, m.theme) });
    for (const e of m.entities) {
      let ex = e.x, ey = e.y;
      if (e.mv) { ex = lerp(e.mv.fx, e.mv.tx, e.mv.t); ey = lerp(e.mv.fy, e.mv.ty, e.mv.t); }
      const sx = ex * TS - cx + TS / 2, sy = ey * TS - cy + TS - 2;
      list.push({ y: ey * TS + TS / 2, draw: () => drawEntity(g, e, sx, sy, t) });
    }
    if (m.kind === 'world' && G.flags.q_drowned) for (const d of DIVE_SPOTS) { const wx = d.x * TS - cx + 16, wy = d.y * TS - cy + 16; if (wx > -40 && wy > -40 && wx < W + 40 && wy < H + 40) list.push({ y: -1e6 + 1, draw: () => drawDiveSpot(g, wx, wy, t) }); }
    if (m.kind === 'world' && m.whirl && !G.flags.leviathan) { const wx = m.whirl.x * TS - cx + 16, wy = m.whirl.y * TS - cy + 16; if (wx > -40 && wy > -40 && wx < W + 40 && wy < H + 40) list.push({ y: -1e6, draw: () => drawWhirl(g, wx, wy, t) }); }
    if (m.kind === 'world' && G.airship && G.flags.airship && !G.inAir) {
      const sx = G.airship.x * TS - cx + TS / 2, sy = G.airship.y * TS - cy + TS - 2;
      list.push({ y: G.airship.y * TS + 12, draw: () => { ellipse(g, sx, sy, 14, 4, 'rgba(0,0,0,.25)'); drawAirship(g, sx, sy - 4, t, G.airship.dir, false); } });
    }
    if (m.kind === 'world' && G.ship && G.flags.ship && !G.onShip) {
      const sx = G.ship.x * TS - cx + TS / 2, sy = G.ship.y * TS - cy + TS - 4;
      list.push({ y: G.ship.y * TS + 10, draw: () => drawShip(g, sx, sy, t, G.ship.dir) });
    }
    const step = this.anim ? (Math.floor(this.walkT * 8) % 2 ? 1 : 2) : 0;
    const psx = px - cx + TS / 2, psy = py - cy + TS - 2;
    if (!this.noPlayer) list.push({   // the editor hides the hero
      y: py + TS / 2 + 0.5, draw: () => {
        if (G.inAir) { ellipse(g, psx, psy, 16, 5, 'rgba(0,0,0,.25)'); drawAirship(g, psx, psy - 26, t, G.dir, true); }
        else if (G.onMoth) { ellipse(g, psx, psy, 14, 4, 'rgba(0,0,0,.25)'); drawMoth(g, psx, psy - 14, t, G.dir, HEROES[G.party[0].id].look); }
        else if (m.kind === 'deep') drawBell(g, psx, psy, t);
        else if (G.onShip) drawShip(g, psx, psy - 2, t, G.dir);
        else drawChar(g, HEROES[G.party[0].id].look, psx, psy, G.dir, step, 1, null, t);
      }
    });
    list.sort((a, b) => a.y - b.y).forEach(d => d.draw());
    if (m.kind === 'heist') drawHeistSight(g, m, cx, cy, t);
    // the sea floor: dark water with the bell's lamp, glowing vents and the lights of Nerith
    if (m.kind === 'deep') drawDeepLight(g, m, cx, cy, psx, psy, t);
    if (m.kind === 'town' && (m.underwater || m.underground)) drawTownMood(g, m, t);
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
    // the sky and the weather (1.9)
    drawSky(g, m, cx, cy, t);
    if (underSky(m)) drawWeather(g, currentWeather(), t);
    drawCompassHint(g, m, t);   // 2.2: the Sailor's Compass
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
  if (e.follow && e.hidden) return;
  if (e.follow && !e.guest) { drawFollowerCat(g, sx, sy, t); return; }   // Mittens (home.js); a guest (guests.js) draws as a person
  if (e.kind === 'npc' && e.catSprite) { drawCat(g, sx, sy, t); return; }
  if (e.kind === 'npc') {
    const step = e.mv ? (Math.floor(t * 8) % 2 ? 1 : 2) : 0;
    drawChar(g, e.look, sx, sy, e.dir, step, 1, null, t);
    if (e.mark) { const b = Math.sin(t * 5) * 2; rrect(g, sx - 8, sy - 74 + b, 16, 20, 6, '#fff8d0', OUT, 1.5); poly(g, [sx - 3, sy - 55 + b, sx + 3, sy - 55 + b, sx, sy - 50 + b], '#fff8d0'); text(g, '!', sx, sy - 72 + b, { size: 15, bold: true, align: 'center', color: '#c0302a', shadow: false }); }
  } else if (e.kind === 'chest') drawChest(g, sx, sy + 1, e.opened);
  else if (e.kind === 'lantern') drawLantern(g, sx, sy + 2, e.lit, t, e.col);
  else if (e.kind === 'cat') drawCat(g, sx, sy, t);
  else if (e.kind === 'glint') drawGlint(g, sx, sy, t);
  else if (e.kind === 'roadlamp') { drawRoadLamp(g, sx, sy, e.lit, t); if (e.moths) drawLampMoths(g, sx, sy, t); }
  else if (e.kind === 'riddle') drawRiddleFire(g, sx, sy, e.solved, t);
  else if (e.kind === 'hatch') drawHatch(g, sx, sy);
  else if (e.kind === 'guard') { drawChar(g, e.look, sx, sy, e.dir, Math.floor(t * 4) % 2 ? 1 : 2, 1, null, t); }
  else if (e.kind === 'boss') {
    const s = 0.45;
    drawMonster(g, e.def, sx, sy + 2, { t, scale: s });
  }
}

// ---------- transitions ----------
// The tiles drawn one by one: the way the cache draws them too, and the fallback without it.
function drawTilesDirect(g, m, cx, cy, t) {
  g.fillStyle = TileCache.bg(m); g.fillRect(0, 0, W, H);
  const fn = TileCache.tileFn(m), skip = TileCache.skips(m);
  // include the tiles off screen that reach onto it (TileCache.M: the diving bell's line reaches 7 squares up)
  const M = TileCache.M, x0 = Math.floor(cx / TS) - M.r, y0 = Math.floor(cy / TS) - M.d, x1 = Math.floor(cx / TS) + VW + M.l, y1 = Math.floor(cy / TS) + VH + M.u;
  // tiles are drawn at their map position under a translation, exactly as the cache draws them
  g.save(); g.translate(-cx, -cy);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (skip && m.at(x, y) === undefined) continue;
    fn(g, m, x, y, x * TS, y * TS, t);
  }
  g.restore();
}
async function changeMap(mapId, x, y, dir) {
  Audio_.sfx('door');
  await fadeTo(1, 220);
  Field.enter(mapId, x, y, dir);
  await fadeTo(0, 260);
  if (mapId === 'world') await worldEvents();
}
function freeNeighbor(map, x, y) {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const c = map.at(x + dx, y + dy);
    if (c !== undefined && !DUNGEON_SOLID.has(c) && c !== '<' && c !== '>' && !map.extras.chests.some(ch => ch.x === x + dx && ch.y === y + dy)) return [x + dx, y + dy];
  }
  return [x, y + 1];
}
async function enterLocation(ch) {
  const L = locDef(ch);
  G.flags['visit_' + ch] = true;
  G.onMoth = false;
  if (L.town) {
    const d = TOWN_DEFS[L.town];
    const [ex, ey] = d.exits[0];
    let sx = ex, sy = ey, dir = 'up';
    if (ey === d.h - 1) { sy = ey - 1; dir = 'up'; } else if (ex === 0) { sx = 1; dir = 'right'; }
    await changeMap(L.town, sx, sy, dir);
    await onEnterTown(L.town);
    autoSave();
  } else {
    const ok = await canEnterDungeon(L.dungeon);
    if (!ok) return;
    const m = getMap(L.dungeon + ':0');
    const [x, y] = freeNeighbor(m, m.up.x, m.up.y);
    await changeMap(m.id, x, y, 'down');
    await onEnterDungeon(L.dungeon);
    autoSave();
  }
}
async function leaveTown() {
  const d = TOWN_DEFS[Field.map.id];
  if (d && d.exitTo) { await changeMap(d.exitTo.map, d.exitTo.x, d.exitTo.y, 'down'); return; }
  const loc = locDef(Field.map.loc);
  await changeMap(locMap(Field.map.loc), loc.x, loc.y, G.dir);
}
// the flag a dungeon floor's boss sets when beaten (the Endless Lantern has one per boss floor)
function bossFlag(m) { return m.dungeon === 'endless' ? 'boss_endless_' + m.floor : 'boss_' + m.dungeon; }
async function stairs(d) {
  const m = Field.map, did = m.dungeon, f = m.floor + d;
  if (did === 'endless') {
    if (d < 0) { await leaveEndless(); return; }
    endlessReached(f);
    for (const k in G.maps) if (k.startsWith('endless:') && k !== did + ':' + f) delete G.maps[k];   // floors behind you are gone
  }
  Audio_.sfx('stairs');
  if (f < 0 && DUNGEONS[did].exitTo) { const e = DUNGEONS[did].exitTo; await changeMap(e.map, e.x, e.y, 'down'); return; }
  if (f < 0) {
    const loc = locDef(DUNGEONS[did].loc);
    await changeMap(locMap(DUNGEONS[did].loc), loc.x, loc.y, 'down');
    return;
  }
  const nm = getMap(did + ':' + f);
  const target = d > 0 ? nm.up : nm.down;
  const [x, y] = freeNeighbor(nm, target.x, target.y);
  await changeMap(nm.id, x, y, d > 0 ? 'down' : 'up');
}
async function openChest(e) {
  if (e.opened) { await narrate(tl('The chest is empty.')); return; }
  e.opened = true; G.flags[e.key] = true;
  Audio_.sfx('chest');
  if (e.loot.startsWith('gold:')) { const n = parseInt(e.loot.slice(5)); G.gold += n; await narrate(tl`Found ${n} gold!`); }
  else { addItem(e.loot); await narrate(tl`Found ${ITEMS[e.loot].name}!`); }
}
async function gameOver() {
  Audio_.play('gameover');
  G.scene = GameOverScene; GameOverScene.t = 0;
  await fadeTo(0, 400);
  await wait(1800);
  await narrate(tl('...A warm light finds you in the dark.'));
  await fadeTo(1, 600);
  const inn = G.lastInn || { town: 'brightwater' };
  const d = TOWN_DEFS[inn.town];
  const b = d.buildings.find(b => b.kind === 'inn');
  G.gold = Math.floor(G.gold / 2);
  healAll();
  G.onShip = false;
  Field.enter(inn.town, b.x + Math.floor(b.w / 2), b.y + b.h, 'down');
  await fadeTo(0, 600);
  await narrate(tl('You wake at the inn, battered but alive. Half your gold is gone.'));
}
const GameOverScene = {
  t: 0,
  tick(dt) { this.t += dt; }, update() { },
  draw(g) {
    g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = clamp(this.t / 1.5, 0, 1);
    text(g, tl('The lantern-light fades...'), W / 2, H / 2 - 20, { size: 28, fam: SERIF, align: 'center', color: '#c8b8e8' });
    g.restore();
  }
};

// ---------- airship ----------
function boardAirship() {
  G.inAir = true; G.onShip = false;
  Audio_.sfx('buff'); Audio_.play('sky');
  toast(tl('Press Enter to land'));
}
async function landAirship() {
  const m = Field.map, c = m.at(G.x, G.y);
  const okLand = Field.walkable(G.x, G.y) && c !== 'T' && c !== 'P' && c !== 'd';
  if (!okLand) { Audio_.sfx('buzz'); toast(Field.walkable(G.x, G.y) ? tl("Can't land in a forest") : tl("Can't land here")); return; }
  G.inAir = false; G.airship = { x: G.x, y: G.y, dir: G.dir };
  Audio_.sfx('stairs');
  Field.playMusic();
  if (isLoc(c)) await enterLocation(c);
}
