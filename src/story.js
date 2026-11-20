'use strict';
// ============================================================
//  STORY — NPCs, doors, cutscenes, bosses, title, ending
// ============================================================
const A = 'Arin', LY = 'Lyra', OS = 'Oswin', KE = 'Kestrel';
const LOOKS = {
  elder: { skin: '#e8c0a0', hair: '#e8e0d0', style: 'bun', body: '#6a4a8a', accent: '#e8c24a', robe: true },
  mother: { skin: '#f1c9a0', hair: '#7a3e1d', style: 'long', body: '#a0503a', accent: '#fff', robe: true },
  guard: { skin: '#e2b48c', hair: '#3a2a1a', style: 'short', body: '#5a6a8a', accent: '#c0c0c0', hat: 'helm' },
  oswin: HEROES.oswin.look, kestrel: HEROES.kestrel.look,
  sailor: { skin: '#c98e62', hair: '#1f1b2e', style: 'short', body: '#2a5a9a', accent: '#fff', hat: 'cap' },
  captain: { skin: '#e2b48c', hair: '#5a3a1a', style: 'short', body: '#7a3a3a', accent: '#e8c24a', hat: 'helm', beard: true },
  dwarf: { skin: '#e8b090', hair: '#c06a2a', style: 'bald', body: '#5a4a3a', accent: '#c0a040', beard: true },
  selene: { skin: '#f6d6b8', hair: '#a03a2a', style: 'long', body: '#3a2a5a', accent: '#c04aa8', robe: true }
};
function N(x, y, seed, o, talk, extra = {}) { return { x, y, look: o.skin ? o : npcLook(seed, o), talk, ...extra }; }

function townNpcs(id) {
  const f = G.flags;
  if (id === 'brightwater') return [
    N(5, 8, 1, LOOKS.elder, talkElder, { mark: !f.q1 || (f.lantern1 && !f.bridge), name: 'Elder Maren' }),
    N(12, 8, 2, LOOKS.mother, talkMother),
    N(8, 11, 3, { style: 'spiky', body: '#c08a3a' }, talkPip, { wander: true }),
    N(13, 16, 4, LOOKS.guard, talkTobin),
    N(18, 8, 5, { body: '#3a7a4a', hat: 'cap', accent: '#a07a3a' }, talkHob, { wander: true }),
    N(15, 10, 6, { hair: '#a0a0a0', style: 'bald', beard: true, body: '#7a6a5a' }, talkBram),
    N(4, 16, 7, { style: 'bun', body: '#c05a7a' }, talkAda, { wander: true })
  ];
  if (id === 'halden') {
    const l = [
      N(20, 10, 11, LOOKS.sailor, talkBrann, { mark: f.lantern2 && !f.ship, name: 'Brann' }),
      N(17, 18, 12, { style: 'bun', body: '#3a8a8a' }, talkNell, { wander: true }),
      N(6, 10, 13, LOOKS.sailor, talkSailor, { wander: true }),
      N(12, 17, 14, { style: 'spiky', body: '#c05a3a' }, talkKid, { wander: true }),
      N(4, 7, 15, { style: 'long', body: '#8a6a3a' }, talkMerchant),
      N(19, 7, 16, { hair: '#e8e0d0', style: 'bald', body: '#5a5a7a' }, talkOldSailor)
    ];
    if (!f.oswin) l.push(N(15, 7, 17, LOOKS.oswin, joinOswin, { mark: f.bridge, name: 'Oswin' }));
    return l;
  }
  if (id === 'ironhold') {
    const l = [
      N(5, 9, 21, LOOKS.captain, talkDunmar, { mark: f.metKestrel && !f.kestrel, name: 'Captain Dunmar' }),
      N(20, 7, 22, LOOKS.guard, talkJailGuard),
      N(9, 9, 23, LOOKS.dwarf, talkOrrin),
      N(15, 14, 24, { ...LOOKS.dwarf, hair: '#e8c060', style: 'bun', beard: false, body: '#7a3a2a' }, talkHilda),
      N(6, 17, 25, { body: '#5a5a5a', hat: 'helm' }, talkMiner, { wander: true }),
      N(20, 17, 26, { style: 'spiky', body: '#3a5a8a' }, talkIronKid, { wander: true })
    ];
    if (f.lantern3) l.push(N(13, 9, 27, LOOKS.selene, talkSelene, { name: 'Selene' }));
    return l;
  }
  return [];
}

