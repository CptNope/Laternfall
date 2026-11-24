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
  await narrate(`${HEROES[id].name} learned the Limit ${LIMITS[id].name}!`);
  if (first) await narrate('Limits charge as a hero takes damage. When the gold bar under their name in battle is full, a ★ command appears at the top of their menu.');
}

// ---------- Arin: The Lamplighter's Road ----------
async function roadQuestStart() {
  const f = G.flags;
  await sayAll([
    ['Elder Maren', 'Arin. Before you rush off again — this belonged to your father. His ledger. He walked the same rounds every season for thirty years.'],
    ['Elder Maren', 'Twelve roadside lamps, on all four roads. Little things. Nobody notices them until they\'re dark. They went dark the night he died, and nobody has lit them since.'],
    [A, '...I didn\'t know there were twelve.'],
    ['Elder Maren', 'He said a lamplighter who only lights the big flames has forgotten what the job is for. Go and finish his rounds.']
  ]);
  addItem('fathers_ledger'); f.q_road = true; Audio_.sfx('chest'); toast('New quest: The Lamplighter\'s Road');
  await narrate('Received Father\'s Ledger. The twelve lamps are marked on your world map (Menu → Map).');
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
  if (f['lamp_' + i]) { await narrate('The roadside lamp burns small and steady.'); return; }
  const last = lampsLit() === ROAD_LAMPS.length - 1;
  if (last) {
    await narrate('Arin raises his hand to the last lamp. The flame catches — and all along the four roads, every lamp gutters at once, as if something just breathed in.');
    Audio_.sfx('dark');
    await sayAll([['???', 'Mine. The little lights were MINE. I have eaten them for seven years.'], [LY, 'Something\'s been living off the lamps!'], [A, 'Then it\'s been eating my father\'s work. Not anymore.']]);
    const r = await startBattle(['lampeater'], { boss: true, bg: 'dusk' });
    if (r === 'lose') return gameOver();
  }
  f['lamp_' + i] = true; Audio_.sfx('lantern');
  await narrate(last ? 'The last lamp blazes. Up and down the four roads, twelve small lights burn again.' : `Arin lights the roadside lamp. (${lampsLit()}/${ROAD_LAMPS.length})`);
  if (last) await say(A, 'That\'s his rounds done. Let\'s tell Elder Maren.');
  refreshEntities();
}
async function roadQuestFinish() {
  const f = G.flags;
  await sayAll([
    ['Elder Maren', 'I saw them from the hall window. All twelve. Your father would stand right there and count them every night.'],
    ['Elder Maren', 'He left this with me in case you ever finished his rounds. I think he knew you would.']
  ]);
  addItem('fathers_ledger', -1); addItem('sunbearer'); f.road_done = true; Audio_.sfx('chest');
  await narrate('Received the Sunbearer! (Arin: ATK +100, MAG +28)');
  await learnLimit('arin');
}

