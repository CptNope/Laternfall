// =====================================================================
//  HOME — 2.2: Arin's house and the people (and cat) in it
// =====================================================================
// Corwin the carpenter builds things for Arin's house: a trophy shelf, a fish tank, a bed for
// Mittens and a music box that plays any song you've heard. After The Lost Cat, Mittens will
// follow you around Brightwater if you ask her. The Sailor's Compass now points toward the
// nearest unopened chest in a dungeon. Saved state lives in G.flags:
//   home_shelf, home_tank, home_catbed, home_musicbox   what Corwin has built
//   heard:<track>   songs you've heard (the music box plays these)
//   home_song       the song the music box plays when you're home (empty: the town's song)
//   cat_follow      Mittens is walking with you
const CARPENTER = tl('Corwin');
const HOME_ID = 'in:brightwater:arinhouse';
// what Corwin can build: the tile it adds, where, what it costs and what you need first
const HOME_UPGRADES = [
  { id: 'catbed', name: tl('A bed for Mittens'), price: 250, tile: 'Z', x: 2, y: 4, need: f => f.cat_done, why: tl('Find Pip\'s cat first.'),
    desc: tl('A basket by your bed, with a cushion. Mittens will sleep in it. Probably.') },
  { id: 'shelf', name: tl('Trophy shelf'), price: 400, tile: 'S', x: 9, y: 1, need: () => Trophies.count() > 0, why: tl('Earn a trophy first.'),
    desc: tl('A shelf on the wall for every trophy you earn.') },
  { id: 'tank', name: tl('Fish tank'), price: 1200, tile: 'Q', x: 10, y: 5, need: () => fishKinds() > 0, why: tl('Catch a fish first.'),
    desc: tl('A glass tank. One of every kind of fish you have caught will swim in it.') },
  { id: 'musicbox', name: tl('Music box'), price: 1500, tile: 'J', x: 11, y: 2, need: f => f.lantern1, why: tl('Light the first Lantern first.'),
    desc: tl('A music box that plays any song you have heard on your travels.') },
  // 2.5 (alchemy.js)
  { id: 'bench', name: tl('Alchemy bench'), price: 800, tile: 'V', x: 11, y: 4, need: f => f.forged > 0 || ALCHEMY.some(r => G.inv[Object.keys(r.needs)[0]] && ITEMS[Object.keys(r.needs)[0]].kind === 'mat'), why: tl('Bring home a forge material first.'),
    desc: tl('Your mother\'s old recipes, and a bench to brew them on. Spare materials and fish become potions and flasks.') }
];
// called by buildInterior for Arin's house
function homeTiles(tiles) {
  for (const u of HOME_UPGRADES) if (G.flags['home_' + u.id]) tiles[u.y][u.x] = u.tile;
}
function rebuildHome() { delete G.maps[HOME_ID]; }   // Corwin works outdoors, so the house is rebuilt next time you go in

// -------- Corwin --------
function homeNpcs() {
  const f = G.flags, can = HOME_UPGRADES.some(u => !f['home_' + u.id] && u.need(f) && G.gold >= u.price);
  return [N(9, 6, 52, { skin: '#c98e62', hair: '#7a4a22', style: 'short', body: '#8a6a3a', accent: '#d8c098', beard: true }, talkCorwin, { name: CARPENTER, mark: can && !f.met_corwin })];
}
async function talkCorwin() {
  const f = G.flags;
  if (!f.met_corwin) {
    await sayAll([[CARPENTER, tl('Arin! Your house is the emptiest house in Brightwater. A lamplighter\'s house should have things in it.')],
      [CARPENTER, tl('I\'m a carpenter. Bring me coin, and something worth showing off, and I\'ll build you somewhere to put it.')]]);
    f.met_corwin = true;
  }
  let idx = 0;
  while (true) {
    const items = HOME_UPGRADES.map(u => {
      const built = f['home_' + u.id], ok = u.need(f);
      return { label: u.name, right: built ? tl('Built') : ok ? tl`${u.price} G` : '—', disabled: built || !ok || G.gold < u.price, help: built ? u.desc : ok ? u.desc : u.why };
    });
    items.push({ label: tl('Done'), help: '' });
    const k = await listMenu({ x: 150, y: 120, w: 340, rows: items.length, title: tl`Corwin's work  ·  ${G.gold} G`, items, index: idx, help: i => items[i].help, helpY: H - 52 });
    if (k < 0 || k === items.length - 1) { await say(CARPENTER, tl('Come back when you\'ve got more to show off.')); return; }
    idx = k;
    const u = HOME_UPGRADES[k];
    if (items[k].disabled) continue;
    G.gold -= u.price; f['home_' + u.id] = true; Audio_.sfx('forge');
    rebuildHome();
    await say(CARPENTER, tl`Done! Go and have a look. ${u.name}, in your house.`);
  }
}