// ------------- Brightwater -------------
async function talkElder() {
  const f = G.flags;
  if (!f.q1) {
    await sayAll([
      ['Elder Maren', 'Arin. Good. Your father tended the Ember Lantern for thirty years, and his father before him.'],
      ['Elder Maren', 'Tonight, for the first time in a thousand years, it went out. Already the wood is crawling with things that should stay buried.'],
      ['Elder Maren', 'Go to Whisperwood Hollow, northwest of the village. Find the Lantern and kindle it again — with a lamplighter\'s flame. Your flame.'],
      [LY, 'Leave the monsters to me. I\'ve been practicing!'],
      ['Elder Maren', 'That is exactly what worries me. Here — take these, and come back to me alive.']
    ]);
    addItem('potion', 4); addItem('antidote', 2); G.gold += 60; Audio_.sfx('item');
    await narrate('Received 4 Potions, 2 Antidotes and 60 gold.');
    f.q1 = true;
    await say('Elder Maren', 'The road north of the village leads into the wood. And Arin — the inn is free for heroes. Well. Cheap.');
    return;
  }
  if (!f.lantern1) { await say('Elder Maren', 'Whisperwood Hollow lies northwest, where the trees grow thick. Follow the road from the village. Be careful.'); return; }
  if (!f.bridge) {
    await sayAll([
      ['Elder Maren', 'The sky over the wood is clear again! I knew it. I knew you had your father\'s hands.'],
      [A, 'There was someone there, Elder. A woman in black. She said three flames remain... and that the Night is patient.'],
      ['Elder Maren', '...Then the Ember Lantern was only the first. She will go for the Tide Lantern next — in the Sunken Shrine, south of Port Halden.'],
      ['Elder Maren', 'The villagers worked all night to patch the old river bridge east of here. Cross it, and find Port Halden on the coast.'],
      ['Elder Maren', 'There is a priest there named Oswin. He has written to me of dreams — lanterns going dark one by one. Trust him.'],
      ['Elder Maren', 'And take this. It is not much, but the road is long.']
    ]);
    G.gold += 300; Audio_.sfx('item');
    await narrate('Received 300 gold. The river bridge to the east has been repaired!');
    f.bridge = true; applyWorldFlags(getMap('world'));
    return;
  }
  if (!f.lantern2) { await say('Elder Maren', 'Port Halden lies east, across the river bridge. Find Oswin.'); return; }
  if (!f.lantern3) { await say('Elder Maren', 'Two Lanterns burn again. I can feel it in the soil — the earth is less afraid. Ironhold and the Stone Lantern lie north, across the sea.'); return; }
  if (!f.ending) { await say('Elder Maren', 'Selene... alive. Bring her home, Arin. Bring them all home.'); return; }
  await say('Elder Maren', 'Four Lanterns, burning. I never thought I would live to see a dawn like this one.');
}
async function talkMother() {
  const f = G.flags;
  if (!f.lantern1) await say('Mira', 'Arin, you look after Lyra out there. ...And let her look after you. You never ask for help, just like your father.');
  else if (!f.lantern3) await say('Mira', 'The whole village is talking about you two! Come home safe, both of you. I\'ll keep the hearth warm.');
  else await say('Mira', 'Your father would be so proud. I\'m proud. Now go finish it, and then come home and EAT something.');
}
async function talkPip() {
  const f = G.flags;
  if (!f.lantern1) await say('Pip', 'Is it true the sky went black over Whisperwood?! That is SO cool. ...And scary. Mostly cool.');
  else await say('Pip', 'When I grow up I\'m gonna be a lamplighter too! I already have a candle. It\'s very small.');
}
async function talkTobin() {
  await say('Tobin', G.flags.lantern1 ? 'Roads are a little quieter now. Still — east of the river the beasts are bigger. Buy better gear in Port Halden.' : 'Monsters on the roads since the Lantern went out. West of the river it\'s mostly slimes, bats and goblins. If you get hurt, rest at the inn, or at home.');
}
async function talkHob() { await say('Hob', G.flags.lantern1 ? 'The cows are giving milk again! Bless you, lamplighter.' : 'My cows won\'t give milk. They stand in the barn staring at the dark. Can\'t say I blame them.'); }
async function talkAda() { await say('Ada', 'Tip from an old traveler: press Escape or X for your menu. And hold Shift to hurry along.'); }
async function talkBram() {
  await sayAll([
    ['Old Bram', 'Ember in the wood, Tide beneath the sea, Stone in the mountain\'s heart... and Dawn above them all.'],
    ['Old Bram', 'That\'s the old rhyme. Four Lanterns, lit by the first kings to chain the Hollow Night beneath the world. Nobody remembers where Dawn burns anymore.']
  ]);
}
// ------------- Port Halden -------------
async function joinOswin() {
  const f = G.flags;
  if (f.oswin) return;
  if (!f.lantern1) { await say('Priest', 'Hm? Not yet, not yet. You are early, and the dream is not finished. Come back when the wood is lit.'); return; }
  await sayAll([
    ['Priest', 'Ah. A young man with a lamplighter\'s hands, and a young woman who smells faintly of singed eyebrows. You\'re right on time.'],
    [LY, '...Excuse me?'],
    ['Priest', 'I dreamed of you three nights running. Two small lights walking east, while the sky went dark behind them.'],
    [OS, 'I am Oswin, priest of the Sea Mother. And I will be coming with you.'],
    [A, 'Just like that?'],
    [OS, 'At my age, "just like that" is the only speed I have left. The Tide Lantern lies in the Sunken Shrine, south of the harbor.'],
    [OS, 'Its door answers only to a tide priest. Lucky you.']
  ]);
  addMember('oswin'); f.oswin = true; Audio_.sfx('levelup');
  await narrate('Oswin joined the party!');
  refreshEntities();
}
async function talkBrann() {
  const f = G.flags;
  if (!f.lantern2) { await say('Brann', 'The sea\'s gone mad since the Tide Lantern dimmed. Waves like walls. No ship leaves this harbor, not even my Dawnrunner.'); return; }
  if (!f.ship) {
    await sayAll([
      ['Brann', 'The sea\'s calm! First time in weeks. That was your doing, wasn\'t it? Don\'t be modest, the whole harbor saw the light.'],
      ['Brann', 'Listen. The Dawnrunner\'s been sitting idle at the east jetty. She\'s a quick little ship — take her. Better you than the barnacles.']
    ]);
    f.ship = true; applyWorldFlags(getMap('world')); Audio_.sfx('chest');
    await narrate('You received the ship Dawnrunner! It is moored just east of Port Halden. Walk onto it to set sail; walk onto land to go ashore.');
    await say(OS, 'North across the sea lies Ironhold, the dwarf-forged city. The Stone Lantern burns in the mines beneath it.');
    return;
  }
  await say('Brann', 'Treat her kindly. She leans a bit to port when she\'s sulking.');
}
async function talkNell() { await say('Nell', G.flags.lantern2 ? 'Fish are back! Big ones, too.' : 'The Sunken Shrine is south of town, down the coast road. Old as the sea itself. My gran said only tide priests could open it.'); }
async function talkSailor() { await say('Sailor', 'Ironhold lies north across the sea. Dwarves and stubborn men, and a mountain full of fire beneath them.'); }
async function talkKid() { await say('Tess', 'I saw a woman in a black hood on the cliffs last night! She looked SO sad. Then she just... wasn\'t there.'); }
async function talkMerchant() { await say('Merchant', 'Ember Bombs! Lovely for crowds of monsters. Weapons and armor next door. I recommend both. I recommend everything.'); }
async function talkOldSailor() {
  await say('Old Sailor', G.flags.lantern3 ? 'East, past the edge of the charts, there\'s an island where the sun never rises. Isle of Dusk, we called it. Never landed. Never wanted to.' : 'When I was young we sailed everywhere. Now? The sea\'s angry, and so am I.');
}
// ------------- Ironhold -------------
async function talkDunmar() {
  const f = G.flags;
  if (f.kestrel) { await say('Captain Dunmar', f.lantern3 ? 'The screaming in the deep shafts has stopped. Ironhold owes you, lamplighters.' : 'Keep an eye on that thief. And on your purses.'); return; }
  if (!f.metKestrel) {
    await sayAll([
      ['Captain Dunmar', 'Emberdeep is sealed. By order of the Thane, nobody goes in. Not since the Stone Lantern dimmed and the deep shafts started screaming.'],
      ['Captain Dunmar', 'The only way in would be one the dwarves never sealed. And the only folk who\'d know of one are sitting in my jail.']
    ]);
    return;
  }
  await sayAll([
    ['Captain Dunmar', 'You want me to release the slipperiest thief in the Undercity... into your custody... so she can lead you into a sealed mine full of monsters.'],
    [OS, 'When you put it like that, it does sound wonderful.'],
    ['Captain Dunmar', '...My men won\'t go near those shafts. Fine. Take her. If she runs, she\'s YOUR problem.']
  ]);
  await fadeTo(1, 300); await wait(400);
  addMember('kestrel'); f.kestrel = true;
  await fadeTo(0, 300);
  await sayAll([
    [KE, 'Pleasure doing business. Don\'t look so surprised, Captain — I was going to break out tomorrow anyway.'],
    [KE, 'The old tunnel opens north of town, past the snow, in a ring of mountains. Try to keep up.']
  ]);
  Audio_.sfx('levelup');
  await narrate('Kestrel joined the party!');
  refreshEntities();
}
async function talkJailGuard() { await say('Guard', G.flags.kestrel ? 'The cell\'s empty and it\'s very peaceful. I hate it.' : 'Careful with the prisoner. She\'s already stolen my lunch. Twice. Through the bars.'); }
async function talkOrrin() {
  await sayAll([
    ['Orrin', 'My grandfather\'s grandfather carried the Stone Lantern down into Emberdeep. We built the city on top of it, so it would keep us warm forever.'],
    ['Orrin', G.flags.lantern3 ? 'And now it does again. Thank you, children.' : '"Forever." Ha. Now the halls are dark and something walks in them wearing our dead.']
  ]);
}
async function talkHilda() { await say('Hilda', 'Steel from the forges of Ironhold! Finest blades north of the sea. Step inside the smithy if you want to buy.'); }
async function talkMiner() { await say('Miner', 'The Revenants down there... they wear dwarf armor. Holy light sends them back to rest, they say.'); }
async function talkIronKid() { await say('Brick', 'Snow imps throw ice at you. Fire makes them cry. Real fire, not mean words.'); }
async function talkSelene() {
  const f = G.flags;
  if (!f.ending) {
    await sayAll([
      ['Selene', 'They gave me a room. A warm room. I keep waiting for someone to tell me I don\'t deserve it.'],
      [LY, 'Nobody\'s going to tell you that. I won\'t let them.'],
      ['Selene', 'The Isle of Dusk lies east, across the sea. Use the Dawn Key on the Spire\'s door. And Lyra... I will be with you. I promise.']
    ]);
  }
}
// ------------- doors -------------
async function doorEvent(townId, b) {
  Audio_.sfx('door');
  if (b.kind === 'inn') return innStay(townId, b.price);
  if (b.shop) return openShop(b.shop, b.sign === 'arms' ? (townId === 'ironhold' ? 'Hilda the Smith' : 'Armorer') : 'Shopkeeper');
  if (townId === 'brightwater' && b.id === 'arinhouse') {
    const c = await choose(null, 'Your home. The hearth is still warm. Rest a while?', ['Rest', 'Leave'], 1);
    if (c === 0) {
      await fadeTo(1, 500); Audio_.sfx('inn'); healAll(); G.lastInn = { town: 'brightwater' }; await wait(1200); await fadeTo(0, 500);
      await narrate('You slept in your own bed. HP and MP restored.');
    }
    return;
  }
  if (townId === 'brightwater' && b.id === 'hall') { await narrate('Elder Maren\'s hall. The elder is out in the square, by the gate to the hall.'); return; }
  if (townId === 'halden' && b.id === 'chapel') {
    if (!G.flags.oswin) { await joinOswin(); return; }
    await say('Sister Wenna', 'May the tide carry your burdens. Rest a moment in the Sea Mother\'s house.');
    Audio_.sfx('heal'); for (const m of G.party) { if (!alive(m)) m.hp = 1; m.status = {}; }
    await narrate('Fallen allies were revived.');
    return;
  }
  if (townId === 'halden' && b.id === 'harbor') return talkBrann();
  if (townId === 'ironhold' && b.id === 'jail') {
    if (G.flags.kestrel) { await narrate('An empty cell. Someone has scratched "K WUZ HERE" into the wall.'); return; }
    if (G.flags.metKestrel) { await say('Kestrel', 'Still here. Still bored. Captain Dunmar, remember? Bring the priest. Captains love priests.'); return; }
    await sayAll([
      ['Prisoner', 'Visitors! You don\'t look like guards. You look like... adventurers. Ugh.'],
      [KE, 'Name\'s Kestrel. They caught me with a map of Emberdeep. The real one — with the smugglers\' tunnel the dwarves never sealed.'],
      [KE, 'You want into those mines? Get me out of here, and I\'ll get you in. Talk to Captain Dunmar. Bring the priest. Captains love priests.']
    ]);
    G.flags.metKestrel = true; refreshEntities();
    return;
  }
  if (townId === 'ironhold' && b.id === 'barracks') return talkDunmar();
  await narrate(pick(['Nobody answers. You hear someone humming inside.', 'The door is locked. It smells of fresh bread.', 'A dog barks at you from behind the door.']));
}
async function onEnterTown(id) {
  const f = G.flags;
  if (id === 'halden' && !f.seenHalden) { f.seenHalden = true; await say(LY, 'Port Halden! Smell that salt air. Elder Maren said to look for a priest named Oswin — he must be near the chapel.'); }
  if (id === 'ironhold' && !f.seenIron) { f.seenIron = true; await say(OS, 'Ironhold. Mind your manners — dwarves remember every insult for three generations.'); }
}

