'use strict';
// ============================================================
//  HEARTS OF THE LAMPLIGHTERS (1.5) — one personal quest per hero,
//  each ending in a Limit and an ultimate weapon. All unlock after the ending.
// ============================================================
const HEROES_DONE = () => ['road_done', 'grimoire_done', 'grotto_done', 'debt_done', 'echo_done'].filter(k => G.flags[k]).length;

async function learnLimit(id) {
  const first = !Object.keys(LIMITS).some(k => G.flags['limit_' + k]);
  G.flags['limit_' + id] = true;
  Audio_.sfx('levelup');
  await narrate(tl`${HEROES[id].name} learned the Limit ${LIMITS[id].name}!`);
  if (first) await narrate(tl('Limits charge as a hero takes damage. When the gold bar under their name in battle is full, a ★ command appears at the top of their menu.'));
}

// ---------- Arin: The Lamplighter's Road ----------
async function roadQuestStart() {
  const f = G.flags;
  await sayAll([
    [tl('Elder Maren'), tl('Arin. Before you rush off again — this belonged to your father. His ledger. He walked the same rounds every season for thirty years.')],
    [tl('Elder Maren'), tl('Twelve roadside lamps, on all four roads. Little things. Nobody notices them until they\'re dark. They went dark the night he died, and nobody has lit them since.')],
    [A, tl('...I didn\'t know there were twelve.')],
    [tl('Elder Maren'), tl('He said a lamplighter who only lights the big flames has forgotten what the job is for. Go and finish his rounds.')]
  ]);
  addItem('fathers_ledger'); f.q_road = true; Audio_.sfx('chest'); toast(tl('New quest: The Lamplighter\'s Road'));
  await narrate(tl('Received Father\'s Ledger. The twelve lamps are marked on your world map (Menu → Map).'));
  refreshEntities();
}
function lampsLit() { return ROAD_LAMPS.filter((_, i) => G.flags['lamp_' + i]).length; }
function worldQuestEntities(map) {
  const f = G.flags, out = [];
  if (!f.q_road || f.road_done) return out;
  ROAD_LAMPS.forEach(([x, y], i) => {
    if (map.region[y][x] === null && map.at(x, y) === '~') return; // the Ashen Isle lamp waits for the isle
    out.push({ kind: 'roadlamp', x, y, lit: !!f['lamp_' + i], talk: () => lightRoadLamp(i) });
  });
  return out;
}
async function lightRoadLamp(i) {
  const f = G.flags;
  if (f['lamp_' + i]) { await narrate(tl('The roadside lamp burns small and steady.')); return; }
  const last = lampsLit() === ROAD_LAMPS.length - 1;
  if (last) {
    await narrate(tl('Arin raises his hand to the last lamp. The flame catches — and all along the four roads, every lamp gutters at once, as if something just breathed in.'));
    Audio_.sfx('dark');
    await sayAll([['???', tl('Mine. The little lights were MINE. I have eaten them for seven years.')], [LY, tl('Something\'s been living off the lamps!')], [A, tl('Then it\'s been eating my father\'s work. Not anymore.')]]);
    const r = await startBattle(['lampeater'], { boss: true, bg: 'dusk' });
    if (r === 'lose') return gameOver();
  }
  f['lamp_' + i] = true; Audio_.sfx('lantern');
  await narrate(last ? tl('The last lamp blazes. Up and down the four roads, twelve small lights burn again.') : tl`Arin lights the roadside lamp. (${lampsLit()}/${ROAD_LAMPS.length})`);
  if (last) await say(A, tl('That\'s his rounds done. Let\'s tell Elder Maren.'));
  refreshEntities();
}
async function roadQuestFinish() {
  const f = G.flags;
  await sayAll([
    [tl('Elder Maren'), tl('I saw them from the hall window. All twelve. Your father would stand right there and count them every night.')],
    [tl('Elder Maren'), tl('He left this with me in case you ever finished his rounds. I think he knew you would.')]
  ]);
  addItem('fathers_ledger', -1); addItem('sunbearer'); f.road_done = true; Audio_.sfx('chest');
  await narrate(tl('Received the Sunbearer! (Arin: ATK +100, MAG +28)'));
  await learnLimit('arin');
}

