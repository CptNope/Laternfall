'use strict';
// ============================================================
//  PARTY & GAME STATE
// ============================================================
const G = {
  party: [], inv: {}, gold: 0, flags: {}, playTime: 0,
  mapId: 'world', x: 0, y: 0, dir: 'down',
  ship: null, onShip: false, airship: null, inAir: false, carry: null, encSteps: 20, lastInn: null, seen: {}, killed: {},
  scene: null, maps: {}, slot: '1'
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
  if (G.carry && G.carry[id]) { const m = { ...G.carry[id], status: {} }; m.hp = maxHp(m); m.mp = maxMp(m); G.party.push(m); return; }
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
// Three manual slots plus an auto-save slot. Every save carries a `version`; older saves are
// upgraded by MIGRATIONS in order when they are read, so the save shape can change safely.
const SAVE_VERSION = 2;
const SAVE_PREFIX = 'lanternfall_save_v2_';
const LEGACY_SAVE_KEY = 'lanternfall_save_v1';          // 1.0–1.3: a single slot, no version
const SAVE_SLOTS = ['1', '2', '3'];
const ALL_SLOTS = [...SAVE_SLOTS, 'auto'];
const MIGRATIONS = {
  // v1 → v2: saves gained a version and a timestamp; nothing else changed shape
  1: d => ({ ...d, version: 2, savedAt: d.savedAt || 0 })
};
function migrateSave(d) {
  if (!d) return null;
  let v = d.version || 1;
  while (v < SAVE_VERSION) { if (!MIGRATIONS[v]) return null; d = MIGRATIONS[v](d); v = d.version; }
  return d;
}
function readSlot(slot) {
  try { return migrateSave(JSON.parse(localStorage.getItem(SAVE_PREFIX + slot))); } catch (e) { return null; }
}
// One-time upgrade: copy a 1.x save into slot 1 (the old key is left alone as a backup)
(function migrateLegacySave() {
  try {
    const old = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!old || localStorage.getItem(SAVE_PREFIX + '1')) return;
    const d = migrateSave(JSON.parse(old));
    if (d) localStorage.setItem(SAVE_PREFIX + '1', JSON.stringify(d));
  } catch (e) { }
})();
function saveData() {
  return {
    version: SAVE_VERSION, savedAt: Date.now(),
    party: G.party.map(m => ({ id: m.id, level: m.level, xp: m.xp, hp: m.hp, mp: m.mp, weapon: m.weapon, armor: m.armor, acc: m.acc || null })),
    seen: G.seen, killed: G.killed,
    inv: G.inv, gold: G.gold, flags: G.flags, playTime: G.playTime,
    mapId: G.mapId, x: G.x, y: G.y, dir: G.dir, ship: G.ship, onShip: G.onShip, lastInn: G.lastInn, airship: G.airship, inAir: G.inAir, carry: G.carry
  };
}
function saveGame(slot = G.slot || '1') {
  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(saveData()));
    if (slot !== 'auto') G.slot = slot;
    return true;
  } catch (e) { return false; }
}
function autoSave() { if (CFG.autosave !== false && G.party.length) { if (saveGame('auto')) toast('Auto-saved'); } }
function hasSave(slot) { return slot ? !!readSlot(slot) : ALL_SLOTS.some(s => readSlot(s)); }
function latestSlot() {
  let best = null, t = -1;
  for (const s of ALL_SLOTS) { const d = readSlot(s); if (d && d.savedAt > t) { t = d.savedAt; best = s; } }
  return best;
}
function loadGame(slot = latestSlot()) {
  const d = slot && readSlot(slot);
  if (!d) return false;
  G.party = d.party.map(p => { const m = { acc: null, ...p, status: {} }; m.hp = clamp(m.hp, 0, maxHp(m)); m.mp = clamp(m.mp, 0, maxMp(m)); return m; });
  G.seen = d.seen || {}; G.killed = d.killed || {};
  G.inv = d.inv || {}; G.gold = d.gold || 0; G.flags = d.flags || {}; G.playTime = d.playTime || 0;
  G.mapId = d.mapId; G.x = d.x; G.y = d.y; G.dir = d.dir || 'down';
  G.ship = d.ship || null; G.onShip = !!d.onShip; G.lastInn = d.lastInn || null; G.airship = d.airship || null; G.inAir = !!d.inAir; G.carry = d.carry || null;
  G.slot = slot === 'auto' ? (G.slot || '1') : slot;
  return true;
}
// A short description of a save, for the slot menus
function placeName(mapId) {
  if (!mapId || mapId === 'world') return 'World map';
  if (TOWN_DEFS[mapId]) return TOWN_DEFS[mapId].name;
  if (mapId.startsWith('in:')) { const t = mapId.split(':')[1]; return TOWN_DEFS[t] ? TOWN_DEFS[t].name : 'Indoors'; }
  const [did, f] = mapId.split(':'), D = DUNGEONS[did];
  return D ? `${D.name}${D.floors > 1 ? ' ' + (+f + 1) + 'F' : ''}` : mapId;
}
function slotSummary(slot) {
  const d = readSlot(slot);
  if (!d) return null;
  const f = d.flags || {};
  const chapter = f.chapter6 ? 'Chapter VI done' : f.isle ? 'Chapter VI' : f.ending ? 'Post-game' : f.lantern3 ? 'Act IV' : f.lantern2 ? 'Act III' : f.lantern1 ? 'Act II' : 'Act I';
  return { d, place: placeName(d.mapId), time: fmtTime(d.playTime || 0), lv: Math.max(...d.party.map(m => m.level)), chapter, ng: f.ngplus || 0,
    when: d.savedAt ? new Date(d.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Before 1.4' };
}
function fmtTime(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h}:${String(m).padStart(2, '0')}`; }