// ------------- world flags -------------
function applyWorldFlags(m) {
  if (!m || m.kind !== 'world') return;
  if (G.flags.bridge) { const rx = riverX(BRIDGE_Y); m.set(rx, BRIDGE_Y, 'b'); m.set(rx + 1, BRIDGE_Y, 'b'); }
  if (G.flags.ship && !G.ship) G.ship = { x: SHIP_HOME.x, y: SHIP_HOME.y, dir: 'right' };
}

// ------------- dungeons -------------
async function canEnterDungeon(did) {
  const f = G.flags;
  if (did === 'hollow' && !f.q1) { await say(LY, 'Wait — shouldn\'t we talk to Elder Maren first? She\'ll want to know we\'re going in.'); return false; }
  if (did === 'shrine') {
    if (!f.oswin) { await narrate('A shimmering curtain of seawater seals the entrance. It pushes you back gently, like a tide.'); await say(LY, 'It\'s like the sea itself is holding the door shut. Maybe that priest in Port Halden knows something.'); return false; }
    if (!f.shrineOpen) {
      await say(OS, 'Sea Mother, it is your old servant. Let us pass, and I promise to stop complaining about my knees.');
      Audio_.sfx('water');
      await narrate('The curtain of water parts with a sigh.');
      f.shrineOpen = true;
    }
  }
  if (did === 'mine') {
    if (!f.kestrel) { await narrate('Great iron gates seal the mountain. A plaque reads: "SEALED BY ORDER OF THE THANE OF IRONHOLD."'); return false; }
    if (!f.mineOpen) { await say(KE, 'Not the front door, genius. This way — behind the boulder. Mind the bats.'); f.mineOpen = true; }
  }
  if (did === 'spire') {
    if (!f.dawnkey) { await narrate('A door of black glass, with no handle. Only a keyhole shaped like a rising sun.'); return false; }
    if (!f.spireOpen) {
      Audio_.sfx('lantern');
      await narrate('The Dawn Key turns. The black glass door sighs open, and the dark inside breathes out.');
      await say(KE, 'Well. That\'s not ominous at all.');
      f.spireOpen = true;
    }
  }
  return true;
}
async function onEnterDungeon(did) {
  const f = G.flags, k = 'seen_' + did;
  if (f[k]) return;
  f[k] = true;
  if (did === 'hollow') await sayAll([[LY, 'It\'s so dark... the trees have grown right down into the earth.'], [A, 'Stay close. The Lantern should be at the deepest point of the Hollow.']]);
  if (did === 'shrine') await say(OS, 'Built by my order a thousand years ago, when the sea was young and priests were taller. Watch the pools.');
  if (did === 'mine') await say(KE, 'Emberdeep. Three levels down to the Stone Lantern. Whatever you hear down here — don\'t answer it.');
  if (did === 'spire') await sayAll([[LY, 'I can feel him. Like cold water poured down my spine.'], [OS, 'Then we are close. Courage, children. Light is only ever a small thing, until it isn\'t.']]);
}
async function examineLantern(e) {
  const names = { hollow: 'Ember', shrine: 'Tide', mine: 'Stone', spire: 'Dawn' };
  if (e.lit) await narrate(`The ${names[e.did]} Lantern burns warm and steady. You feel safe here.`);
  else await narrate(`The ${names[e.did]} Lantern is cold and dark.`);
}
async function relightLantern(did) {
  const m = Field.map;
  const e = m.entities.find(x => x.kind === 'lantern');
  await wait(300);
  await narrate('Arin raises his hand to the cold Lantern. A small flame sparks in his palm — the lamplighter\'s flame.');
  Audio_.sfx('lantern');
  if (e) e.lit = true;
  await fadeTo(0.85, 300, '#fff4c0');
  await fadeTo(0, 700, '#fff4c0');
  G.flags['lantern_' + did] = true;
}
async function bossEncounter(did) {
  const f = G.flags;
  if (f['boss_' + did]) return;
  if (did === 'hollow') {
    await sayAll([
      [LY, 'There! The Ember Lantern — it\'s smothered in spores!'],
      [A, 'Something\'s moving under there...'],
      ['???', 'GRRRRRRMMMMMMMMMM...']
    ]);
    const r = await startBattle(['gloomcap'], { boss: true, bg: 'cave' });
    if (r === 'lose') return gameOver();
    f.boss_hollow = true; refreshEntities();
    await relightLantern('hollow');
    f.lantern1 = true;
    await say(LY, 'We did it! It\'s burning again! Arin, look at it!');
    await fadeTo(0.6, 400);
    await sayAll([
      ['Hooded Woman', 'So. The little lamplighter still remembers his trade.'],
      [A, 'Who\'s there?!'],
      ['Hooded Woman', 'It doesn\'t matter. Three flames remain, and the Night is patient. It has waited a thousand years. It can wait a little longer.']
    ]);
    Audio_.sfx('dark');
    await fadeTo(0, 400);
    await sayAll([[LY, '...She\'s gone. Arin, that voice. I... no. Never mind.'], [A, 'We should tell Elder Maren.']]);
    return;
  }
  if (did === 'shrine') {
    await sayAll([
      ['Drowned Warden', 'WHO... DISTURBS... THE TIDE...'],
      [OS, 'Poor old guardian. Its mind is drowned in someone else\'s shadow. We\'ll have to put it to rest.']
    ]);
    const r = await startBattle(['warden'], { boss: true, bg: 'shrine' });
    if (r === 'lose') return gameOver();
    f.boss_shrine = true; refreshEntities();
    await relightLantern('shrine');
    f.lantern2 = true;
    await fadeTo(0.6, 400);
    await sayAll([
      ['Hooded Woman', 'A priest now, too. You collect strays, lamplighter.'],
      [LY, 'Who ARE you? Why are you doing this?!'],
      ['Hooded Woman', '...Little Lyra. You\'ve grown so tall.']
    ]);
    Audio_.sfx('dark');
    await fadeTo(0, 400);
    await sayAll([
      [LY, '...No. No, that\'s... that was Selene.'],
      [A, 'Your sister? Lyra, Selene disappeared seven years ago. The night your mother died.'],
      [LY, 'I KNOW, Arin. I know that voice. I\'d know it anywhere.'],
      [OS, 'Then we will find her, and ask her ourselves. Gently, if we can. The harbor should be calm now — let us see if Port Halden has a ship.']
    ]);
    return;
  }
  if (did === 'mine') {
    await sayAll([
      ['Hooded Woman', 'You keep coming. Like moths.'],
      [LY, 'Selene. It\'s me. It\'s Lyra. Please... come home.'],
      ['Vesper', 'Selene is gone. I am Vesper, herald of the Hollow King.'],
      ['Vesper', 'He found me in the dark, the night Mother died. He was so kind. He promised me he could bring her back. All I have to do is let the Night in.'],
      [OS, 'Child, the Hollow King promises what he has already eaten.'],
      ['Vesper', 'Be QUIET!'],
      [KE, 'Right. Talking\'s over. Lyra — I\'m sorry.'],
      [LY, '...Don\'t hurt her more than you have to.']
    ]);
    const r = await startBattle(['vesper'], { boss: true, bg: 'mine' });
    if (r === 'lose') return gameOver();
    f.boss_mine = true; refreshEntities();
    await fadeTo(0.7, 500, '#fff');
    await fadeTo(0, 700, '#fff');
    await sayAll([
      ['', 'Vesper falls to her knees. Something dark peels away from her like smoke, and is gone.'],
      ['Selene', '...Lyra? Your hair... you cut it.'],
      [LY, 'Seven years, Selene! Seven years, and THAT\'S what you have to say?!'],
      ['Selene', 'I\'m sorry. I\'m so sorry. I could hear myself the whole time, like shouting through deep water.'],
      ['Selene', 'Listen to me. The Lanterns are his chains. With three dimmed, he is almost free. The last — the Dawn Lantern — burns at the top of the Hollow Spire, on the Isle of Dusk, east across the sea.'],
      ['Selene', 'It is his prison. And it will be his throne, if it goes out. Take this.']
    ]);
    addItem('elixir', 2); f.dawnkey = true; Audio_.sfx('chest');
    await narrate('Received the Dawn Key! (and 2 Elixirs)');
    await say('Selene', 'He gave it to me so I could open his door from outside. Use it to close the door on him forever.');
    await relightLantern('mine');
    f.lantern3 = true;
    await sayAll([
      ['Selene', 'I\'ll go up to Ironhold and rest... if they\'ll have me. Lyra — come back. Promise me.'],
      [LY, 'I promise. And you\'d better be there when I do.'],
      [A, 'The Isle of Dusk. East across the sea. Let\'s end this.']
    ]);
    return;
  }
  if (did === 'spire') {
    Audio_.stopMusic();
    await sayAll([
      ['The Hollow King', 'Lamplighters. How I have waited for you.'],
      ['The Hollow King', 'A thousand years in a cage of light. Do you know what that is? No. You burn for one brief lifetime and gutter out.'],
      ['The Hollow King', 'I am patient. I am the dark between your candles. I was here before the first flame, and I will be here after the last.'],
      [A, 'Then we\'ll just have to keep lighting candles.'],
      ['The Hollow King', 'Brave little flame. Come. Let me show you how small you are.']
    ]);
    const r = await startBattle(['king'], { boss: true, bg: 'throne', music: 'final', keepScene: true, noVictory: true });
    if (r === 'lose') { G.scene = Field; return gameOver(); }
    Audio_.stopMusic();
    await sayAll([
      ['The Hollow King', 'ENOUGH.'],
      ['The Hollow King', 'You think you have won? You have only cracked the shell.'],
      ['', 'The King\'s body splits like black glass, and something vast pours out — all eyes and hunger, wearing the broken pieces of a crown.']
    ]);
    await fadeTo(0.8, 600, '#ffe8b0');
    await sayAll([
      ['Selene', 'Lyra! Everyone! Take the light — all of it!'],
      ['', 'From far away, the glow of three Lanterns pours up through the Spire. Ember, Tide, Stone. The party is fully restored!']
    ]);
    healAll(); Audio_.sfx('lantern');
    await fadeTo(0, 600, '#ffe8b0');
    G.scene = Field;
    const r2 = await startBattle(['king2'], { boss: true, bg: 'throne', music: 'final', keepScene: true });
    if (r2 === 'lose') { G.scene = Field; return gameOver(); }
    f.boss_spire = true;
    G.scene = Field; refreshEntities();
    Field.playMusic();
    await relightLantern('spire');
    f.lantern4 = true;
    await runEnding();
  }
}