// ---------- Lyra: Mother's Grimoire ----------
const RIDDLES = [
  { q: 'I eat and I grow. Give me a drink and I die. What am I?', a: ['Fire', 'A seed', 'Hunger', 'The wind'], ok: 0 },
  { q: 'The more of me you take, the more you leave behind. What am I?', a: ['Embers', 'Footsteps', 'Memories', 'Time'], ok: 1 },
  { q: 'What burns without fuel, and outlasts the one who lit it?', a: ['A candle', 'The sun', 'A promise', 'A grudge'], ok: 2 }
];
async function grimoireQuestStart() {
  await sayAll([
    ['Mira', 'Lyra, love. Your mother left something with me, years ago. She made me promise to wait until the Lanterns were lit again.'],
    [LY, 'Mother\'s grimoire... I thought it burned with the house.'],
    ['Mira', 'She said it holds her last flame — in the Ember Caves, in the hills north of the road. And that only her daughters could open the way.']
  ]);
  addItem('grimoire'); G.flags.q_grimoire = true; Audio_.sfx('chest'); toast('New quest: Mother\'s Grimoire');
  await narrate('Received Mother\'s Grimoire! The Ember Caves lie in the hills north of the Brightwater road.');
}
async function askRiddle(n) {
  const R = RIDDLES[n];
  await say('A voice in the flames', R.q);
  const c = await choose(LY, 'The answer is...', R.a);
  return c === R.ok;
}
async function riddleFire(n) {
  const f = G.flags;
  if (f['riddle_' + n]) { await narrate('The brazier burns blue and calm.'); return; }
  await narrate('A brazier of old stone. As Lyra comes close, the fire speaks in her mother\'s voice.');
  if (await askRiddle(n)) {
    f['riddle_' + n] = true; Audio_.sfx('holy');
    await narrate('The flame turns a soft blue. Somewhere deeper in the cave, a door of fire opens.');
    await say(LY, n === 0 ? 'She used to ask me that one before bed. I always said "dragons".' : 'Footsteps... She walked me to school every day until I was twelve.');
  } else {
    Audio_.sfx('buzz');
    await narrate('The fire roars, and imps tumble out of the coals!');
    const r = await startBattle(['kilnimp', 'kilnimp'], { bg: 'mine' });
    if (r === 'lose') return gameOver();
    await say(LY, 'Wrong answer. Let me think again...');
  }
  refreshEntities();
}
async function grimoireBoss() {
  const f = G.flags;
  if (!f.riddle_0 || !f.riddle_1) { await narrate('A wall of fire blocks the inner chamber. Two braziers in the cave must burn blue before it will part.'); return false; }
  await sayAll([
    ['Hearth Warden', 'I KEPT HER LAST FLAME. I WILL GIVE IT ONLY TO ONE WHO KNOWS WHAT IT IS FOR.'],
    [LY, 'Then ask me.']
  ]);
  if (await askRiddle(2)) {
    Audio_.sfx('heal'); healAll();
    await sayAll([['Hearth Warden', 'A PROMISE. YES. SHE MADE ONE TO YOU.'], ['', 'The Warden\'s fire washes over the party, warm as a hearth. HP and MP restored!'], ['Hearth Warden', 'BUT A FLAME MUST STILL BE TESTED.']]);
  } else await say('Hearth Warden', 'NO. THEN SHOW ME WITH FIRE WHAT YOU CANNOT SAY.');
  const r = await startBattle(['hearthwarden'], { boss: true, bg: 'mine' });
  if (r === 'lose') return gameOver();
  f.boss_embercave = true; refreshEntities();
  await sayAll([
    ['', 'The Warden crumbles into warm coals. In the ashes lies a staff, its tip still glowing.'],
    [LY, '...Her staff. She told me she\'d teach me to use it when I was old enough.'],
    withSelene([SE, 'You\'re old enough, Lyra. She\'d have said so.'], [A, 'Looks like she did teach you, in the end.'])
  ]);
  addItem('grimoire', -1); addItem('hearthstaff'); f.grimoire_done = true; Audio_.sfx('chest');
  await narrate('Received the Hearthstaff! (Lyra: ATK +26, MAG +84)');
  await learnLimit('lyra');
  return true;
}

// ---------- Oswin: The Drowned Priesthood ----------
async function grottoQuestStart() {
  await sayAll([
    ['Sister Wenna', 'Father Oswin. A fisherman brought this in. It was sealed in a bottle with our order\'s mark.'],
    [OS, '...This is Abbot Tessaly\'s hand. My teacher. He stayed in the old grotto when the sea rose, fifty years ago. He wouldn\'t leave the Sea Mother\'s bell.'],
    [OS, '"The tide has taken my mind, but not yet my heart. Come and ring the bell for me, little Oswin." ...Little Oswin. Nobody has called me that in half a century.']
  ]);
  addItem('priest_letter'); G.flags.q_grotto = true; Audio_.sfx('chest'); toast('New quest: The Drowned Priesthood');
  await narrate('Received The Last Letter! The Sea Mother\'s Grotto lies on the coast east of Port Halden.');
}
async function grottoBoss() {
  const f = G.flags;
  await sayAll([
    ['The Drowned Abbot', 'WHO... WALKS IN MY TIDE...'],
    [OS, 'Your student, Abbot. Older than you were. Balder, too.'],
    ['The Drowned Abbot', 'OSWIN... RING... THE BELL... BEFORE I FORGET YOUR NAME AGAIN...']
  ]);
  const r = await startBattle(['abbot'], { boss: true, bg: 'shrine' });
  if (r === 'lose') return gameOver();
  f.boss_grotto = true; refreshEntities();
  await sayAll([
    ['', 'The water drains from the Abbot\'s robes. For a moment, an old man stands there, smiling.'],
    ['Abbot Tessaly', 'You came. You always were the slow one, Oswin. And the one who never gave up.'],
    ['Abbot Tessaly', 'Take the bell. Ring it when the tide comes for your friends, and the Sea Mother will push it back.'],
    [OS, 'Rest now, teacher. I\'ll ring it loud.']
  ]);
  addItem('priest_letter', -1); addItem('abbots_bell'); f.grotto_done = true; Audio_.sfx('chest');
  await narrate('Received the Abbot\'s Bell! (Oswin: ATK +72, MAG +64)');
  await learnLimit('oswin');
}

