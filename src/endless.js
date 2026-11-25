// =====================================================================
//  ENDLESS — 2.1: the Endless Lantern (a post-game dungeon that goes down forever) and
//  Hollow mode (a harder way to play: no inns, no running, bosses get a third phase)
// =====================================================================
// The floors themselves come from endlessDef(f) in maps.js. Floors count from 0 in code and are
// shown from 1F. Saved state lives in G.flags so it travels with the save:
//   endless_best  deepest floor reached (shown from 1F)
//   endless_ck    the floor (from 0) a new descent may start from, unlocked by beating a boss
//   chest:endless:* / boss_endless_*   this descent's chests and bosses, cleared when a new one starts
//   hollow        this journey is in Hollow mode
const KEEPER = tl('Hesper');
const KEEPER_LOOK = { skin: '#d8b090', hair: '#e8e0d8', style: 'long', body: '#2a3a5a', accent: '#ffd27a', robe: true };
const ENDLESS_WICK_AT = 24;   // beating the boss on 25F the first time gives the Endless Wick

// -------- the keeper by the well in Brightwater (after the ending) --------
function endlessNpcs() {
  const f = G.flags;
  if (!f.ending) return [];
  return [N(13, 9, 41, KEEPER_LOOK, talkKeeper, { name: KEEPER, mark: !f.seen_endless })];
}
async function talkKeeper() {
  const f = G.flags;
  if (!f.seen_endless) {
    await sayAll([
      [KEEPER, tl('You lit them all. Every lantern in the world... except this one.')],
      [KEEPER, tl('Look down the well. That glow at the bottom has burned since before the first king. It never ends, and nothing down there ever stays beaten.')],
      [KEEPER, tl('Go as deep as you like. Every fifth floor, something old waits. Beat it, and I can send you back down to that depth next time.')]
    ]);
    f.seen_endless = true;
  }
  const ck = f.endless_ck || 0;
  const opts = [tl('Descend from 1F')];
  if (ck) opts.push(tl`Descend from ${ck + 1}F`);
  opts.push(tl('Not now'));
  const k = await choose(KEEPER, f.endless_best ? tl`Deepest so far: ${f.endless_best}F. Ready?` : tl('Ready to go down?'), opts, opts.length - 1);
  if (k < 0 || k === opts.length - 1) return;
  await startEndless(k === 1 && ck ? ck : 0);
}
async function startEndless(f) {
  for (const k of Object.keys(G.flags)) if (k.startsWith('chest:endless:') || k.startsWith('boss_endless_')) delete G.flags[k];
  for (const k in G.maps) if (k.startsWith('endless:')) delete G.maps[k];
  endlessReached(f);
  const m = getMap('endless:' + f);
  const [x, y] = freeNeighbor(m, m.up.x, m.up.y);
  Audio_.sfx('stairs');
  await changeMap(m.id, x, y, 'down');
}
async function leaveEndless() {
  const k = await choose(null, tl('Climb back to the surface? This descent ends here.'), [tl('Climb out'), tl('Keep going')], 1);
  if (k !== 0) return;
  Audio_.sfx('stairs');
  const e = DUNGEONS.endless.exitTo;
  await changeMap(e.map, e.x, e.y, 'down');
  for (const id in G.maps) if (id.startsWith('endless:')) delete G.maps[id];
}
function endlessReached(f) {
  if (f + 1 > (G.flags.endless_best || 0)) G.flags.endless_best = f + 1;
}
// an echo of an old boss waits on every fifth floor
async function endlessBoss() {
  const m = Field.map, f = m.floor, key = bossFlag(m);
  if (G.flags[key]) return;
  const id = endlessDef(f).boss;
  await narrate(tl`The light gathers into a shape you know. An echo of ${MONSTERS[id].name}!`);
  const r = await startBattle([id], { boss: true, bg: m.bg, depth: f });
  if (r === 'lose') return gameOver();
  G.flags[key] = true; refreshEntities();
  const gold = 2000 + f * 400;
  G.gold += gold; Audio_.sfx('chest');
  await narrate(tl`The echo fades, leaving ${gold} gold behind.`);
  if (f >= ENDLESS_WICK_AT && !G.flags.endless_wick) { G.flags.endless_wick = true; addItem('endless_wick'); await narrate(tl`Found ${ITEMS.endless_wick.name}!`); }
  if (f + 1 > (G.flags.endless_ck || 0)) {
    G.flags.endless_ck = f + 1;
    await narrate(tl`A new checkpoint: Hesper can send you down to ${f + 2}F from now on.`);
  }
  autoSave();
}