// -------- the house --------
// returns true when it handled the tile
async function homeInteract(m, c) {
  if (m.id !== HOME_ID) return false;
  if (c === 'S') {
    const n = Trophies.count();
    await narrate(tl`Your trophy shelf: ${n} of ${TROPHIES.length}.`);
    await trophyRoom();
    return true;
  }
  if (c === 'Q') {
    const kinds = Object.keys(FISH).filter(id => G.flags['fish_' + id]);
    await narrate(kinds.length ? tl`In the tank: ${kinds.map(id => ITEMS[id].name).join(', ')}. (${kinds.length} of ${Object.keys(FISH).length})` : tl('The tank is empty.'));
    return true;
  }
  if (c === 'J') { await musicBox(); return true; }
  if (c === 'V') { await alchemyBench(); return true; }
  return false;
}
function homeCat() {
  const f = G.flags;
  if (!f.cat_done || f.cat_follow) return null;
  const bed = f.home_catbed ? HOME_UPGRADES[0] : { x: 4, y: 6 };
  return { x: bed.x, y: bed.y, look: null, cat: true, talk: talkMittens };
}
async function talkMittens() {
  const f = G.flags;
  if (f.cat_follow) {
    const k = await choose(tl('Mittens'), tl('Mrrp? (She looks up at you, then at the door.)'), [tl('Keep walking together'), tl('Time to go home')], 0);
    if (k === 1) { f.cat_follow = false; refreshEntities(); await narrate(Field.map.id === HOME_ID ? tl('Mittens hops into her bed.') : tl('Mittens trots off home.')); }
    return;
  }
  const where = f.home_catbed ? tl('Mrrp. (She is curled up in her new bed.)') : tl('Mrrp. (She has claimed your bed.)');
  const k = await choose(tl('Mittens'), where, [tl('Let her sleep'), tl('Take her for a walk')], 0);
  if (k === 1) { f.cat_follow = true; refreshEntities(); await narrate(tl('Mittens stretches, yawns, and follows you. She will go wherever you go. Talk to her when you want her to head home.')); }
}
// Mittens follows the party everywhere: towns, houses, the world map, dungeons, under the sea
// (in a bubble). Aboard the ship, the airship or a moth she rides along out of sight.
const riding = () => !!(G.onShip || G.inAir || G.onMoth);
function catFollower(map) {
  const f = G.flags;
  if (!f.cat_done || !f.cat_follow) return null;
  return { kind: 'npc', x: G.x, y: G.y, dir: 'down', look: LOOKS.elder, catSprite: true, follow: true, hidden: riding(), talk: talkMittens, name: tl('Mittens') };
}
// called when the party starts a step: the follower takes the tile the party is leaving
// With more than one follower (2.4: a guest, then Mittens) each takes the tile the one ahead left.
function followStep(map, anim) {
  let to = { x: anim.fx, y: anim.fy };
  for (const e of map.entities) {
    if (!e.follow) continue;
    if (e.mv) { e.x = e.mv.tx; e.y = e.mv.ty; }
    const was = { x: e.x, y: e.y };
    if (riding()) { e.hidden = true; e.mv = null; e.x = anim.tx; e.y = anim.ty; continue; }   // aboard: she comes along unseen
    if (e.hidden) { e.hidden = false; e.mv = null; e.x = anim.tx; e.y = anim.ty; continue; }   // hops off with you
    // a cutscene moved the party: she catches up at once rather than sliding across the map
    if (Math.abs(e.x - to.x) + Math.abs(e.y - to.y) > 1) { e.mv = null; e.x = to.x; e.y = to.y; to = was; continue; }
    e.mv = e.x === to.x && e.y === to.y ? null : { fx: e.x, fy: e.y, tx: to.x, ty: to.y, t: 0, dur: anim.dur };
    if (e.mv) e.dir = e.mv.tx > e.mv.fx ? 'right' : e.mv.tx < e.mv.fx ? 'left' : e.mv.ty > e.mv.fy ? 'down' : 'up';
    to = was;
  }
}
// under the sea she wears a bubble
function drawFollowerCat(g, sx, sy, t) {
  drawCat(g, sx, sy, t);
  const m = Field.map;
  if (m && (m.kind === 'deep' || m.underwater)) {
    circle(g, sx + 1, sy - 12, 14, 'rgba(170,220,255,.18)', 'rgba(220,245,255,.75)', 1.5);
    circle(g, sx - 5, sy - 19, 2.5, 'rgba(255,255,255,.6)');
  }
}

