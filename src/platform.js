'use strict';
// ============================================================
//  PLATFORM (1.8): install as an app, moving saves between devices,
//  trophies, the speedrun timer and splits, and the battery saver.
//  Loaded after deep.js and before story.js. The trophy and split checks
//  run from the main loop (platformTick), never at load time.
// ============================================================

// ---------------- install (PWA) ----------------
// build.py writes manifest.webmanifest, sw.js and icons/ beside index.html. The service worker only
// registers when the game is served over http(s); opened as a file, the game simply runs as before.
const PWA = { prompt: null };
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !MODS.length) {   // a modded build isn't the installable game
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA.prompt = e; });
window.addEventListener('appinstalled', () => { PWA.prompt = null; toast(tl('Lanternfall is installed')); });
function isInstalled() {
  try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true || !!window.__TAURI__; } catch (e) { return false; }
}
async function installApp() {
  if (PWA.prompt) {
    PWA.prompt.prompt();
    const r = await PWA.prompt.userChoice.catch(() => null);
    PWA.prompt = null;
    if (r && r.outcome === 'accepted') return;
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const framed = window.top !== window.self;
  await sayAll([
    [tl('Install'), framed ? tl('Inside the itch.io page the game can\'t install itself. Open it at its own address (see the itch.io page or the README), or download the desktop version.')
      : ios ? tl('On iPhone or iPad: tap Share, then "Add to Home Screen".') : tl('In Chrome or Edge, use the install icon at the right of the address bar, or the browser menu: "Install Lanternfall".')],
    [tl('Install'), tl('Once installed, the game opens in its own window and plays offline. Saves stay on this device: use Transfer saves on the title screen to move them.')]
  ]);
}

// ---------------- moving saves between devices ----------------
const SAVE_KEYS = () => [...ALL_SLOTS.map(s => SAVE_PREFIX + s), CFG_KEY, TROPHY_KEY, SPLIT_KEY];
function exportSaves() {
  const data = { game: 'lanternfall', exported: new Date().toISOString(), keys: {} };
  for (const k of SAVE_KEYS()) { const v = localStorage.getItem(k); if (v !== null) data.keys[k] = v; }
  return JSON.stringify(data);
}
function importSaves(text) {
  const data = JSON.parse(text);
  if (!data || data.game !== 'lanternfall' || !data.keys) throw new Error(tl('Not a Lanternfall save file'));
  const allowed = new Set(SAVE_KEYS());
  let n = 0;
  for (const [k, v] of Object.entries(data.keys)) if (allowed.has(k) && typeof v === 'string') { localStorage.setItem(k, v); n++; }
  loadCfg(); applyKeymap(); Trophies.load();
  return n;
}
function pickFile() {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => res(null); r.readAsText(f); };
    window.addEventListener('focus', () => setTimeout(() => { if (!inp.files || !inp.files.length) res(null); }, 800), { once: true });
    inp.click();
  });
}
async function transferMenu() {
  const k = await listMenu({ x: W / 2 - 130, y: 170, w: 260, rows: 3, title: tl('Transfer saves'), items: [{ label: tl('Export to a file') }, { label: tl('Import from a file') }, { label: tl('Back') }],
    help: i => [tl('Download every save slot, your settings and trophies as one file.'), tl('Load a file exported from another browser or device. Slots in the file replace the ones here.'), ''][i], helpY: H - 60 });
  if (k === 0) {
    const blob = new Blob([exportSaves()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lanternfall-saves-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    await narrate(tl('Your saves were downloaded as a file. Import it on another device from this same menu.'));
  } else if (k === 1) {
    const text = await pickFile();
    if (!text) return;
    try { const n = importSaves(text); Audio_.sfx('chest'); await narrate(tl`Imported ${n} entries. Your saves are ready to load.`); }
    catch (e) { Audio_.sfx('buzz'); await narrate(tl('That file isn\'t a Lanternfall save export.')); }
  }
}

// ---------------- trophies ----------------
// Trophies belong to the player, not the save: earned once, kept across every slot and New Game+.
const TROPHY_KEY = 'lanternfall_trophies_v1';
const anyHero = fn => G.party.some(fn);
const TROPHIES = [
  // the story
  { id: 'ember', name: tl('First Light'), desc: tl('Relight the Ember Lantern.'), test: f => f.lantern1 },
  { id: 'tide', name: tl('High Water'), desc: tl('Relight the Tide Lantern.'), test: f => f.lantern2 },
  { id: 'stone', name: tl('Heart of Stone'), desc: tl('Relight the Stone Lantern.'), test: f => f.lantern3 },
  { id: 'dawn', name: tl('Lanternfall'), desc: tl('Finish the story.'), test: f => f.ending },
  { id: 'crown', name: tl('The Crown Falls'), desc: tl('Finish Chapter VI in the Crownfall Abyss.'), test: f => f.boss_abyss },
  { id: 'aurora', name: tl('Sky-Bound'), desc: tl('Win the skyship Aurora from the First King.'), test: f => f.boss_tomb },
  { id: 'fifth', name: tl('The Fifth Flame'), desc: tl('Find the Fifth Flame in the Starfall Observatory.'), test: f => f.lantern5 },
  // side stories
  { id: 'leviathan', name: tl('Calm Waters'), desc: tl('Defeat the Leviathan.'), test: f => f.leviathan },
  { id: 'wyrm', name: tl('Starslayer'), desc: tl('Defeat the Astral Wyrm.'), test: f => f.boss_observatory },
  { id: 'road', name: tl('His Father\'s Rounds'), desc: tl('Light all twelve roadside lamps.'), test: f => f.road_done },
  { id: 'hearts', name: tl('Five Hearts'), desc: tl('Finish every hero\'s personal quest.'), test: f => f.festival },
  { id: 'nerith', name: tl('Let Go'), desc: tl('Free Nerith from its drowned king.'), test: f => f.boss_palace },
  { id: 'tide_boss', name: tl('Unforgettable'), desc: '???', secret: tl('Defeat the Tide That Remembers.'), test: f => f.tide_done },
  { id: 'champion', name: tl('Grand Champion'), desc: tl('Win the first five cups at the Aerie Arena.'), test: f => f.cup_champion },
  { id: 'eclipse', name: tl('Eclipse'), desc: tl('Win the Eclipse Cup.'), test: f => f.cup_eclipse },
  { id: 'alchemist', name: tl('Alchemist'), desc: tl('Brew 10 times at the alchemy bench.'), test: f => (f.brewed_total || 0) >= 10 },
  { id: 'rhyme', name: tl('The Whole Rhyme'), desc: tl('Bring Old Bram every verse of the Lantern rhyme.'), test: f => f.rhyme_done },
  { id: 'endless10', name: tl('Down the Well'), desc: tl('Reach 10F in the Endless Lantern.'), test: f => (f.endless_best || 0) >= 10 },
  { id: 'endless30', name: tl('The Long Dark'), desc: tl('Reach 30F in the Endless Lantern.'), test: f => (f.endless_best || 0) >= 30 },
  { id: 'hollow', name: tl('Hollow Walker'), desc: tl('Finish the story in Hollow mode.'), test: f => f.hollow && f.ending },
  // collecting
  { id: 'fisher', name: tl('The One That Didn\'t Get Away'), desc: tl('Catch every kind of fish.'), test: f => f.fish_r2 },
  { id: 'forge', name: tl('Family of the Forge'), desc: tl('Forge three pieces of gear with Orrin.'), test: f => f.forge_done },
  { id: 'bestiary', name: tl('Natural Historian'), desc: tl('Record every creature in the bestiary.'), test: f => f.codex_all },
  { id: 'treasure', name: tl('X Marks Every Spot'), desc: tl('Dig up all five treasure maps.'), test: f => [1, 2, 3, 4, 5].every(k => f['dug_' + k]) },
  { id: 'rare', name: tl('Light Fingers'), desc: tl('Steal a rare (★) item.'), test: f => f.stole_rare },
  { id: 'cook', name: tl('Second Helpings'), desc: tl('Eat a meal cooked at an inn.'), test: f => f.cooked },
  { id: 'moth', name: tl('Moth to a Flame'), desc: tl('Ride a lanternmoth.'), test: f => f.rode_moth },
  { id: 'deep', name: tl('Into the Deep'), desc: tl('Dive to the sea floor.'), test: f => f.seen_deep },
  { id: 'rich', name: tl('Lamplighter\'s Fortune'), desc: tl('Carry 500,000 gold.'), test: () => G.gold >= 500000 },
  // growing
  { id: 'limit', name: tl('Past the Limit'), desc: tl('Use a Limit in battle.'), test: f => f.used_limit },
  { id: 'combo', name: tl('Together'), desc: tl('Use a combo tech in battle.'), test: f => f.used_combo },
  { id: 'lv50', name: tl('Fifty'), desc: tl('Raise a hero to level 50.'), test: () => anyHero(m => m.level >= MAX_LEVEL) },
  { id: 'board', name: tl('Every Lamp Lit'), desc: tl('Light a hero\'s whole Lantern Board.'), test: () => anyHero(m => (m.board || []).length >= Object.keys(BOARD_NODES).length - 1) },
  { id: 'ngplus', name: tl('Once More, With Feeling'), desc: tl('Start New Game+.'), test: f => f.ngplus },
  { id: 'night', name: tl('Night Owl'), desc: tl('Win a battle at night.'), test: f => f.night_win },
  { id: 'cards', name: tl('Card Shark'), desc: tl('Beat every Lanterns & Lies player.'), test: f => f.cards_done },
  { id: 'collector', name: tl('Full Deck'), desc: tl('Collect every Lanterns & Lies card.'), test: () => !!G.cards && Object.keys(CARDS).every(k => G.cards[k] > 0) },
  { id: 'heist', name: tl('Ghost of Mirage'), desc: '???', secret: tl('Steal the Sunset Opal without being caught.'), test: f => f.heist_done },
  // speed
  { id: 'speed', name: tl('Lamplighter\'s Dash'), desc: tl('Finish the story in under 5 hours of play time.'), test: f => f.ending && G.splits && G.splits.ending && G.splits.ending < 5 * 3600 }
];
const Trophies = {
  got: {},
  load() { try { this.got = JSON.parse(localStorage.getItem(TROPHY_KEY) || '{}') || {}; } catch (e) { this.got = {}; } },
  save() { try { localStorage.setItem(TROPHY_KEY, JSON.stringify(this.got)); } catch (e) { } },
  count() { return TROPHIES.filter(t => this.got[t.id]).length; },
  give(id, quiet) {
    if (this.got[id]) return false;
    const t = TROPHIES.find(x => x.id === id); if (!t) return false;
    this.got[id] = Date.now(); this.save();
    if (!quiet) { Audio_.sfx('levelup'); toast(`🏆 ${t.name}`); }
    return true;
  },
  check() {
    const f = G.flags || {}, now = [];
    for (const t of TROPHIES) if (!this.got[t.id]) { let ok = false; try { ok = !!t.test(f); } catch (e) { } if (ok) now.push(t.id); }
    if (now.length === 1) this.give(now[0]);
    else if (now.length > 1) { now.forEach(id => this.give(id, true)); Audio_.sfx('levelup'); toast(tl`🏆 ${now.length} trophies earned`); }   // e.g. loading an older save
  }
};
Trophies.load();
async function trophyRoom() {
  let idx = 0;
  const panel = openPanel(g => {
    const t = TROPHIES[idx], got = Trophies.got[t.id];
    drawWindow(g, 40, 384, 560, 72);
    text(g, got ? t.name : (t.secret ? '???' : t.name), 56, 394, { size: 17, bold: true, color: got ? '#ffd27a' : '#8890c0' });
    text(g, got ? new Date(got).toLocaleDateString() : tl('Not yet'), 584, 396, { size: 13, align: 'right', color: got ? '#7aff9a' : '#8890c0' });
    text(g, got && t.secret ? t.secret : t.desc, 56, 420, { size: 14 });
  });
  await listMenu({
    x: 40, y: 24, w: 560, rows: 10, rowH: 28, title: tl`Trophies  ${Trophies.count()} / ${TROPHIES.length}`,
    items: TROPHIES.map(t => ({ label: (Trophies.got[t.id] ? '🏆 ' : '· ') + (Trophies.got[t.id] || !t.secret ? t.name : '???'), right: Trophies.got[t.id] ? '' : '—', color: Trophies.got[t.id] ? '#ffe9a8' : '#8890c0' })),
    onChange: i => idx = i
  });
  closePanel(panel);
}

// ---------------- speedrun timer and splits ----------------
const SPLIT_KEY = 'lanternfall_splits_v1';
const SPLITS = [['lantern1', tl('Ember Lantern')], ['lantern2', tl('Tide Lantern')], ['lantern3', tl('Stone Lantern')], ['ending', tl('Dawn Lantern')]];
let splitFlash = null;   // { name, time, delta, t }
function bestSplits() { try { return JSON.parse(localStorage.getItem(SPLIT_KEY) || '{}') || {}; } catch (e) { return {}; } }
function fmtClock(s) {
  s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = Math.floor(s % 60), ds = Math.floor(s * 10) % 10;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${ds}`;
}
function checkSplits() {
  if (!G.splits) G.splits = {};
  for (const [flag, name] of SPLITS) {
    if (!G.flags[flag] || G.splits[flag] !== undefined) continue;
    G.splits[flag] = G.playTime;
    if (G.flags.ngplus) continue;   // New Game+ runs aren't comparable
    const best = bestSplits(), delta = best[flag] ? G.playTime - best[flag] : null;
    splitFlash = { name, time: G.playTime, delta, t: 5 };
    const complete = SPLITS.every(([f]) => typeof G.splits[f] === 'number');
    if (flag === 'ending' && complete && (!best.ending || G.playTime < best.ending)) {
      try { localStorage.setItem(SPLIT_KEY, JSON.stringify({ ...G.splits })); } catch (e) { }
      if (CFG.speedrun) toast(tl('New best time!'));
    }
  }
}
function drawSpeedrun(g, dt) {
  if (!CFG.speedrun || G.scene === TitleScene || !G.party.length) return;
  const w = 118;
  g.save(); g.globalAlpha = 0.85; rrect(g, W - w - 6, 6, w, 24, 6, 'rgba(8,6,20,.85)', 'rgba(255,233,168,.5)', 1.2); g.restore();
  text(g, fmtClock(G.playTime), W - 12, 10, { size: 15, align: 'right', bold: true, color: '#ffe9a8', fam: 'monospace' });
  if (splitFlash) {
    splitFlash.t -= dt; if (splitFlash.t <= 0) { splitFlash = null; return; }
    const d = splitFlash.delta, dcol = d === null ? '#c8d0f0' : d <= 0 ? '#7aff9a' : '#ff8a8a';
    g.save(); g.globalAlpha = clamp(splitFlash.t, 0, 1);
    rrect(g, W - 214, 34, 208, 40, 6, 'rgba(8,6,20,.85)', 'rgba(255,233,168,.5)', 1.2);
    text(g, splitFlash.name, W - 202, 38, { size: 13, color: '#ffe9a8' });
    text(g, fmtClock(splitFlash.time), W - 14, 38, { size: 13, align: 'right', fam: 'monospace' });
    text(g, d === null ? tl('first split') : (d <= 0 ? '−' : '+') + fmtClock(Math.abs(d)), W - 14, 55, { size: 12, align: 'right', color: dcol, fam: 'monospace' });
    g.restore();
  }
}

// ---------------- called every frame from the main loop ----------------
let platformT = 0;
function platformTick(dt) {
  if (G.scene && G.scene.enemies && G.scene !== TitleScene) G.playTime += dt;   // battles count toward play time too (real time)
  platformT += dt;
  if (platformT < 0.5) return;
  platformT = 0;
  if (!G.party.length || G.scene === TitleScene) return;
  checkSplits();
  Trophies.check();
}
// Battery saver: draw at most 30 frames a second (the game logic still uses real time)
function frameSkip(now) {
  if (!CFG.battery) return false;
  if (now - (frameSkip.last || 0) < 1000 / 31) return true;
  frameSkip.last = now;
  return false;
}
