'use strict';
// ============================================================
//  THE DROWNED KINGDOM (1.7)
//  The diving bell and the sea floor, Nerith and the Drowned Palace,
//  the Hadal Rift, treasure maps, lanternmoths and the Undermarket.
//  Loaded after hearts.js and before story.js: top-level code here must not
//  read story.js constants (the speaker names A, OS, KE, ... are used only inside functions).
// ============================================================

const DEEP_TOWNS = ['nerith', 'undermarket'];
function listJoin(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

// Where the party is, in world coordinates (for the map screen)
function worldPos() {
  const m = Field.map;
  if (!m || m.kind === 'world') return { x: G.x, y: G.y };
  if (m.kind === 'deep') return { x: G.x * 2, y: G.y * 2 };
  let ch = null;
  if (m.kind === 'town') ch = m.loc;
  else if (m.kind === 'interior') ch = TOWN_DEFS[m.town].loc;
  else if (m.kind === 'dungeon') ch = DUNGEONS[m.dungeon].loc;
  const L = ch && locDef(ch);
  if (!L) return { x: G.x, y: G.y };
  return locMap(ch) === 'deep' ? { x: L.x * 2, y: L.y * 2 } : { x: L.x, y: L.y };
}
function onSeaFloor() {
  const m = Field.map;
  if (!m) return false;
  if (m.kind === 'deep') return true;
  const ch = m.kind === 'town' ? m.loc : m.kind === 'interior' ? TOWN_DEFS[m.town].loc : m.kind === 'dungeon' ? DUNGEONS[m.dungeon].loc : null;
  return !!ch && locMap(ch) === 'deep' && m.id !== 'undermarket' && m.town !== 'undermarket';
}

// ---------------- the sea floor ----------------
function applyDeepFlags(m) {
  if (!m || m.kind !== 'deep') return;
  const I = DEEP_LOC.I;
  m.set(I.x, I.y, G.flags.boss_palace ? 'I' : '#');
}
const WRECK_LOOT = ['tmap5', 'deep_pearl', 'megalixir'];
function deepEntities(m) {
  return (m.wrecks || []).map((w, i) => {
    const key = `chest:deep:${w.x},${w.y}`;
    return { kind: 'chest', x: w.x, y: w.y, key, loot: WRECK_LOOT[i] || 'gold:5000', opened: !!G.flags[key] };
  });
}
function diveSpotAt(x, y) { return G.flags.q_drowned ? DIVE_SPOTS.find(d => d.x === x && d.y === y) || null : null; }
async function diveDown(spot) {
  const f = G.flags;
  if (!f.bell) { await narrate(tl('The water here is black and very still. Whatever is down there is far too deep to reach. Brann might know a way.')); return; }
  const c = await choose(null, tl`Black water above ${spot.name}. Lower the diving bell?`, [tl('Dive'), tl('Not now')], 1);
  if (c !== 0) return;
  G.ship = { x: spot.x, y: spot.y, dir: G.dir }; G.onShip = false;
  Audio_.sfx('water');
  await fadeTo(1, 600, '#04101c');
  Field.enter('deep', spot.x / 2, spot.y / 2, 'down');
  await fadeTo(0, 800, '#04101c');
  if (!f.seen_deep) {
    f.seen_deep = true;
    await sayAll([
      [KE, tl('I can hear my own heartbeat. And something else. Something big, breathing.')],
      [LY, tl('The lamp only reaches a few steps. Everything past that is just... dark.')],
      [OS, tl('The Abbot\'s chart puts Nerith at the centre, right below where the whirlpool used to turn. Follow the trenches.')]
    ]);
    toast(tl('Walk onto a bell line (↑) to surface'));
  }
  autoSave();
}
async function surfacePrompt() {
  const spot = DIVE_SPOTS.find(d => d.x / 2 === G.x && d.y / 2 === G.y);
  if (!spot) return;
  const c = await choose(null, tl`The bell's line rises toward ${spot.name}. Surface here?`, [tl('Surface'), tl('Stay down')], 1);
  if (c !== 0) return;
  G.onShip = true; G.ship = { x: spot.x, y: spot.y, dir: G.dir };
  Audio_.sfx('water');
  await fadeTo(1, 500, '#9ad8ff');
  Field.enter('world', spot.x, spot.y, G.dir);
  await fadeTo(0, 600, '#9ad8ff');
}

// ---------------- The Drowned Kingdom (quest) ----------------
async function drownedQuestStart() {
  await sayAll([
    [tl('Sister Wenna'), tl('Father Oswin. When we cleaned the Abbot\'s bell, this fell out of the clapper. Folded very small.')],
    [OS, tl('...A sea chart. In Tessaly\'s hand. Four patches of black water, and in the middle, one word: Nerith.')],
    [tl('Sister Wenna'), tl('Nerith? The first temple? The children\'s stories say the Sea Mother took it under the waves to keep it safe.')],
    [OS, tl('The Abbot never told stories he didn\'t believe. If he marked it, it is there. At the bottom of the sea.')],
    [KE, tl('Great. Has anyone got a very long ladder?')],
    [OS, tl('Brann might have something better. He has a shed full of things he swears he will fix one day.')]
  ]);
  addItem('tide_chart'); G.flags.q_drowned = true; Audio_.sfx('chest'); toast(tl('New quest: The Drowned Kingdom'));
  await narrate(tl('Received Tessaly\'s Chart! The four patches of black water are now marked on your world map.'));
}
// Brann fits the Dawnrunner with a diving bell. Returns true when it handled the conversation.
async function brannBell() {
  const f = G.flags;
  if (!f.q_drowned || f.bell) return false;
  const have = (G.inv.frost_crystal || 0) >= 2 && (G.inv.sun_gold || 0) >= 1;
  if (!f.bellAsked) {
    f.bellAsked = true;
    await sayAll([
      [tl('Brann'), tl('Dive? Under the sea? On purpose?')],
      [tl('Brann'), tl('...I have a bell. A diving bell, from my grandfather\'s salvage days. Brass, big as a cart. Never had the nerve to try it.')],
      [tl('Brann'), tl('The glass is cracked and the lamp\'s dead. Bring me two Frost Crystals for the glass and a Sun Gold for the lamp, and I\'ll hang it off the Dawnrunner myself.')]
    ]);
  }
  if (!have) { await say(tl('Brann'), tl`Two Frost Crystals and one Sun Gold. You have ${G.inv.frost_crystal || 0} and ${G.inv.sun_gold || 0}. Orrin's monsters drop them, or try the black market under Ironhold — if you didn't hear it from me.`); return true; }
  addItem('frost_crystal', -2); addItem('sun_gold', -1);
  await fadeTo(1, 400); Audio_.sfx('forge'); await wait(900); Audio_.sfx('forge'); await wait(600); await fadeTo(0, 400);
  f.bell = true; Audio_.sfx('chest');
  await sayAll([[tl('Brann'), tl('There. She\'s fitted. Sail onto a patch of black water and press Enter, and down you go.')], [tl('Brann'), tl('If you meet my grandfather down there, tell him the bell works. He bet me it never would.')]]);
  await narrate(tl('The Dawnrunner now carries a diving bell. Sail onto black water (marked on your map) and press Enter to dive.'));
  return true;
}

// ---------------- Nerith ----------------
function nerithNpcs() {
  const f = G.flags;
  const ghost = (seed, o) => npcLook(seed, { skin: '#c8e4ea', ...o });
  return [
    N(11, 8, 81, ghost(81, { hair: '#e8f4ff', style: 'long', body: '#2a6a7a', accent: '#5af0d0' }), async () => say(tl('Memory of a Guard'), f.boss_palace ? tl('I can stop standing guard now. I think I\'ll sit down. I haven\'t sat down in a thousand years.') : tl('The palace is east of the city. The King lets no one in. Mother Ysolde in the temple might change his mind. She\'s the only one he ever listened to.'))),
    N(6, 9, 82, ghost(82, { style: 'bun', body: '#3a7a8a', accent: '#e8c24a' }), async () => say(tl('Memory of a Fishwife'), f.boss_palace ? tl('The tide is moving again. You can feel it in your teeth. I\'ve missed it.') : tl('Fish? Oh, dear, we haven\'t sold fish in ten centuries. We just remember selling them. It\'s nearly as good. Not really.')), { wander: true }),
    N(17, 8, 83, ghost(83, { style: 'spiky', body: '#4a8aa0' }), async () => say(tl('Memory of a Boy'), tl('Are you alive? Really alive? Can I touch your sleeve? ...It\'s WARM. Mum! The visitors are WARM!')), { wander: true }),
    N(14, 12, 84, ghost(84, { hair: '#d8e8f0', style: 'bald', beard: true, body: '#2a4a5a', robe: true }), async () => sayAll(f.boss_palace ? [[tl('Old Captain Oriel'), tl('I sailed the first ship out of Nerith. I\'ll sail the last one too, I suppose — straight up, into the light. Thank you for that.')]] : [[tl('Old Captain Oriel'), tl('When the Long Night came, Nereus was afraid the world would forget us. So he asked the sea to remember us instead.')], [tl('Old Captain Oriel'), tl('The sea said yes. That is the trouble with the sea. It always says yes.')]])),
    N(5, 15, 85, ghost(85, { style: 'long', body: '#5a8a9a', accent: '#ffe9a8' }), async () => say(tl('Coral-singer Liss'), hasItem('abbots_bell') || inParty('oswin') ? tl('That priest of yours hums the old hymns flat. Tell him the Sea Mother forgives him. I don\'t.') : tl('We sing to the coral so it keeps growing. It has grown for a thousand years. It is VERY big now.')))
  ];
}
function deepInteriorNpcs(m) {
  const f = G.flags, t = m.town;
  if (t === 'nerith' && m.ikind === 'chapel') return [{ x: 6, y: 3, look: { skin: '#d8eef2', hair: '#f0f8ff', style: 'long', body: '#1a5a6a', accent: '#5af0d0', robe: true }, name: tl('Mother Ysolde'), mark: !f.ysolde || (f.boss_palace && !f.ysolde_thanks), talk: talkYsolde }];
  if (t === 'nerith' && m.ikind === 'hall') return [{ x: 6, y: 2, look: npcLook(86, { skin: '#c8e4ea', style: 'bald', beard: true, robe: true, body: '#2a4a5a' }), talk: async () => sayAll([[tl('Archivist Thule'), tl('Every book in Nerith is wet. We read them anyway. The ink has been running for a thousand years, so the endings keep changing.')], [tl('Archivist Thule'), f.boss_palace ? tl('The newest entry reads: "Warm strangers came, and the King let go." I wrote it myself. I cried on it. Now it says "Worm strangers."') : tl('If you want the old king\'s story, ask Mother Ysolde. She was there. We all were, but she remembers it best.')]]) }];
  if (t === 'nerith' && m.ikind === 'house') return [];
  if (t === 'undermarket' && m.ikind === 'hall') return [{ x: 6, y: 2, look: { skin: '#e0b088', hair: '#c83a2a', style: 'spiky', body: '#3a2a3a', accent: '#9adf5a' }, name: tl('Mags'), talk: talkMags }];
  if (t === 'undermarket' && m.ikind === 'house') return [{ x: 6, y: 4, look: { skin: '#c8a888', hair: '#3a3a3a', style: 'long', body: '#2a2a3a', accent: '#e8c24a', hat: 'cap' }, name: tl('Whisper'), mark: !hasItem('tmap1') && !f.dug_1, talk: talkWhisper }];
  return null;
}
async function talkYsolde() {
  const f = G.flags;
  if (!f.ysolde) {
    await sayAll([
      [tl('Mother Ysolde'), tl('Living hearts. I can hear them from here, like drums. Come in, come in, before you let the warm out.')],
      [OS, tl('...Mother Ysolde. The first priestess. Your name is on the oldest stone in the Sunken Shrine.')],
      [tl('Mother Ysolde'), tl('Then the stone is kinder than I was. Sit, child of my order. You should know what happened here.')],
      [tl('Mother Ysolde'), tl('When the Long Night fell, King Nereus was afraid the world would end, and that nobody would be left to remember Nerith.')],
      [tl('Mother Ysolde'), tl('So he went down to the deepest trench and made a bargain with the oldest thing in the sea: the Tide That Remembers. It keeps everything that drowns.')],
      [tl('Mother Ysolde'), tl('It took the whole city down, and it remembers us still. That is why we are here, and why we cannot leave. Memories do not get to rest.')],
      [A, tl('And the King?')],
      [tl('Mother Ysolde'), tl('He sits in his palace, east of here, and holds on. As long as he holds on, the Tide holds us. He was a frightened man. He is a frightened ghost.')],
      [tl('Mother Ysolde'), tl('Go to him. Tell him the world did not end. Tell him the lamps are lit. If he will not listen... then make him let go.')]
    ]);
    f.ysolde = true; Audio_.sfx('heal'); healAll();
    await narrate(tl('The doors of the Drowned Palace will open for you now. (Your party was healed.)'));
    return;
  }
  if (f.boss_palace && !f.ysolde_thanks) {
    await sayAll([
      [tl('Mother Ysolde'), tl('I felt him let go. The whole city sighed. Some of us are already fading, smiling. It is a good fading.')],
      [tl('Mother Ysolde'), tl('But listen. The Tide itself is still down there, in the Hadal Rift at the far southeast of the sea floor. The trench has opened.')],
      [tl('Mother Ysolde'), tl('It remembers every storm, every wreck, every drowned sailor. And now it remembers you. It will want to keep you.')],
      [OS, tl('Then we will have to be very hard to keep.')],
      [tl('Mother Ysolde'), tl('Spoken like my order. Go when you are ready, and not before. It is far older than any king.')]
    ]);
    f.ysolde_thanks = true; Audio_.sfx('heal'); healAll(); toast(tl('New quest: The Tide That Remembers'));
    return;
  }
  await say(tl('Mother Ysolde'), f.tide_done ? tl('The sea is only the sea now. It forgets, like everyone else. I find I like that.') : f.boss_palace ? tl('The Hadal Rift lies at the far southeast of the sea floor. Rest first. Then rest again.') : tl('The palace is east of the city. The King is waiting. He has been waiting for a thousand years. He will not mind waiting while you rest.'));
  Audio_.sfx('heal'); healAll();
  await narrate(tl('Mother Ysolde\'s blessing restored your party.'));
}
async function palaceBoss() {
  const f = G.flags;
  await sayAll([
    [tl('Nereus'), tl('WARM THINGS. IN MY CITY. YOU WILL MAKE THEM REMEMBER BEING ALIVE.')],
    [A, tl('The Long Night is over, Your Majesty. The Lanterns are lit. The world didn\'t end.')],
    [tl('Nereus'), tl('LIES. THE WORLD ALWAYS ENDS. I SAVED NERITH FROM FORGETTING. I WILL SAVE IT FROM YOU.')],
    [OS, tl('You saved it from living. Let them go.')]
  ]);
  const r = await startBattle(['nereus'], { boss: true, bg: 'palace' });
  if (r === 'lose') return gameOver();
  f.boss_palace = true; refreshEntities();
  await sayAll([
    ['', tl('The water in the throne room goes still. Nereus sinks onto his throne, small and grey, an old man at last.')],
    [tl('Nereus'), tl('Is it true? The lamps?')],
    [A, tl('Twelve on the roads. Seven in the world. And one in my pocket.')],
    [tl('Nereus'), tl('...Then I was afraid for nothing. For a thousand years. Take the crown. It is heavy, and I am tired of being king of nothing.')]
  ]);
  addItem('tidecrown'); Audio_.sfx('chest');
  await narrate(tl('Received the Crown of Nerith! (Accessory: all stats +16, prevents slow and sleep)'));
  await narrate(tl('Far to the southeast, something in the deep turns over in its sleep.'));
}
async function hadalBoss() {
  const f = G.flags;
  await sayAll([
    ['', tl('The trench opens into nothing. Then the nothing opens its eyes. Hundreds of them, pale as drowned moons.')],
    [tl('The Tide That Remembers'), tl('I REMEMBER THE FIRST RAIN. I REMEMBER EVERY SHIP. I REMEMBER THE KING WHO GAVE ME HIS CITY.')],
    [tl('The Tide That Remembers'), tl('AND NOW HE HAS TAKEN IT BACK. SOMETHING MUST BE KEPT. YOU WILL DO.')],
    [KE, tl('Hard pass.')],
    [OS, tl('Sea Mother, if you are listening down here, now would be a lovely time.')]
  ]);
  const r = await startBattle(['tide'], { boss: true, bg: 'hadal', music: 'final' });
  if (r === 'lose') return gameOver();
  f.boss_hadal = true; f.tide_done = true; refreshEntities();
  await sayAll([
    ['', tl('The eyes close, one by one. The water around you warms, just slightly, like a held breath let go.')],
    [tl('The Tide That Remembers'), tl('...I WILL TRY TO FORGET. IT IS VERY HARD. BUT I WILL TRY TO REMEMBER YOU KINDLY.')],
    [SE, tl('That\'s the nicest thing a monster has ever said to me.')]
  ]);
  addItem('tidesong'); Audio_.sfx('chest');
  await narrate(tl('Received Tidesong! (Accessory: all stats +26, Regen, no ailments)'));
}

// ---------------- treasure maps ----------------
function digSpotAt(x, y) {
  const m = Field.map;
  if (!m || !m.digs) return null;
  for (const k in m.digs) { const d = m.digs[k]; if (d && d.x === x && d.y === y && hasItem('tmap' + k) && !G.flags['dug_' + k]) return +k; }
  return null;
}
function mapsDug() { return [1, 2, 3, 4, 5].filter(k => G.flags['dug_' + k]).length; }
function mapsFound() { return [1, 2, 3, 4, 5].filter(k => G.flags['dug_' + k] || hasItem('tmap' + k)).length; }
// a battle against map-carrying monsters may drop the next missing map (2, 3 or 4), once per battle
function treasureMapDrop(enemies) {
  if (!enemies.some(e => e.def.tmap) || Math.random() >= 0.2) return null;
  const k = [2, 3, 4].find(n => !hasItem('tmap' + n) && !G.flags['dug_' + n]);
  return k ? 'tmap' + k : null;
}
async function digTreasure(k) {
  await narrate(tl('This is the spot from the map. The party starts digging...'));
  for (let i = 0; i < 3; i++) { Audio_.sfx('bump'); await wait(320); }
  Audio_.sfx('chest');
  G.flags['dug_' + k] = true; addItem('tmap' + k, -1);
  const got = [];
  for (const l of TREASURES[k].loot) {
    if (l.startsWith('gold:')) { const n = parseInt(l.slice(5)); G.gold += n; got.push(n + ' gold'); }
    else { addItem(l); got.push(ITEMS[l].name); }
  }
  await narrate(tl`Buried treasure! Found ${listJoin(got)}.`);
  if (mapsDug() === 5) await narrate(tl('That was the last of the five maps. Whisper in the Undermarket will want to hear about this.'));
}

// ---------------- lanternmoths ----------------
// After Arin's roads are lit, every roadside lamp stays on the world map. With the Moth Whistle, a lamp gives you a moth to ride.
function mothLampEntities(map) {
  if (!G.flags.road_done) return [];
  return ROAD_LAMPS.filter(([x, y]) => !(map.region[y][x] === null && map.at(x, y) === '~')).map(([x, y]) => ({ kind: 'roadlamp', x, y, lit: true, moths: true, talk: lampMoth }));
}
async function lampMoth() {
  if (!hasItem('moth_whistle')) { await narrate(G.flags.q_moth ? tl('Pale moths circle the lamp. Old Ivy\'s whistle would call one down.') : tl('The roadside lamp burns small and steady. Big pale moths circle it, drowsy with the light.')); return; }
  const c = await choose(null, tl('A lanternmoth the size of a pony rests on the lamp. Ride it?'), [tl('Ride'), tl('Leave it')], 1);
  if (c !== 0) return;
  G.onMoth = true; G.flags.rode_moth = true; Audio_.sfx('buff'); Audio_.play('sky');
  toast(tl('No monsters on a moth · Enter to land'));
}
async function dismountMoth() {
  G.onMoth = false; Audio_.sfx('stairs'); Field.playMusic();
  toast(tl('The moth flutters back toward its lamp'));
}
async function talkIvy() {
  const f = G.flags;
  if (!f.road_done) { await say(tl('Old Ivy'), tl('I kept lanternmoths, once. When the roadside lamps went dark, my flock flew off into the Whisperwood and never came back. Seven years now.')); return; }
  if (!hasItem('moth_whistle')) {
    await sayAll([
      [tl('Old Ivy'), tl('Do you see them? On every lamp! My moths came home the night the twelfth lamp was lit.')],
      [tl('Old Ivy'), tl('You did that, didn\'t you, Lamplighter? Your father used to give me a wave on his rounds.')],
      [tl('Old Ivy'), tl('Here: my whistle. Blow it at any lit roadside lamp and a moth will come down for you. They fly low and fast, and nothing with teeth can catch them.')]
    ]);
    addItem('moth_whistle'); f.q_moth = true; Audio_.sfx('chest');
    await narrate(tl('Received the Moth Whistle! Talk to a lit roadside lamp to ride a lanternmoth. Moths can\'t cross water or mountains, and meet no monsters.'));
    return;
  }
  await say(tl('Old Ivy'), tl('Be gentle with them over the mountains. They hate mountains. They hate wind, too. And rain. They\'re moths.'));
}

// ---------------- the Undermarket ----------------
function undermarketHatch() {
  return { kind: 'hatch', x: 6, y: 7, talk: async () => {
    const c = await choose(null, tl('The trapdoor to the Undercity. Kestrel left it unbolted.'), [tl('The Undermarket'), tl('The old tunnels'), tl('Stay here')], 2);
    if (c === 0) {
      await changeMap('undermarket', 10, 14, 'up');
      if (!G.flags.seen_undermarket) {
        G.flags.seen_undermarket = true;
        await sayAll(inParty('kestrel') ? [[KE, tl('Welcome to the Undermarket. Now that Vane\'s gone, the Guild runs it properly. Which is to say: still crookedly, but with lamps.')], [OS, tl('Is that a... black market?')], [KE, tl('It\'s a market. It\'s just very dark down here.')]] : [['', tl('Lanterns hang from rusted pipes. Stalls crowd the old tunnels. Someone is selling something that is still moving.')]]);
      }
    } else if (c === 1) {
      const d = getMap('undercity:0'); const [x, y] = freeNeighbor(d, d.up.x, d.up.y);
      await changeMap(d.id, x, y, 'down');
    }
  } };
}
function undermarketNpcs() {
  return [
    N(6, 12, 91, { body: '#3a3a3a', hat: 'cap', accent: '#9adf5a' }, async () => say(tl('Lookout'), tl('Captain Dunmar knows we\'re here. Captain Dunmar buys his pipe tobacco here. Everybody wins.')), { wander: true }),
    N(15, 8, 92, { style: 'bun', body: '#5a2a3a', accent: '#e8c24a' }, async () => say(tl('Stallkeeper Nim'), tl('Crystals, gold, silk, pearls. Three times the price, no questions asked. Questions are extra.'))),
    N(17, 13, 93, { style: 'spiky', body: '#4a4a2a' }, async () => say(tl('Rat-catcher'), G.flags.boss_palace ? tl('Heard a rumour you went to the bottom of the sea. Down here, that\'s called "Tuesday".') : tl('Biggest rat I ever caught was the size of a dog. Second biggest was the dog.')), { wander: true })
  ];
}
async function talkMags() {
  const f = G.flags;
  if (f.debt_done && hasItem('sunset_opal')) return heistTurnIn();
  if (f.debt_done && !f.q_heist) { if (inParty('kestrel')) return heistStart(); await say(tl('Mags'), tl('I\'ve got a job, but only for Kestrel. Bring her down here.')); return; }
  if (inParty('kestrel')) await sayAll([[tl('Mags'), tl('Kes! Look at you, all respectable. Guildmaster, they\'re saying. I nearly fell off my stool.')], [KE, tl('I am NOT the Guildmaster. I\'m a... silent partner.')], [tl('Mags'), tl('Very silent. You haven\'t paid your dues in three years. Go on, spend some money at Nim\'s. That counts.')]]);
  else await say(tl('Mags'), tl('Friends of Kestrel? Then you\'re friends of the Guild. Mind your purses anyway. Professional habit.'));
  if (f.debt_done && !f.mags_gift) { f.mags_gift = true; addItem('star_bomb'); addItem('star_bomb'); Audio_.sfx('item'); await narrate(tl('Mags slips you two Star Bombs. "For old times. Don\'t ask where they\'re from."')); }
}
async function talkWhisper() {
  const f = G.flags;
  if (mapsDug() === 5) {
    if (!f.whisper_done) {
      f.whisper_done = true;
      await sayAll([[tl('Whisper'), tl('All five? Every last hole in the ground? I sold those maps to forty people. You\'re the first who ever dug.')], [tl('Whisper'), tl('Here. My own map. It shows where I keep my savings. Go on — it\'s just that sack, behind you.')]]);
      G.gold += 50000; Audio_.sfx('chest');
      await narrate(tl('Received 50,000 gold!'));
      return;
    }
    await say(tl('Whisper'), tl('I\'m drawing new maps. Fake ones, mostly. Don\'t buy them.')); return;
  }
  if (!hasItem('tmap1') && !f.dug_1) {
    const c = await choose(tl('Whisper'), tl('Treasure maps. Real ones. The first is 8,000 gold. The other four? Bandits carry them, if you can catch one. And one went down with a ship.'), [tl('Buy (8,000 G)'), tl('No thanks')], 1);
    if (c === 0) {
      if (G.gold < 8000) { await say(tl('Whisper'), tl('Come back when your purse is heavier than your boots.')); return; }
      G.gold -= 8000; addItem('tmap1'); Audio_.sfx('item');
      await narrate(tl('Received the Map: Smuggler\'s Cove! Dig spots for the maps you carry are marked on your world map. Stand on the spot and press Enter to dig.'));
    }
    return;
  }
  await say(tl('Whisper'), tl`${mapsDug()} of 5 dug. Sand Bandits, Cutpurses and the Anglers on the sea floor carry the rest. Hit them until something falls out.`);
}
function blackmarketPrice(id) { return BLACKMARKET_PRICES[id] || ITEMS[id].price * BLACKMARKET_MARKUP; }
function shopPrice(listId, id) { return listId === 'blackmarket' ? blackmarketPrice(id) : ITEMS[id].price; }

// ---------------- quest log ----------------
function deepQuests() {
  const f = G.flags, q = [];
  if (f.q_drowned) q.push({ title: tl('The Drowned Kingdom'), giver: tl('Sister Wenna, Port Halden'), done: !!f.boss_palace, reward: tl('Crown of Nerith'), desc:
    f.boss_palace ? tl('King Nereus let go, and Nerith can rest at last.')
      : !f.bell ? tl('Ask Brann in Port Halden to fit the Dawnrunner with a diving bell. He needs 2 Frost Crystals and 1 Sun Gold.')
      : !f.visit_H ? tl('Sail onto a patch of black water (marked on your map) and press Enter to dive. Find Nerith on the sea floor, below where the whirlpool was.')
      : !f.ysolde ? tl('Speak with Mother Ysolde in Nerith\'s temple.')
      : tl('Enter the Drowned Palace, east of Nerith, and face King Nereus. Recommended level: 46+.') });
  if (f.ysolde_thanks) q.push({ title: tl('The Tide That Remembers'), giver: tl('Mother Ysolde, Nerith'), done: !!f.tide_done, reward: tl('Tidesong'), desc: f.tide_done ? tl('The Tide is trying to forget. It will remember you kindly.') : tl('Descend into the Hadal Rift, at the far southeast of the sea floor. The oldest thing in the sea is waiting. Recommended: level 50, a full Lantern Board and a good meal.') });
  if (f.q_moth) q.push({ title: tl('Lanternmoths'), giver: tl('Old Ivy, Brightwater'), done: true, reward: tl('Moth Whistle'), desc: tl('Talk to any lit roadside lamp to ride a lanternmoth: fast, low, and no monsters. Moths can\'t cross water or mountains.') });
  if (mapsFound()) q.push({ title: tl('Buried Treasure'), giver: tl('Whisper, the Undermarket'), done: !!f.whisper_done, reward: tl('50,000 gold'), desc: f.whisper_done ? tl('Five maps, five holes, one very surprised map-seller.') : tl`Dig up all five treasure maps. Carried maps are marked on your world map; stand on the spot and press Enter. (${mapsDug()}/5 dug)` });
  return q;
}