// -------- the music box --------
const TRACK_NAMES = {
  title: tl('Lanternfall'), town: tl('Brightwater'), world: tl('The Wide World'), sea: tl('Open Water'), dungeon: tl('Into the Dark'),
  battle: tl('Steel and Sparks'), boss: tl('Something Old'), victory: tl('Victory'), spire: tl('The Spire'), desert: tl('Mirage'),
  sky: tl('Above the Clouds'), ash: tl('The Ashen Isle'), ashtown: tl('Lastlight'), deep: tl('Under the Sea'), nerith: tl('Nerith'),
  undermarket: tl('The Undermarket'), abyss: tl('Crownfall Abyss'), crown: tl('The Hollow Crown'), final: tl('The Last Flame'),
  ending: tl('Dawn'), gameover: tl('Lights Out'), rhyme: tl('The Lantern Rhyme')
};
const ALWAYS_HEARD = ['title', 'town', 'world', 'dungeon', 'battle', 'victory'];
// Audio_.play calls this; it can run before this file has loaded (the title song), hence the try
function heardSong(name) {
  try { if (G.flags && TRACK_NAMES[name]) G.flags['heard:' + name] = true; } catch (e) { }
}
// saves from before 2.2 never recorded songs, so progress counts as having heard them
const HEARD_BY = { sea: 'ship', sky: 'airship', boss: 'lantern1', spire: 'lantern3', desert: 'lantern4', final: 'ending', ending: 'ending', ash: 'isle', ashtown: 'isle', abyss: 'chapter6', crown: 'chapter6' };
function heardSongs() { return Object.keys(TRACK_NAMES).filter(k => ALWAYS_HEARD.includes(k) || G.flags['heard:' + k] || (HEARD_BY[k] && G.flags[HEARD_BY[k]])); }
async function musicBox() {
  const songs = heardSongs(), cur = G.flags.home_song || '';
  const items = [{ label: tl('Off (the usual song)'), right: !cur ? '♪' : '', song: '' }, ...songs.map(k => ({ label: TRACK_NAMES[k], right: cur === k ? '♪' : '', song: k }))];
  const k = await listMenu({ x: 170, y: 40, w: 300, rows: Math.min(items.length, 12), title: tl`Music box  ·  ${songs.length} of ${Object.keys(TRACK_NAMES).length} songs`, items,
    index: Math.max(0, items.findIndex(i => i.song === cur)), help: () => tl('It plays whenever you are home. Songs you hear on your travels appear here.'), helpY: H - 52 });
  if (k < 0) return;
  G.flags.home_song = items[k].song;
  Field.playMusic();
}
function homeSong(m) { return m.id === HOME_ID && G.flags.home_musicbox && G.flags.home_song ? G.flags.home_song : null; }