// ---------- Kestrel: Old Debts ----------
async function debtQuestStart() {
  await sayAll([
    ['Guard', 'Kestrel. Someone slipped this under the jail door last night. Nobody saw who. Nobody ever sees who.'],
    [KE, '...Vane\'s marker. My old guildmaster. He raised me — if you call teaching a seven-year-old to pick locks "raising".'],
    [KE, 'It says I owe him for "seven years of room, board and education". With interest. He wants it paid in kids — new pickpockets for the Guild.'],
    [A, 'Then we pay him a visit instead.'],
    [KE, 'There\'s a hatch in this jail that leads to the Undercity. Don\'t ask how I know. ...I know because I dug it.']
  ]);
  addItem('debt_note'); G.flags.q_debt = true; Audio_.sfx('chest'); toast('New quest: Old Debts');
  await narrate('Received Vane\'s Marker. A trapdoor in the Ironhold jail leads down to the Undercity.');
}
async function vaneBoss() {
  const f = G.flags;
  await sayAll([
    ['Guildmaster Vane', 'My little Kestrel. Come home with friends. How sweet. Did you bring my payment?'],
    [KE, 'I brought you a receipt. It\'s pointy.'],
    ['Guildmaster Vane', 'I taught you everything you know.'],
    [KE, 'Not everything. They taught me the rest.']
  ]);
  const r = await startBattle(['vane'], { boss: true, bg: 'mine' });
  if (r === 'lose') return gameOver();
  f.boss_undercity = true; refreshEntities();
  await sayAll([
    ['', 'Vane drops to one knee. His knife skitters across the stone and stops at Kestrel\'s boot.'],
    [KE, 'The Guild\'s kids walk out of here today. All of them. And the marker\'s paid.'],
    ['Guildmaster Vane', '...You were always my best.'],
    [KE, 'I know. That was the problem.'],
    [OS, 'Captain Dunmar will want a word with him. Several words.']
  ]);
  addItem('debt_note', -1); addItem('pickpocket'); f.debt_done = true; Audio_.sfx('chest');
  await narrate('Received Pickpocket\'s Prize! (Kestrel: ATK +94, SPD +20)');
  await learnLimit('kestrel');
}
function interiorQuestEntities(m) {
  const f = G.flags, out = [];
  if (m.town === 'ironhold' && m.ikind === 'jail' && f.q_debt && !f.debt_done)
    out.push({ kind: 'hatch', x: 6, y: 7, talk: async () => {
      if (!inParty('kestrel')) { await narrate('A heavy trapdoor, bolted from below. Kestrel would know how to open it.'); return; }
      await say(KE, 'Down we go. Hold your nose — the Undercity smells like money and old soup.');
      const d = getMap('undercity:0'); const [x, y] = freeNeighbor(d, d.up.x, d.up.y);
      await changeMap(d.id, x, y, 'down');
      if (!f.seen_undercity) { f.seen_undercity = true; await say(KE, 'Two levels down to the Guild hall. The guards here are mine. Well — they were.'); }
    } });
  if (m.town === 'ironhold' && m.ikind === 'jail' && f.debt_done) out.push(undermarketHatch());
  return out;
}