// ---------- Lyra: Mother's Grimoire ----------
const RIDDLES = [
  { q: tl('I eat and I grow. Give me a drink and I die. What am I?'), a: [tl('Fire'), tl('A seed'), tl('Hunger'), tl('The wind')], ok: 0 },
  { q: tl('The more of me you take, the more you leave behind. What am I?'), a: [tl('Embers'), tl('Footsteps'), tl('Memories'), tl('Time')], ok: 1 },
  { q: tl('What burns without fuel, and outlasts the one who lit it?'), a: [tl('A candle'), tl('The sun'), tl('A promise'), tl('A grudge')], ok: 2 }
];
async function grimoireQuestStart() {
  await sayAll([
    [tl('Mira'), tl('Lyra, love. Your mother left something with me, years ago. She made me promise to wait until the Lanterns were lit again.')],
    [LY, tl('Mother\'s grimoire... I thought it burned with the house.')],
    [tl('Mira'), tl('She said it holds her last flame — in the Ember Caves, in the hills north of the road. And that only her daughters could open the way.')]
  ]);
  addItem('grimoire'); G.flags.q_grimoire = true; Audio_.sfx('chest'); toast(tl('New quest: Mother\'s Grimoire'));
  await narrate(tl('Received Mother\'s Grimoire! The Ember Caves lie in the hills north of the Brightwater road.'));
}
async function askRiddle(n) {
  const R = RIDDLES[n];
  await say(tl('A voice in the flames'), R.q);
  const c = await choose(LY, tl('The answer is...'), R.a);
  return c === R.ok;
}
async function riddleFire(n) {
  const f = G.flags;
  if (f['riddle_' + n]) { await narrate(tl('The brazier burns blue and calm.')); return; }
  await narrate(tl('A brazier of old stone. As Lyra comes close, the fire speaks in her mother\'s voice.'));
  if (await askRiddle(n)) {
    f['riddle_' + n] = true; Audio_.sfx('holy');
    await narrate(tl('The flame turns a soft blue. Somewhere deeper in the cave, a door of fire opens.'));
    await say(LY, n === 0 ? tl('She used to ask me that one before bed. I always said "dragons".') : tl('Footsteps... She walked me to school every day until I was twelve.'));
  } else {
    Audio_.sfx('buzz');
    await narrate(tl('The fire roars, and imps tumble out of the coals!'));
    const r = await startBattle(['kilnimp', 'kilnimp'], { bg: 'mine' });
    if (r === 'lose') return gameOver();
    await say(LY, tl('Wrong answer. Let me think again...'));
  }
  refreshEntities();
}
async function grimoireBoss() {
  const f = G.flags;
  if (!f.riddle_0 || !f.riddle_1) { await narrate(tl('A wall of fire blocks the inner chamber. Two braziers in the cave must burn blue before it will part.')); return false; }
  await sayAll([
    [tl('Hearth Warden'), tl('I KEPT HER LAST FLAME. I WILL GIVE IT ONLY TO ONE WHO KNOWS WHAT IT IS FOR.')],
    [LY, tl('Then ask me.')]
  ]);
  if (await askRiddle(2)) {
    Audio_.sfx('heal'); healAll();
    await sayAll([[tl('Hearth Warden'), tl('A PROMISE. YES. SHE MADE ONE TO YOU.')], ['', tl('The Warden\'s fire washes over the party, warm as a hearth. HP and MP restored!')], [tl('Hearth Warden'), tl('BUT A FLAME MUST STILL BE TESTED.')]]);
  } else await say(tl('Hearth Warden'), tl('NO. THEN SHOW ME WITH FIRE WHAT YOU CANNOT SAY.'));
  const r = await startBattle(['hearthwarden'], { boss: true, bg: 'mine' });
  if (r === 'lose') return gameOver();
  f.boss_embercave = true; refreshEntities();
  await sayAll([
    ['', tl('The Warden crumbles into warm coals. In the ashes lies a staff, its tip still glowing.')],
    [LY, tl('...Her staff. She told me she\'d teach me to use it when I was old enough.')],
    withSelene([SE, tl('You\'re old enough, Lyra. She\'d have said so.')], [A, tl('Looks like she did teach you, in the end.')])
  ]);
  addItem('grimoire', -1); addItem('hearthstaff'); f.grimoire_done = true; Audio_.sfx('chest');
  await narrate(tl('Received the Hearthstaff! (Lyra: ATK +26, MAG +84)'));
  await learnLimit('lyra');
  return true;
}