// -------- foe strength --------
// Every foe in a battle goes through foeScale. In the Endless Lantern a floor's foes are rescaled
// so that the band's average matches the Crownfall Abyss (the hardest story dungeon) on 1F, then
// grow with depth. Bosses are rescaled one by one to match the Hollow Crown. New Game+ stacks on top.
const ENDLESS_GROWTH = { hp: 0.06, atk: 0.012, mag: 0.012, def: 0.01, xp: 0.06, gold: 0.06 };
const tableAvgs = {};
function tableAvg(table) {
  if (tableAvgs[table]) return tableAvgs[table];
  const ids = [...new Set(ENCOUNTERS[table].flatMap(e => e.g))].map(id => MONSTERS[id]);
  const a = {};
  for (const s of ['hp', 'atk', 'mag', 'def', 'spd', 'xp', 'gold']) a[s] = ids.reduce((t, d) => t + (d[s] || 0), 0) / ids.length;
  return tableAvgs[table] = a;
}
function endlessScale(d, f) {
  const ref = d.boss ? MONSTERS.crown : tableAvg('d7'), src = d.boss ? d : tableAvg(endlessDef(f).enc);
  const r = s => src[s] ? ref[s] / src[s] : 1;
  const out = { ...d };
  for (const s of ['hp', 'atk', 'mag', 'def']) out[s] = Math.round(d[s] * r(s) * (1 + ENDLESS_GROWTH[s] * f));
  out.spd = Math.round(d.spd * clamp(r('spd'), 1, 1.6));
  if (d.boss) { out.xp = 3000 + f * 500; out.gold = 0; }
  else for (const s of ['xp', 'gold']) out[s] = Math.round(d[s] * r(s) * (1 + ENDLESS_GROWTH[s] * f));
  return out;
}
// Hollow mode: when a boss is nearly beaten it rises once more, acting one extra time a turn
function hollowPhase(d) {
  const P = d.phases || [], last = P[P.length - 1] || {};
  const share = P.length ? Math.min(0.2, Math.min(...P.map(p => p.hp)) / 2) : 0.25;
  return { ...d, phases: [...P, { hp: share, msg: tl`${d.name} will not fall! The Hollow pours into it!`, acts: last.acts || d.acts, actions: (last.actions || d.actions || 1) + 1, hollow: true }] };
}
function foeScale(d, opts = {}) {
  const here = G.scene === Field && Field.map && Field.map.dungeon === 'endless' ? Field.map.floor : null;
  const depth = opts.depth != null ? opts.depth : here;
  if (depth != null) d = endlessScale(d, depth);
  d = ngScale(d);
  if (opts.boss && d.boss && G.flags.hollow) d = hollowPhase(d);
  return d;
}

// -------- Hollow mode --------
const isHollow = () => !!(G.flags && G.flags.hollow);
// asked when a new journey starts; null means the player backed out
async function pickMode() {
  const k = await listMenu({ x: W / 2 - 100, y: 196, w: 200, rows: 2, items: [{ label: tl('Normal') }, { label: tl('Hollow') }], index: 0,
    help: i => i ? tl('No inns, no running, and bosses rise a third time. For a second journey.') : tl('The journey as it was meant to be played.'), helpY: H - 44 });
  return k < 0 ? null : k === 1;
}
// inns and beds turn you away in Hollow mode; returns true when the rest is refused
async function hollowNoRest(who) {
  if (!isHollow()) return false;
  if (who) await say(who, tl('Sorry, friend. There\'s no rest for those who walk the Hollow.'));
  else await narrate(tl('You lie down, but the Hollow will not let you rest.'));
  return true;
}