// ---------- Selene: Echo of Vesper ----------
async function echoQuestStart() {
  await sayAll([
    ['Mira', 'And Selene, dear — you haven\'t slept a full night since you came home. I can hear you pacing.'],
    [SE, '...She\'s still there, Mira. Vesper. When I close my eyes, she talks to me in my own voice.'],
    ['Mira', 'Then stop running from her. Rest at an inn, and when she comes, face her. Alone, I expect. That sort of thing usually is.']
  ]);
  G.flags.q_echo = true; toast('New quest: Echo of Vesper');
  await narrate('Selene will face her dream the next time the party rests at an inn.');
}
async function innDream() {
  const f = G.flags;
  if (!f.q_echo || f.echo_done || !inParty('selene')) return;
  await fadeTo(1, 400, '#1a0830');
  await narrate('That night, Selene dreams. She stands alone at the top of the Hollow Spire, and someone is waiting for her in a black hood.');
  await sayAll([['Vesper\'s Echo', 'There you are. Did you really think you could leave me behind in the dark?'], [SE, 'No. I came to take you with me.']]);
  await fadeTo(0, 300, '#1a0830');
  const sel = G.party.find(m => m.id === 'selene');
  const keep = { hp: sel.hp, mp: sel.mp };
  sel.hp = maxHp(sel); sel.mp = maxMp(sel);
  const r = await startBattle(['echo'], { boss: true, bg: 'throne', party: ['selene'], noVictory: true });
  Object.assign(sel, keep);
  if (r !== 'win') {
    // a lost dream is not a game over: return to the inn
    G.scene = Field; Field.playMusic(); await fadeTo(0, 300);
    await narrate('Selene wakes with a gasp. The dream will come again the next time you rest at an inn.'); return;
  }
  await sayAll([
    ['Vesper\'s Echo', '...You\'re not afraid of me anymore.'],
    [SE, 'I\'m still afraid. I\'m just not alone with it.'],
    ['', 'The echo becomes a small, cold star, and settles into Selene\'s hand.']
  ]);
  addItem('duskstar'); f.echo_done = true; Audio_.sfx('chest');
  await narrate('Received the Duskstar! (Selene: ATK +28, MAG +84)');
  await learnLimit('selene');
  await say(LY, 'You slept through the night. First time since you came home.');
}

// ---------- campfire talks (resting with a Tent on the world map) ----------
// built on demand: the speaker names (A, LY, ...) are defined later in story.js
const campfires = () => [
  { need: ['arin', 'lyra'], lines: [[LY, 'When we were kids we used to count the stars from your roof. You always lost count at forty.'], [A, 'I lost count at forty because you kept changing which ones counted.'], [LY, 'The bright ones count double. Everybody knows that.']] },
  { need: ['oswin'], lines: [[OS, 'I dreamed of fish again last night. A very large one. It asked me for directions.'], [KE, 'Did you give them?'], [OS, 'I sent it to Port Halden. Brann will be thrilled.']] },
  { need: ['kestrel', 'arin'], lines: [[KE, 'You know this is the longest I\'ve ever had an honest job? Six months. It\'s exhausting.'], [A, 'You get used to it.'], [KE, 'That\'s what I\'m afraid of.']] },
  { need: ['lyra', 'selene'], flag: 'lantern3', lines: [[SE, 'You still sleep with one foot out of the blanket.'], [LY, 'You remember that?'], [SE, 'I remember everything about you, Lyra. That was the hardest part of the dark.']] },
  { need: ['lyra'], flag: 'airship', lines: [[LY, 'Arin. When this is all over, let\'s just fly. No Lanterns. No kings. Just pick a direction.'], [A, 'You\'d get bored in a day.'], [LY, 'Two days. Minimum.']] },
  { need: ['arin', 'oswin'], flag: 'ending', lines: [[A, 'What do lamplighters do when every Lantern is lit?'], [OS, 'They check them again tomorrow. That is the whole secret, Arin. Tomorrow, and the day after.']] },
  { need: ['selene'], flag: 'boss_abyss', lines: [[SE, 'Orun sang to the night so it would let children sleep. I think I\'d like to learn that song.'], [KE, 'You sing?'], [SE, 'Badly. Lyra got all the talent.'], [LY, 'I got the volume.']] },
  { need: ['arin', 'lyra', 'oswin', 'kestrel'], flag: 'heartsAll', lines: [[A, 'Twelve lamps, a grimoire, a bell, a knife, and a bad dream.'], [KE, 'Sounds like the worst shopping list ever.'], [OS, 'Sounds like a family, to me.']] }
];
async function campfireTalk() {
  const f = G.flags;
  if (HEROES_DONE() === 5) f.heartsAll = true;
  const CAMPFIRES = campfires();
  const i = CAMPFIRES.findIndex((c, k) => !f['camp_' + k] && c.need.every(inParty) && (!c.flag || f[c.flag]));
  if (i < 0) return;
  f['camp_' + i] = true;
  await narrate('The party sits around the campfire for a while.');
  await sayAll(CAMPFIRES[i].lines);
}