// ------------- title -------------
const TitleScene = {
  t: 0, ready: false,
  tick(dt) { this.t += dt; }, update() { },
  draw(g) {
    drawTitleArt(g, this.t);
    const a = clamp(this.t / 2, 0, 1);
    g.save(); g.globalAlpha = a;
    g.font = font(64, true, SERIF);
    const gr = g.createLinearGradient(0, 70, 0, 140); gr.addColorStop(0, '#fff4c8'); gr.addColorStop(1, '#e8a84a');
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText('LANTERNFALL', W / 2 + 3, 83);
    g.fillStyle = gr; g.fillText('LANTERNFALL', W / 2, 80);
    text(g, 'A Tale of the Four Flames', W / 2, 152, { size: 18, fam: SERIF, align: 'center', color: '#e8dcc8' });
    g.restore();
    text(g, 'Arrows/WASD move · Enter/Z confirm · Esc/X menu & back · M sound', W / 2, H - 22, { size: 12, align: 'center', color: 'rgba(220,220,255,.6)' });
  }
};
async function titleMenu() {
  G.scene = TitleScene; TitleScene.t = 0;
  Audio_.play('title');
  await fadeTo(0, 600);
  while (true) {
    const items = [{ label: 'New Game' }, { label: 'Continue', disabled: !hasSave() }, { label: Audio_.muted ? 'Sound: Off' : 'Sound: On' }];
    const k = await listMenu({ x: W / 2 - 90, y: 196, w: 180, rows: 3, items, cancel: false, index: hasSave() ? 1 : 0 });
    if (k === 0) { await newGame(); return; }
    if (k === 1) {
      if (loadGame()) {
        await fadeTo(1, 500);
        G.maps = {};
        Field.enter(G.mapId, G.x, G.y, G.dir);
        await fadeTo(0, 500);
        return;
      }
    }
    if (k === 2) Audio_.toggleMute();
  }
}
const BlackScene = { lines: [], t: 0, tick(dt) { this.t += dt; }, update() { }, draw(g) { g.fillStyle = '#05040c'; g.fillRect(0, 0, W, H); this.lines.forEach((l, i) => { g.save(); g.globalAlpha = clamp((this.t - l.at) / 1.2, 0, 1); text(g, l.s, W / 2, 130 + i * 44, { size: 20, fam: SERIF, align: 'center', color: '#e8dcc8' }); g.restore(); }); } };
async function newGame() {
  await fadeTo(1, 700);
  Object.keys(G.flags).forEach(k => delete G.flags[k]);
  G.party = [makeMember('arin', 1), makeMember('lyra', 1)];
  G.inv = { potion: 2 }; G.gold = 80; G.playTime = 0; G.maps = {}; G.ship = null; G.onShip = false; G.lastInn = { town: 'brightwater' };
  G.scene = BlackScene; BlackScene.lines = []; BlackScene.t = 0;
  await fadeTo(0, 400);
  const story = ['Long ago, the Hollow Night swallowed the world.', 'Four Lanterns were lit to chain it beneath the earth —', 'Ember, Tide, Stone, and Dawn.', 'For a thousand years, their flames held.', '...Until tonight.'];
  for (const s of story) { BlackScene.lines.push({ s, at: BlackScene.t }); await wait(2300); }
  await wait(800);
  await fadeTo(1, 900);
  Field.enter('brightwater', 11, 11, 'up');
  Audio_.play('town', true);
  await fadeTo(0, 900);
  await sayAll([
    [LY, 'Arin! Arin — did you see the sky over Whisperwood?! It went black. Not night-black. Hollow-black.'],
    [A, '...The Ember Lantern.'],
    [LY, 'Elder Maren\'s calling for you. "Lamplighter\'s duty," she says. She\'s waiting by her hall, on the west side of the square.'],
    [LY, 'And before you say anything — I\'m coming with you. Selene always said the Lanterns sing at night. If one\'s gone quiet... I want to know why.']
  ]);
  await narrate('Lyra joins you. Talk to people with Enter. Open the menu with Esc.');
  refreshEntities();
}