// ---------- Oswin: The Drowned Priesthood ----------
async function grottoQuestStart() {
  await sayAll([
    [tl('Sister Wenna'), tl('Father Oswin. A fisherman brought this in. It was sealed in a bottle with our order\'s mark.')],
    [OS, tl('...This is Abbot Tessaly\'s hand. My teacher. He stayed in the old grotto when the sea rose, fifty years ago. He wouldn\'t leave the Sea Mother\'s bell.')],
    [OS, tl('"The tide has taken my mind, but not yet my heart. Come and ring the bell for me, little Oswin." ...Little Oswin. Nobody has called me that in half a century.')]
  ]);
  addItem('priest_letter'); G.flags.q_grotto = true; Audio_.sfx('chest'); toast(tl('New quest: The Drowned Priesthood'));
  await narrate(tl('Received The Last Letter! The Sea Mother\'s Grotto lies on the coast east of Port Halden.'));
}
async function grottoBoss() {
  const f = G.flags;
  await sayAll([
    [tl('The Drowned Abbot'), tl('WHO... WALKS IN MY TIDE...')],
    [OS, tl('Your student, Abbot. Older than you were. Balder, too.')],
    [tl('The Drowned Abbot'), tl('OSWIN... RING... THE BELL... BEFORE I FORGET YOUR NAME AGAIN...')]
  ]);
  const r = await startBattle(['abbot'], { boss: true, bg: 'shrine' });
  if (r === 'lose') return gameOver();
  f.boss_grotto = true; refreshEntities();
  await sayAll([
    ['', tl('The water drains from the Abbot\'s robes. For a moment, an old man stands there, smiling.')],
    [tl('Abbot Tessaly'), tl('You came. You always were the slow one, Oswin. And the one who never gave up.')],
    [tl('Abbot Tessaly'), tl('Take the bell. Ring it when the tide comes for your friends, and the Sea Mother will push it back.')],
    [OS, tl('Rest now, teacher. I\'ll ring it loud.')]
  ]);
  addItem('priest_letter', -1); addItem('abbots_bell'); f.grotto_done = true; Audio_.sfx('chest');
  await narrate(tl('Received the Abbot\'s Bell! (Oswin: ATK +72, MAG +64)'));
  await learnLimit('oswin');
}

