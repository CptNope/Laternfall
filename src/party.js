'use strict';
// ============================================================
//  PARTY & GAME STATE
// ============================================================
const G = {
  party: [], inv: {}, gold: 0, flags: {}, playTime: 0,
  mapId: 'world', x: 0, y: 0, dir: 'down',
  ship: null, onShip: false, encSteps: 20, lastInn: null, seen: {}, killed: {},
  scene: null, maps: {}
};
function makeMember(id, level = 1) {
  const d = HEROES[id];
  const m = { id, level, xp: xpForLevel(level), weapon: d.start.weapon, armor: d.start.armor, acc: null, status: {}, hp: 1, mp: 0 };
  m.hp = maxHp(m); m.mp = maxMp(m);
  return m;
}
function baseStat(m, s) { const d = HEROES[m.id]; return Math.floor(d.base[s] + d.grow[s] * (m.level - 1)); }
function maxHp(m) { return baseStat(m, 'hp'); }
function maxMp(m) { return baseStat(m, 'mp'); }
function gearBonus(m, s) {
  let v = 0;
  for (const slot of ['weapon', 'armor', 'acc']) {
    const it = ITEMS[m[slot]]; if (!it) continue;
    if (it.all && s !== 'hp' && s !== 'mp') v += it.all;
    if (s === 'str') v += it.atk || 0; else if (s === 'def') v += it.def || 0; else if (s === 'mag') v += it.mag || 0; else if (s === 'spd') v += it.spd || 0;
  }
  return v;
}
function accOf(m) { return m.acc ? ITEMS[m.acc] : null; }
function immune(m, st) { const a = accOf(m); return !!(a && a.immune && a.immune.includes(st)); }
function partyHasAcc(flag) { return G.party.some(m => { const a = accOf(m); return a && a[flag]; }); }
function canEquip(it, id) { return !it.who || it.who.includes(id); }
function stat(m, s) { return baseStat(m, s) + gearBonus(m, s); }
function spellsOf(m) { return HEROES[m.id].spells.filter(([, l]) => m.level >= l).map(([s]) => s); }
function memberName(m) { return HEROES[m.id].name; }
function alive(m) { return m.hp > 0; }
function inParty(id) { return G.party.some(m => m.id === id); }
function partyLevel() { return Math.round(G.party.reduce((a, m) => a + m.level, 0) / G.party.length); }
function addMember(id) {
  if (inParty(id)) return;
  const lv = Math.max(1, partyLevel());
  G.party.push(makeMember(id, lv));
}
function gainXp(m, n) {
  const msgs = [];
  if (m.level >= MAX_LEVEL) return msgs;
  m.xp += n;
  while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level + 1)) {
    const oh = maxHp(m), om = maxMp(m);
    const before = new Set(spellsOf(m));
    m.level++;
    m.hp += maxHp(m) - oh; m.mp += maxMp(m) - om;
    msgs.push(`${memberName(m)} reached level ${m.level}!`);
    for (const s of spellsOf(m)) if (!before.has(s)) msgs.push(`${memberName(m)} learned ${SPELLS[s].name}!`);
  }
  return msgs;
}
function addItem(id, n = 1) { G.inv[id] = (G.inv[id] || 0) + n; if (G.inv[id] <= 0) delete G.inv[id]; }
function hasItem(id) { return (G.inv[id] || 0) > 0; }
function healAll() { for (const m of G.party) { m.hp = maxHp(m); m.mp = maxMp(m); m.status = {}; } }

// ---------- save / load ----------
const SAVE_KEY = 'lanternfall_save_v1';
function saveGame() {
  const data = {
    party: G.party.map(m => ({ id: m.id, level: m.level, xp: m.xp, hp: m.hp, mp: m.mp, weapon: m.weapon, armor: m.armor, acc: m.acc || null })),
    seen: G.seen, killed: G.killed,
    inv: G.inv, gold: G.gold, flags: G.flags, playTime: G.playTime,
    mapId: G.mapId, x: G.x, y: G.y, dir: G.dir, ship: G.ship, onShip: G.onShip, lastInn: G.lastInn
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!d) return false;
  G.party = d.party.map(p => ({ acc: null, ...p, status: {} }));
  G.seen = d.seen || {}; G.killed = d.killed || {};
  G.inv = d.inv || {}; G.gold = d.gold || 0; G.flags = d.flags || {}; G.playTime = d.playTime || 0;
  G.mapId = d.mapId; G.x = d.x; G.y = d.y; G.dir = d.dir || 'down';
  G.ship = d.ship || null; G.onShip = !!d.onShip; G.lastInn = d.lastInn || null;
  return true;
}
function fmtTime(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h}:${String(m).padStart(2, '0')}`; }