// ------------- ending -------------
const EndingScene = {
  t: 0, lines: [], done: false,
  tick(dt) { this.t += dt; }, update() { },
  draw(g) {
    const k = clamp(this.t / 20, 0, 1);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgb(${lerp(20, 120, k) | 0},${lerp(10, 160, k) | 0},${lerp(50, 230, k) | 0})`);
    gr.addColorStop(0.7, `rgb(${lerp(80, 255, k) | 0},${lerp(30, 190, k) | 0},${lerp(80, 140, k) | 0})`);
    gr.addColorStop(1, '#2a1830');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sy = lerp(420, 250, k);
    g.save(); g.globalAlpha = 0.4; circle(g, W / 2, sy, 120, '#ffe8a0'); g.restore();
    circle(g, W / 2, sy, 50, '#fff4d0');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + this.t * 0.05; line(g, W / 2 + Math.cos(a) * 60, sy + Math.sin(a) * 60, W / 2 + Math.cos(a) * 140, sy + Math.sin(a) * 140, 'rgba(255,240,200,.25)', 4); }
    g.fillStyle = '#1a1028'; g.fillRect(0, 330, W, H - 330);
    for (let r = 0; r < 6; r++) { g.strokeStyle = `rgba(255,220,160,${0.15 + 0.05 * Math.sin(this.t + r)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 40 - r * 20, 340 + r * 12); g.lineTo(W / 2 + 40 + r * 20, 340 + r * 12); g.stroke(); }
    // party silhouettes on a cliff
    g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(160, 330, 300, 350); g.lineTo(300, H); g.lineTo(0, H); g.fillStyle = '#0c0814'; g.fill();
    const ids = ['arin', 'lyra', 'oswin', 'kestrel'];
    ids.forEach((id, i) => drawChar(g, HEROES[id].look, 90 + i * 44, 348 - (i === 1 ? 2 : 0), 'up', 0, 1.4));
    drawChar(g, LOOKS.selene, 270, 352, 'up', 0, 1.4);
    this.lines.forEach((l, i) => {
      g.save(); g.globalAlpha = clamp((this.t - l.at) / 1.5, 0, 1) * clamp((l.end - this.t) / 1.5, 0, 1);
      wrapText(g, l.s, 520, font(19, false, SERIF)).forEach((s, j) => text(g, s, W / 2, 40 + j * 28, { size: 19, fam: SERIF, align: 'center', color: '#fff8e8' }));
      g.restore();
    });
    if (this.done) {
      g.save(); g.globalAlpha = clamp((this.t - this.doneAt) / 2, 0, 1);
      text(g, 'THE END', W / 2, 110, { size: 54, bold: true, fam: SERIF, align: 'center', color: '#fff4c8' });
      text(g, 'Thank you for playing LANTERNFALL', W / 2, 180, { size: 18, fam: SERIF, align: 'center', color: '#fff8e8' });
      g.restore();
    }
  }
};
async function runEnding() {
  G.flags.ending = true;
  await fadeTo(1, 1500, '#fff');
  G.scene = EndingScene; EndingScene.t = 0; EndingScene.lines = []; EndingScene.done = false;
  Audio_.play('ending', true);
  await fadeTo(0, 2000, '#fff');
  const ep = [
    'The Dawn Lantern blazed atop the Spire, and for the first time in an age, the sun rose over the Isle of Dusk.',
    'Oswin returned to Port Halden. He still dreams — mostly of fish now, which he takes as a very good sign.',
    'Kestrel "misplaced" the map of Emberdeep. The Undercity of Ironhold has a new, suspiciously honest guardian.',
    'Selene came home to Brightwater. On quiet nights, she and Lyra sit beside the Ember Lantern and listen to it sing.',
    'And Arin, last of the lamplighters, walks the four roads every year to tend the flames —',
    'so the dark never forgets who keeps the light.'
  ];
  for (const s of ep) {
    const at = EndingScene.t;
    EndingScene.lines = [{ s, at, end: at + 6.5 }];
    await wait(7000);
  }
  EndingScene.lines = [];
  EndingScene.done = true; EndingScene.doneAt = EndingScene.t;
  await wait(3000);
  saveGame();
  await UI.push({ update() { if (Input.p('ok')) UI.close(this); }, draw(g) { if (Math.sin(performance.now() / 300) > 0) text(g, 'Press Enter', W / 2, H - 40, { size: 15, align: 'center', color: '#fff8e8' }); } });
  await fadeTo(1, 1500);
  runScript(titleMenu);
}

// ------------- main loop -------------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  Input.update(dt);
  if (Input.p('mute')) Audio_.toggleMute();
  updateTimers(dt); updateFade(dt);
  const uiBusy = UI.update(dt);
  if (!uiBusy && !Script.running && G.scene && G.scene.update) G.scene.update(dt);
  if (G.scene && G.scene.tick) G.scene.tick(dt);
  ctx.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (G.scene) G.scene.draw(ctx);
  UI.draw(ctx);
  drawToasts(ctx, dt);
  if (Fade.v > 0) { ctx.save(); ctx.globalAlpha = Fade.v; ctx.fillStyle = Fade.color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  requestAnimationFrame(frame);
}
Fade.v = 1;
G.scene = TitleScene;
requestAnimationFrame(frame);
runScript(titleMenu);