// ---------- Kestrel: Old Debts ----------
async function debtQuestStart() {
  await sayAll([
    [tl('Guard'), tl('Kestrel. Someone slipped this under the jail door last night. Nobody saw who. Nobody ever sees who.')],
    [KE, tl('...Vane\'s marker. My old guildmaster. He raised me — if you call teaching a seven-year-old to pick locks "raising".')],
    [KE, tl('It says I owe him for "seven years of room, board and education". With interest. He wants it paid in kids — new pickpockets for the Guild.')],
    [A, tl('Then we pay him a visit instead.')],
    [KE, tl('There\'s a hatch in this jail that leads to the Undercity. Don\'t ask how I know. ...I know because I dug it.')]
  ]);
  addItem('debt_note'); G.flags.q_debt = true; Audio_.sfx('chest'); toast(tl('New quest: Old Debts'));
  await narrate(tl('Received Vane\'s Marker. A trapdoor in the Ironhold jail leads down to the Undercity.'));
}
async function vaneBoss() {
  const f = G.flags;
  await sayAll([
    [tl('Guildmaster Vane'), tl('My little Kestrel. Come home with friends. How sweet. Did you bring my payment?')],
    [KE, tl('I brought you a receipt. It\'s pointy.')],
    [tl('Guildmaster Vane'), tl('I taught you everything you know.')],
    [KE, tl('Not everything. They taught me the rest.')]
  ]);
  const r = await startBattle(['vane'], { boss: true, bg: 'mine' });
  if (r === 'lose') return gameOver();
  f.boss_undercity = true; refreshEntities();
  await sayAll([
    ['', tl('Vane drops to one knee. His knife skitters across the stone and stops at Kestrel\'s boot.')],
    [KE, tl('The Guild\'s kids walk out of here today. All of them. And the marker\'s paid.')],
    [tl('Guildmaster Vane'), tl('...You were always my best.')],
    [KE, tl('I know. That was the problem.')],
    [OS, tl('Captain Dunmar will want a word with him. Several words.')]
  ]);
  addItem('debt_note', -1); addItem('pickpocket'); f.debt_done = true; Audio_.sfx('chest');
  await narrate(tl('Received Pickpocket\'s Prize! (Kestrel: ATK +94, SPD +20)'));
  await learnLimit('kestrel');
}
function interiorQuestEntities(m) {
  const f = G.flags, out = [];
  if (m.town === 'ironhold' && m.ikind === 'jail' && f.q_debt && !f.debt_done)
    out.push({ kind: 'hatch', x: 6, y: 7, talk: async () => {
      if (!inParty('kestrel')) { await narrate(tl('A heavy trapdoor, bolted from below. Kestrel would know how to open it.')); return; }
      await say(KE, tl('Down we go. Hold your nose — the Undercity smells like money and old soup.'));
      const d = getMap('undercity:0'); const [x, y] = freeNeighbor(d, d.up.x, d.up.y);
      await changeMap(d.id, x, y, 'down');
      if (!f.seen_undercity) { f.seen_undercity = true; await say(KE, tl('Two levels down to the Guild hall. The guards here are mine. Well — they were.')); }
    } });
  if (m.town === 'ironhold' && m.ikind === 'jail' && f.debt_done) out.push(undermarketHatch());
  return out;
}

// ---------- Selene: Echo of Vesper ----------
async function echoQuestStart() {
  await sayAll([
    [tl('Mira'), tl('And Selene, dear — you haven\'t slept a full night since you came home. I can hear you pacing.')],
    [SE, tl('...She\'s still there, Mira. Vesper. When I close my eyes, she talks to me in my own voice.')],
    [tl('Mira'), tl('Then stop running from her. Rest at an inn, and when she comes, face her. Alone, I expect. That sort of thing usually is.')]
  ]);
  G.flags.q_echo = true; toast(tl('New quest: Echo of Vesper'));
  await narrate(tl('Selene will face her dream the next time the party rests at an inn.'));
}
async function innDream() {
  const f = G.flags;
  if (!f.q_echo || f.echo_done || !inParty('selene')) return;
  await fadeTo(1, 400, '#1a0830');
  await narrate(tl('That night, Selene dreams. She stands alone at the top of the Hollow Spire, and someone is waiting for her in a black hood.'));
  await sayAll([[tl('Vesper\'s Echo'), tl('There you are. Did you really think you could leave me behind in the dark?')], [SE, tl('No. I came to take you with me.')]]);
  await fadeTo(0, 300, '#1a0830');
  const sel = G.party.find(m => m.id === 'selene');
  const keep = { hp: sel.hp, mp: sel.mp };
  sel.hp = maxHp(sel); sel.mp = maxMp(sel);
  const r = await startBattle(['echo'], { boss: true, bg: 'throne', party: ['selene'], noVictory: true });
  Object.assign(sel, keep);
  if (r !== 'win') {
    // a lost dream is not a game over: return to the inn
    G.scene = Field; Field.playMusic(); await fadeTo(0, 300);
    await narrate(tl('Selene wakes with a gasp. The dream will come again the next time you rest at an inn.')); return;
  }
  await sayAll([
    [tl('Vesper\'s Echo'), tl('...You\'re not afraid of me anymore.')],
    [SE, tl('I\'m still afraid. I\'m just not alone with it.')],
    ['', tl('The echo becomes a small, cold star, and settles into Selene\'s hand.')]
  ]);
  addItem('duskstar'); f.echo_done = true; Audio_.sfx('chest');
  await narrate(tl('Received the Duskstar! (Selene: ATK +28, MAG +84)'));
  await learnLimit('selene');
  await say(LY, tl('You slept through the night. First time since you came home.'));
}