// -------- the Sailor's Compass --------
const hasCompass = () => hasItem('compass') || G.party.some(m => m.acc === 'compass');
// the nearest unopened chest on this dungeon floor, or null
function compassTarget(m) {
  let best = null, bd = Infinity;
  for (const e of m.entities) if (e.kind === 'chest' && !e.opened) { const d = Math.hypot(e.x - G.x, e.y - G.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function drawCompassHint(g, m, t) {
  if (m.kind !== 'dungeon' || CFG.compass === false || !hasCompass()) return false;
  const e = compassTarget(m), cx = W - 34, cy = 92, r = 18;
  circle(g, cx, cy, r + 3, 'rgba(10,12,30,.75)', '#e8c24a', 1.5);
  circle(g, cx, cy, r - 3, null, 'rgba(232,194,74,.35)', 1);
  const a = e ? Math.atan2(e.y - G.y, e.x - G.x) : t * 2;   // no chests left: the needle wanders
  g.save(); g.translate(cx, cy); g.rotate(a);
  poly(g, [r - 4, 0, -4, -4, -4, 4], e ? '#ff6a4a' : '#8890c0');
  poly(g, [-r + 6, 0, -4, -3, -4, 3], '#e8e0d0');
  g.restore();
  circle(g, cx, cy, 2.5, '#e8c24a');
  if (!e) text(g, tl('none'), cx, cy + r + 6, { size: 10, align: 'center', color: '#8890c0' });
  return true;
}

// -------- drawing the new things in the house --------
const FISH_COL = { minnow: '#c0c8d0', trout: '#8ab070', goldcarp: '#ffc040', seabass: '#7a90b0', mackerel: '#5aa0c0', eel: '#6a6a4a', icepike: '#b0e0ff',
  frostchar: '#e08aa0', sturgeon: '#8a7a6a', catfish: '#a08a5a', pearlfish: '#f0f0ff', embereel: '#ff6a3a', koi: '#ff8a5a' };
function drawHomeTile(g, m, c, x, y, px, py, t) {
  if (c === 'S') {   // a shelf on the wall, a little cup for each trophy (up to 12 drawn)
    rrect(g, px + 1, py + 3, 30, 22, 1, '#6a4422', OUT, 1);
    for (let r = 0; r < 2; r++) { g.fillStyle = '#4a2a12'; g.fillRect(px + 2, py + 13 + r * 11, 28, 2); }
    const n = Math.min(12, Trophies.count());
    for (let i = 0; i < n; i++) {
      const cx = px + 5 + (i % 6) * 4.4, cy = py + 12 + Math.floor(i / 6) * 11;
      g.fillStyle = '#ffd27a'; g.fillRect(cx - 1.5, cy - 6, 3, 4); g.fillRect(cx - 0.5, cy - 2, 1, 2);
    }
    return;
  }
  if (c === 'Q') {   // the fish tank
    ellipse(g, px + 16, py + 29, 13, 3, 'rgba(0,0,0,.25)');
    rrect(g, px + 2, py + 4, 28, 22, 2, 'rgba(90,170,220,.55)', '#d8f0ff', 1.5);
    g.fillStyle = 'rgba(40,110,170,.35)'; g.fillRect(px + 3, py + 8, 26, 17);
    g.fillStyle = '#c8b080'; g.fillRect(px + 3, py + 22, 26, 3);
    const kinds = Object.keys(FISH).filter(id => G.flags['fish_' + id]);
    kinds.forEach((id, i) => {
      const s = Math.sin(t * (0.8 + i * 0.13) + i * 1.7), fx = px + 16 + s * 9, fy = py + 11 + (i % 4) * 3, dir = Math.cos(t * (0.8 + i * 0.13) + i * 1.7) > 0 ? 1 : -1;
      ellipse(g, fx, fy, 2.6, 1.4, FISH_COL[id] || '#fff');
      poly(g, [fx - dir * 2.4, fy, fx - dir * 4.4, fy - 1.6, fx - dir * 4.4, fy + 1.6], FISH_COL[id] || '#fff');
    });
    rrect(g, px + 1, py + 2, 30, 3, 1, '#7a5030', null);
    return;
  }
  if (c === 'J') {   // the music box, with notes rising when it plays something you chose
    rrect(g, px + 8, py + 18, 16, 10, 2, '#6a3a1a', OUT, 1);
    rrect(g, px + 7, py + 12, 18, 8, 2, '#a0602a', OUT, 1.2);
    g.fillStyle = '#e8c24a'; g.fillRect(px + 14, py + 14, 4, 3);
    line(g, px + 25, py + 16, px + 29, py + 13, '#e8c24a', 1.5);
    if (G.flags.home_song) for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i * 0.5) % 1; text(g, '♪', px + 12 + i * 8 + Math.sin(k * 6) * 2, py + 6 - k * 10, { size: 10, color: `rgba(255,230,150,${1 - k})` }); }
    return;
  }
  if (c === 'V') { drawBench(g, px, py, t); return; }   // 2.5
  if (c === 'Z') {   // Mittens' basket
    ellipse(g, px + 16, py + 24, 12, 6, '#a0703a', OUT, 1.2);
    ellipse(g, px + 16, py + 22, 9, 4, '#c04a4a');
    return;
  }
}

// -------- Mittens in battle (2.3) --------
// When she's walking with you she sits behind the party in every fight. She never fights, but
// now and then a foe stops to deal with her and loses its action, and after a win she sometimes
// brings back something it dropped. Bosses ignore her. The sim's "with Mittens" scenarios measure it.
const CAT_DISTRACT = 0.08, CAT_FIND = 0.15;
const catInBattle = (opts = {}) => !!(G.flags && G.flags.cat_done && G.flags.cat_follow && !opts.noCat);
const CAT_SEAT = { x: 592, y: 262 };
// before a foe acts; true means she distracted it and it loses this action
async function catDistract(b, e) {
  if (!b.cat || e.def.boss || b.opts.boss || Math.random() >= CAT_DISTRACT) return false;
  const c = b.enemyCenter(e);
  b.catPounce = { t: b.t, x: c.x + 30, y: c.y + 30 }; Audio_.sfx('meow');
  await wait(300);
  b.num(c.x, c.y, tl('Distracted!'), '#ffd27a');
  b.msg = tl`${e.name} is busy with Mittens!`; await wait(800); b.msg = null;
  b.catDistracted = (b.catDistracted || 0) + 1;
  return true;
}
// after a win: an item she found, or null
function catFind(b) {
  if (!b.cat || Math.random() >= CAT_FIND) return null;
  const drops = b.enemies.map(e => e.def.drop && e.def.drop[0]).filter(d => d && ITEMS[d]);
  return drops.length ? drops[Math.floor(Math.random() * drops.length)] : 'potion';
}
function drawBattleCat(g, b) {
  if (!b.cat) return;
  let x = CAT_SEAT.x + (1 - b.intro) * 200, y = CAT_SEAT.y;
  const p = b.catPounce, k = p ? (b.t - p.t) / 0.9 : 1;
  if (p && k < 1) {   // out to the foe and back, in a hop
    const s = Math.sin(Math.min(1, k) * Math.PI);
    x = lerp(x, p.x, s); y = lerp(y, p.y, s) - Math.sin(Math.min(1, k * 2) * Math.PI) * 26;
  }
  drawCat(g, x, y, b.t);
}