// ---------- the Festival of Lanterns (all five quests done) ----------
async function festival() {
  const f = G.flags;
  await sayAll([['Elder Maren', 'Five of you, five errands finished. The village wants to do something about it. They\'ve been planning for a week. I was not consulted.']]);
  await fadeTo(1, 800);
  Audio_.play('ending', true);
  G.scene = BlackScene; BlackScene.lines = []; BlackScene.t = 0;
  await fadeTo(0, 600);
  for (const s of ['That night, Brightwater lit a lantern for every house.', 'Twelve on the roads. Five on the green.', 'And one more, small and stubborn, for the lamplighter who came before.']) { BlackScene.lines.push({ s, at: BlackScene.t }); await wait(2600); }
  await wait(1200);
  await fadeTo(1, 800); G.scene = Field; Field.playMusic(); await fadeTo(0, 600);
  await sayAll([
    [LY, 'Arin. Look. You can see all of them from here.'],
    [A, 'Dad would\'ve counted them.'],
    withSelene([SE, 'Then let\'s count them. The bright ones count double.'], [OS, 'Then let us count them. Slowly. My eyes are old.']),
    ['Elder Maren', 'One more thing. The whole village chipped in. Pip insisted on adding a "brave part".']
  ]);
  addItem('heartlight'); f.festival = true; Audio_.sfx('chest');
  await narrate('Received the Heartlight! (Accessory: all +20, revives once per battle, prevents all ailments)');
  await narrate('— Hearts of the Lamplighters · Complete —');
}

// ---------- quest log ----------
function heartsQuests() {
  const f = G.flags, q = [];
  if (f.q_road) q.push({ title: 'The Lamplighter\'s Road', giver: 'Elder Maren, Brightwater', done: !!f.road_done, reward: 'Sunbearer, Limit: First Light', desc: f.road_done ? 'Twelve small lights burn on the four roads again.' : lampsLit() >= ROAD_LAMPS.length ? 'Every lamp is lit. Tell Elder Maren.' : `Relight the twelve roadside lamps marked on your world map. (${lampsLit()}/${ROAD_LAMPS.length})` });
  if (f.q_grimoire) q.push({ title: 'Mother\'s Grimoire', giver: 'Mira, Brightwater', done: !!f.grimoire_done, reward: 'Hearthstaff, Limit: Phoenix Rite', desc: f.grimoire_done ? 'Lyra carries her mother\'s staff.' : `Answer the riddle braziers in the Ember Caves (north of the Brightwater road) and face the Hearth Warden. Lyra must be in the party. (${['riddle_0', 'riddle_1'].filter(k => f[k]).length}/2 braziers)` });
  if (f.q_grotto) q.push({ title: 'The Drowned Priesthood', giver: 'Sister Wenna, Port Halden', done: !!f.grotto_done, reward: 'Abbot\'s Bell, Limit: High Tide', desc: f.grotto_done ? 'Abbot Tessaly rests, and his bell rings for Oswin.' : 'Find Abbot Tessaly in the Sea Mother\'s Grotto, on the coast east of Port Halden. Oswin must be in the party.' });
  if (f.q_debt) q.push({ title: 'Old Debts', giver: 'Guard, Ironhold jail', done: !!f.debt_done, reward: 'Pickpocket\'s Prize, Limit: Grand Larceny', desc: f.debt_done ? 'The marker is paid, and the Guild\'s children are free.' : 'Take the trapdoor in the Ironhold jail down to the Undercity and settle with Guildmaster Vane. Kestrel must be in the party.' });
  if (f.q_echo) q.push({ title: 'Echo of Vesper', giver: 'Mira, Brightwater', done: !!f.echo_done, reward: 'Duskstar, Limit: Long Night', desc: f.echo_done ? 'Selene sleeps through the night now.' : 'Rest at any inn with Selene in the party, and face the echo in her dream. She fights alone.' });
  if (HEROES_DONE() === 5) q.push({ title: 'The Festival of Lanterns', giver: 'Elder Maren, Brightwater', done: !!f.festival, reward: 'Heartlight', desc: f.festival ? 'Brightwater lit a lantern for every house.' : 'All five hearts are mended. Visit Elder Maren in Brightwater.' });
  return q;
}