// ---------- campfire talks (resting with a Tent on the world map) ----------
// built on demand: the speaker names (A, LY, ...) are defined later in story.js
const campfires = () => [
  { need: ['arin', 'lyra'], lines: [[LY, tl('When we were kids we used to count the stars from your roof. You always lost count at forty.')], [A, tl('I lost count at forty because you kept changing which ones counted.')], [LY, tl('The bright ones count double. Everybody knows that.')]] },
  { need: ['oswin'], lines: [[OS, tl('I dreamed of fish again last night. A very large one. It asked me for directions.')], [KE, tl('Did you give them?')], [OS, tl('I sent it to Port Halden. Brann will be thrilled.')]] },
  { need: ['kestrel', 'arin'], lines: [[KE, tl('You know this is the longest I\'ve ever had an honest job? Six months. It\'s exhausting.')], [A, tl('You get used to it.')], [KE, tl('That\'s what I\'m afraid of.')]] },
  { need: ['lyra', 'selene'], flag: 'lantern3', lines: [[SE, tl('You still sleep with one foot out of the blanket.')], [LY, tl('You remember that?')], [SE, tl('I remember everything about you, Lyra. That was the hardest part of the dark.')]] },
  { need: ['lyra'], flag: 'airship', lines: [[LY, tl('Arin. When this is all over, let\'s just fly. No Lanterns. No kings. Just pick a direction.')], [A, tl('You\'d get bored in a day.')], [LY, tl('Two days. Minimum.')]] },
  { need: ['arin', 'oswin'], flag: 'ending', lines: [[A, tl('What do lamplighters do when every Lantern is lit?')], [OS, tl('They check them again tomorrow. That is the whole secret, Arin. Tomorrow, and the day after.')]] },
  { need: ['selene'], flag: 'boss_abyss', lines: [[SE, tl('Orun sang to the night so it would let children sleep. I think I\'d like to learn that song.')], [KE, tl('You sing?')], [SE, tl('Badly. Lyra got all the talent.')], [LY, tl('I got the volume.')]] },
  { need: ['arin', 'lyra', 'oswin', 'kestrel'], flag: 'heartsAll', lines: [[A, tl('Twelve lamps, a grimoire, a bell, a knife, and a bad dream.')], [KE, tl('Sounds like the worst shopping list ever.')], [OS, tl('Sounds like a family, to me.')]] }
];
async function campfireTalk() {
  const f = G.flags;
  if (HEROES_DONE() === 5) f.heartsAll = true;
  const CAMPFIRES = campfires();
  const i = CAMPFIRES.findIndex((c, k) => !f['camp_' + k] && c.need.every(inParty) && (!c.flag || f[c.flag]));
  if (i < 0) return;
  f['camp_' + i] = true;
  await narrate(tl('The party sits around the campfire for a while.'));
  await sayAll(CAMPFIRES[i].lines);
}

