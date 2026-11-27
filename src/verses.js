// =====================================================================
//  VERSES — 2.5: Old Bram's Lantern rhyme, found a verse at a time
// =====================================================================
// After a Lantern is relit, a scrap of the old song lies beside it on the dungeon's last floor.
// Bring each scrap to Old Bram in Brightwater and he sings it. With all seven he sings the whole
// rhyme, and it becomes the title-screen song (for every save on this device, like trophies).
// Saved in G.flags: verse_<id> (scrap found), sung_<id> (Bram sang it), rhyme_done.
const VERSES = [
  { id: 'ember', did: 'hollow', name: tl('Ember'), lines: [tl('Ember in the wood, where the old roots meet;'), tl('keep it small and keep it warm, and the dark will keep its feet.')] },
  { id: 'tide', did: 'shrine', name: tl('Tide'), lines: [tl('Tide beneath the sea, where the drowned bells ring;'), tl('every sunken lamp is listening for the songs the sailors sing.')] },
  { id: 'stone', did: 'mine', name: tl('Stone'), lines: [tl('Stone in the mountain\'s heart, under hammer, under hand;'), tl('what the mountain holds, it holds, and the mountain will not bend.')] },
  { id: 'dawn', did: 'spire', name: tl('Dawn'), lines: [tl('And Dawn above them all, at the top of the long stair;'), tl('light it once, and every morning after finds it there.')] },
  { id: 'sun', did: 'tomb', name: tl('Sun'), lines: [tl('Sun beneath the sand, in a king\'s cold hall;'), tl('gold remembers daylight when there\'s no day left at all.')] },
  { id: 'stars', did: 'observatory', name: tl('Stars'), lines: [tl('And one among the stars, that no king could keep;'), tl('it is lit by those who look up, and by those who cannot sleep.')] },
  { id: 'night', did: 'abyss', name: tl('Night'), lines: [tl('And Night, kept gently, sleeps at last;'), tl('so light the lamps, and lower your voice, and let the long dark pass.')] }
];
const RHYME_KEY = 'lanternfall_rhyme';
function rhymeUnlocked() { try { return localStorage.getItem(RHYME_KEY) === '1'; } catch (e) { return false; } }
function versesFound() { return VERSES.filter(v => G.flags['verse_' + v.id]).length; }

// the scrap beside a relit Lantern, on a dungeon's last floor
function verseEntity(map) {
  if (map.kind !== 'dungeon' || !map.extras.lantern) return null;
  const v = VERSES.find(v => v.did === map.dungeon);
  if (!v || !G.flags['lantern_' + map.dungeon] || G.flags['verse_' + v.id]) return null;
  const L = map.extras.lantern;
  for (const [dx, dy] of [[2, 1], [-2, 1], [2, 2], [-2, 2], [1, 2], [-1, 2], [3, 1], [-3, 1]]) {
    const x = L.x + dx, y = L.y + dy;
    if (map.at(x, y) === '.' && !map.entities.some(e => e.x === x && e.y === y)) return { kind: 'verse', x, y, verse: v.id };
  }
  return null;
}
async function pickVerse(e) {
  const v = VERSES.find(v => v.id === e.verse), f = G.flags;
  f['verse_' + v.id] = true; Audio_.sfx('chest');
  refreshEntities();
  await narrate(tl`A scrap of an old song, tucked beside the ${v.name} Lantern: the verse of ${v.name}!`);
  await narrate(`"${v.lines[0]}\n${v.lines[1]}"`);
  if (!f.q_verses) { f.q_verses = true; toast(tl('New quest: Old Bram\'s Verses')); }
  await narrate(tl`Old Bram in Brightwater would want to hear this. (${versesFound()} of ${VERSES.length} verses)`);
}
function drawVerse(g, sx, sy, t) {
  const b = Math.sin(t * 2) * 1.5;
  ellipse(g, sx, sy + 2, 9, 3, 'rgba(255,220,140,.25)');
  g.save(); g.translate(sx, sy - 6 + b); g.rotate(-0.15);
  rrect(g, -7, -5, 14, 10, 1, '#f0e2c0', OUT, 1);
  for (let i = 0; i < 3; i++) { g.fillStyle = '#9a8a6a'; g.fillRect(-5, -2 + i * 3, 10 - i * 2, 1); }
  g.restore();
  circle(g, sx + 6, sy - 12 + b, 1.5, `rgba(255,230,150,${0.5 + 0.5 * Math.sin(t * 4)})`);
}

// Bram, after his usual lines: sing what you've brought him, and the whole rhyme once it's complete
async function bramVerses() {
  const f = G.flags, BR = tl('Old Bram');
  if (!f.q_verses && f.lantern1) {
    f.q_verses = true; toast(tl('New quest: Old Bram\'s Verses'));
    await say(BR, tl('If you ever find the old song written down, near the Lanterns maybe, bring it to me. My grandmother said each Lantern kept its own verse.'));
  }
  const fresh = VERSES.filter(v => f['verse_' + v.id] && !f['sung_' + v.id]);
  for (const v of fresh) {
    await say(BR, tl`The verse of ${v.name}! Let me see... *ahem*`);
    Audio_.sfx('chest');
    await say(BR, `♪ ${v.lines[0]}\n♪ ${v.lines[1]}`);
    f['sung_' + v.id] = true;
  }
  if (fresh.length && versesFound() < VERSES.length) await say(BR, tl`That makes ${versesFound()} of ${VERSES.length}. Keep looking, lamplighter.`);
  if (versesFound() === VERSES.length && !f.rhyme_done) {
    f.rhyme_done = true;
    await say(BR, tl('That\'s all of them. Every verse. Sit down, all of you. I\'m going to sing the whole thing, start to finish, and nobody is allowed to talk.'));
    await fadeTo(0.6, 600);
    Audio_.play('rhyme');
    for (const v of VERSES) await narrate(`♪ ${v.lines[0]}\n♪ ${v.lines[1]}`);
    await fadeTo(0, 600);
    try { localStorage.setItem(RHYME_KEY, '1'); } catch (e) { }
    await say(BR, tl('My grandmother was right. She usually was. Now everyone will remember the tune.'));
    await narrate(tl('The Lantern Rhyme is now the title-screen song, and the music box knows it.'));
    Field.playMusic();
  }
}
function versesQuest() {
  const f = G.flags;
  if (!f.q_verses) return [];
  const n = versesFound(), sung = VERSES.filter(v => f['sung_' + v.id]).length;
  return [{ title: tl('Old Bram\'s Verses'), giver: tl('Old Bram, Brightwater'), done: !!f.rhyme_done, reward: tl('A new title-screen song'),
    desc: f.rhyme_done ? tl('Bram sang the whole Lantern rhyme. It plays on the title screen now.') : tl`Each relit Lantern keeps a verse of the old rhyme nearby. Find them and bring them to Old Bram. (${n}/${VERSES.length} found, ${sung} sung)` }];
}