// ---------- the Festival of Lanterns (all five quests done) ----------
async function festival() {
  const f = G.flags;
  await sayAll([[tl('Elder Maren'), tl('Five of you, five errands finished. The village wants to do something about it. They\'ve been planning for a week. I was not consulted.')]]);
  await fadeTo(1, 800);
  Audio_.play('ending', true);
  G.scene = BlackScene; BlackScene.lines = []; BlackScene.t = 0;
  await fadeTo(0, 600);
  for (const s of [tl('That night, Brightwater lit a lantern for every house.'), tl('Twelve on the roads. Five on the green.'), tl('And one more, small and stubborn, for the lamplighter who came before.')]) { BlackScene.lines.push({ s, at: BlackScene.t }); await wait(2600); }
  await wait(1200);
  await fadeTo(1, 800); G.scene = Field; Field.playMusic(); await fadeTo(0, 600);
  await sayAll([
    [LY, tl('Arin. Look. You can see all of them from here.')],
    [A, tl('Dad would\'ve counted them.')],
    withSelene([SE, tl('Then let\'s count them. The bright ones count double.')], [OS, tl('Then let us count them. Slowly. My eyes are old.')]),
    [tl('Elder Maren'), tl('One more thing. The whole village chipped in. Pip insisted on adding a "brave part".')]
  ]);
  addItem('heartlight'); f.festival = true; Audio_.sfx('chest');
  await narrate(tl('Received the Heartlight! (Accessory: all +20, revives once per battle, prevents all ailments)'));
  await narrate(tl('— Hearts of the Lamplighters · Complete —'));
}

// ---------- quest log ----------
function heartsQuests() {
  const f = G.flags, q = [];
  if (f.q_road) q.push({ title: tl('The Lamplighter\'s Road'), giver: tl('Elder Maren, Brightwater'), done: !!f.road_done, reward: tl('Sunbearer, Limit: First Light'), desc: f.road_done ? tl('Twelve small lights burn on the four roads again.') : lampsLit() >= ROAD_LAMPS.length ? tl('Every lamp is lit. Tell Elder Maren.') : tl`Relight the twelve roadside lamps marked on your world map. (${lampsLit()}/${ROAD_LAMPS.length})` });
  if (f.q_grimoire) q.push({ title: tl('Mother\'s Grimoire'), giver: tl('Mira, Brightwater'), done: !!f.grimoire_done, reward: tl('Hearthstaff, Limit: Phoenix Rite'), desc: f.grimoire_done ? tl('Lyra carries her mother\'s staff.') : tl`Answer the riddle braziers in the Ember Caves (north of the Brightwater road) and face the Hearth Warden. Lyra must be in the party. (${['riddle_0', 'riddle_1'].filter(k => f[k]).length}/2 braziers)` });
  if (f.q_grotto) q.push({ title: tl('The Drowned Priesthood'), giver: tl('Sister Wenna, Port Halden'), done: !!f.grotto_done, reward: tl('Abbot\'s Bell, Limit: High Tide'), desc: f.grotto_done ? tl('Abbot Tessaly rests, and his bell rings for Oswin.') : tl('Find Abbot Tessaly in the Sea Mother\'s Grotto, on the coast east of Port Halden. Oswin must be in the party.') });
  if (f.q_debt) q.push({ title: tl('Old Debts'), giver: tl('Guard, Ironhold jail'), done: !!f.debt_done, reward: tl('Pickpocket\'s Prize, Limit: Grand Larceny'), desc: f.debt_done ? tl('The marker is paid, and the Guild\'s children are free.') : tl('Take the trapdoor in the Ironhold jail down to the Undercity and settle with Guildmaster Vane. Kestrel must be in the party.') });
  if (f.q_echo) q.push({ title: tl('Echo of Vesper'), giver: tl('Mira, Brightwater'), done: !!f.echo_done, reward: tl('Duskstar, Limit: Long Night'), desc: f.echo_done ? tl('Selene sleeps through the night now.') : tl('Rest at any inn with Selene in the party, and face the echo in her dream. She fights alone.') });
  if (HEROES_DONE() === 5) q.push({ title: tl('The Festival of Lanterns'), giver: tl('Elder Maren, Brightwater'), done: !!f.festival, reward: tl('Heartlight'), desc: f.festival ? tl('Brightwater lit a lantern for every house.') : tl('All five hearts are mended. Visit Elder Maren in Brightwater.') });
  return q;
}
