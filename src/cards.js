'use strict';
// ============================================================
//  LANTERNS & LIES (1.9): a card game played against people around the world.
//  Rules: a 3×3 board; each player brings 5 cards. Place a card on an empty
//  square: every touching enemy card with a lower value flips to you. Flames
//  give an edge: Ember beats Stone, Stone beats Tide, Tide beats Ember (+2 when
//  attacking). Once per game you may play a card veiled (the Lie): it shows "?",
//  captures nothing when played, and is revealed at the end, when it attacks
//  everything around it. Most squares at the end wins.
// ============================================================

const FLAMES = { ember: { name: 'Ember', col: '#ff8a3a', beats: 'stone' }, stone: { name: 'Stone', col: '#c8a070', beats: 'tide' }, tide: { name: 'Tide', col: '#5ad0f0', beats: 'ember' }, dawn: { name: 'Dawn', col: '#ffe08a', beats: null } };
// value, flame, and the monster (m) or hero (h) drawn on the card
const CARDS = {
  slime: { v: 1, f: 'tide', m: 'slime' }, bat: { v: 1, f: 'ember', m: 'bat' }, moonmoth: { v: 1, f: 'dawn', m: 'moonmoth' },
  goblin: { v: 2, f: 'stone', m: 'goblin' }, wolf: { v: 2, f: 'ember', m: 'wolf' }, wisp: { v: 2, f: 'dawn', m: 'wisp' }, blueslime: { v: 2, f: 'tide', m: 'blueslime' },
  harpy: { v: 3, f: 'dawn', m: 'harpy' }, sandcrab: { v: 3, f: 'stone', m: 'sandcrab' }, hobgoblin: { v: 3, f: 'stone', m: 'hobgoblin' }, firebat: { v: 3, f: 'ember', m: 'firebat' },
  frostwolf: { v: 4, f: 'tide', m: 'frostwolf' }, snowimp: { v: 4, f: 'tide', m: 'snowimp' }, scorpion: { v: 4, f: 'stone', m: 'scorpion' }, cindersnake: { v: 4, f: 'ember', m: 'cindersnake' },
  ogre: { v: 5, f: 'stone', m: 'ogre' }, wraith: { v: 5, f: 'dawn', m: 'wraith' }, seaserpent: { v: 5, f: 'tide', m: 'seaserpent' }, chimera: { v: 5, f: 'ember', m: 'chimera' },
  hollowknight: { v: 6, f: 'dawn', m: 'hollowknight' }, gloomcap: { v: 6, f: 'stone', m: 'gloomcap' }, kestrel: { v: 6, f: 'stone', h: 'kestrel' }, embergolem: { v: 6, f: 'ember', m: 'embergolem' },
  warden: { v: 7, f: 'tide', m: 'warden' }, vesper: { v: 7, f: 'dawn', m: 'vesper' }, lyra: { v: 7, f: 'ember', h: 'lyra' }, oswin: { v: 7, f: 'tide', h: 'oswin' },
  leviathan: { v: 8, f: 'tide', m: 'leviathan' }, firstking: { v: 8, f: 'ember', m: 'firstking' }, selene: { v: 8, f: 'dawn', h: 'selene' }, arin: { v: 8, f: 'ember', h: 'arin' },
  wyrm: { v: 9, f: 'dawn', m: 'wyrm' }, king: { v: 9, f: 'dawn', m: 'king' }, nereus: { v: 9, f: 'tide', m: 'nereus' }, crown: { v: 9, f: 'stone', m: 'crown' }, lampeater: { v: 9, f: 'ember', m: 'lampeater' }
};
const cardName = id => CARDS[id].h ? HEROES[CARDS[id].h].name : MONSTERS[CARDS[id].m].name;
const STARTER_CARDS = ['slime', 'bat', 'goblin', 'wolf', 'wisp', 'blueslime', 'harpy'];
// opponents: where they play (town, day or night, x, y), their deck and how carefully they think (0 = random, 1 = sharp)
const CARD_FOES = {
  tess: { name: 'Tess', town: 'brightwater', when: 'day', x: 10, y: 14, look: { style: 'bun', body: '#c8603a', accent: '#ffe9a8' }, deck: ['slime', 'bat', 'goblin', 'wolf', 'moonmoth'], skill: 0.2, line: 'Want a game of Lanterns & Lies? I never lie. Except when I do.' },
  odo: { name: 'Sailor Odo', town: 'halden', when: 'night', x: 14, y: 12, look: 'sailor', deck: ['blueslime', 'harpy', 'sandcrab', 'seaserpent', 'frostwolf'], skill: 0.4, line: 'Cards by moonlight, eh? The sea\'s quiet. My wallet isn\'t.' },
  gorrim: { name: 'Gorrim', town: 'ironhold', when: 'day', x: 7, y: 8, look: 'dwarf', deck: ['hobgoblin', 'sandcrab', 'scorpion', 'ogre', 'gloomcap'], skill: 0.5, line: 'Stone beats tide. Everyone knows that. Dwarves knew it first.' },
  yuki: { name: 'Trapper Yuki', town: 'frostmere', when: 'night', x: 15, y: 12, look: { style: 'long', body: '#e8e8f0', accent: '#5a8ac0', hat: 'cap' }, deck: ['frostwolf', 'snowimp', 'wraith', 'warden', 'oswin'], skill: 0.6, line: 'Long nights up here. Long games. Sit.' },
  nyx: { name: 'Madame Nyx', town: 'mirage', when: 'night', x: 14, y: 12, look: { skin: '#a8724a', hair: '#1a1020', style: 'long', body: '#4a1a5a', accent: '#e8c24a', robe: true }, deck: ['chimera', 'vesper', 'hollowknight', 'firstking', 'selene'], skill: 0.75, line: 'I read fortunes. With cards. Sometimes the fortune is that you lose.' },
  lark: { name: 'Bookie Lark', town: 'aerie', when: 'day', x: 9, y: 12, look: { body: '#a03a2a', accent: '#e8c24a', hat: 'cap' }, deck: ['embergolem', 'kestrel', 'lyra', 'leviathan', 'arin'], skill: 0.8, line: 'Arena odds are boring. Cards — now cards are honest gambling.' },
  dealer: { name: 'The Dealer', town: 'undermarket', when: 'any', x: 6, y: 9, look: { skin: '#c8a888', hair: '#e8e8e8', style: 'short', body: '#1a1a1a', accent: '#c83a3a' }, deck: ['wyrm', 'king', 'crown', 'firstking', 'vesper'], skill: 0.9, line: 'Everyone in the Undermarket lies. At least my table says so up front.' },
  gambler: { name: 'Memory of a Gambler', town: 'nerith', when: 'any', x: 7, y: 12, look: { skin: '#c8e4ea', hair: '#e8f4ff', style: 'short', body: '#2a5a6a', accent: '#ffe9a8' }, deck: ['nereus', 'lampeater', 'leviathan', 'wyrm', 'selene'], skill: 1, line: 'I\'ve been dealt the same hand for a thousand years. Deal me a new one.' }
};
function foeNpc(id) { const o = CARD_FOES[id]; return N(o.x, o.y, 200 + Object.keys(CARD_FOES).indexOf(id), typeof o.look === 'string' ? LOOKS[o.look] : o.look, () => talkCardFoe(id), { name: o.name, mark: !G.flags['cardwin_' + id] && !!G.flags.q_cards }); }
function cardDayNpcs(town) { return Object.keys(CARD_FOES).filter(k => CARD_FOES[k].town === town && CARD_FOES[k].when !== 'night').map(foeNpc); }
function cardNightNpcs(town) { return Object.keys(CARD_FOES).filter(k => CARD_FOES[k].town === town && CARD_FOES[k].when !== 'day').map(foeNpc); }
function cardCount() { return Object.keys(G.cards || {}).filter(k => G.cards[k] > 0).length; }
function addCard(id) { G.cards = G.cards || {}; G.cards[id] = (G.cards[id] || 0) + 1; }

async function talkCardFoe(id) {
  const o = CARD_FOES[id], f = G.flags;
  if (!f.q_cards) {
    if (id !== 'tess') { await say(o.name, 'Lanterns & Lies? You need cards first. Tess in Brightwater hands out starter decks.'); return; }
    await sayAll([
      ['Tess', 'Ever played Lanterns & Lies? Everyone in the world plays it. Well — everyone who\'s bored.'],
      ['Tess', 'Each of us lays down five cards on a 3-by-3 board. Lay a card next to mine with a bigger number and mine turns yours.'],
      ['Tess', 'Flames matter: Ember beats Stone, Stone beats Tide, Tide beats Ember. That\'s +2 when you attack with the right flame.'],
      ['Tess', 'And once a game you can tell a Lie: play a card face-down. It doesn\'t take anything when it lands, but at the end it flips over and takes everything weaker around it.'],
      ['Tess', 'Here, a starter deck. Beat me, and the other players around the world will want a go. Win, and you take a card from their deck.']
    ]);
    for (const c of STARTER_CARDS) addCard(c);
    f.q_cards = true; Audio_.sfx('chest'); toast('New quest: Lanterns & Lies');
    await narrate(`Received ${STARTER_CARDS.length} Lanterns & Lies cards! Card players appear in towns, some only at night.`);
    refreshEntities();
  }
  const c = await choose(o.name, o.line, ['Play', 'Rules', 'Not now'], 2);
  if (c === 1) { await cardRules(); return; }
  if (c !== 0) return;
  const deck = await pickDeck();
  if (!deck) return;
  const r = await playCards(deck, o);
  if (r === 'win') {
    const pool = o.deck.filter(k => !(G.cards[k] > 0));
    const prize = pool.length ? pick(pool) : null;
    const first = !f['cardwin_' + id]; f['cardwin_' + id] = true;
    if (prize) { addCard(prize); Audio_.sfx('chest'); await say(o.name, `Well played. Take one of mine: ${cardName(prize)}.`); await narrate(`Received the ${cardName(prize)} card! (${CARDS[prize].v} · ${FLAMES[CARDS[prize].f].name})`); }
    else { const g = 200 + CARDS[o.deck[0]].v * 150; G.gold += g; Audio_.sfx('item'); await say(o.name, `You've already got every card I own. Here, have some gold instead: ${g}.`); }
    if (first && Object.keys(CARD_FOES).every(k => f['cardwin_' + k]) && !f.cards_done) {
      f.cards_done = true; addItem('jokers_lantern'); Audio_.sfx('chest');
      await narrate('You have beaten every Lanterns & Lies player in the world! Received the Joker\'s Lantern! (Accessory: all stats +10, rare steals twice as likely)');
    }
  } else if (r === 'lose') await say(o.name, 'Ha! Again whenever you like. I\'ll still be here. I\'m always here.');
  refreshEntities();
}
async function cardRules() {
  await sayAll([
    ['Rules', 'Each player brings 5 cards and takes turns laying one on the 3×3 board.'],
    ['Rules', 'When you lay a card, every touching enemy card with a lower value flips to you. Ties flip nothing.'],
    ['Rules', 'Ember beats Stone, Stone beats Tide, Tide beats Ember: +2 to the attacking card. Dawn has no edge, and nothing has an edge over Dawn.'],
    ['Rules', 'The Lie: once a game, press Shift on a card to lay it veiled. It flips nothing when laid, but it is revealed at the end and flips everything weaker around it. A card that attacks a veiled card has to beat its real value.'],
    ['Rules', 'When the board is full, the player who owns more squares wins.']
  ]);
}
// choose five cards from the collection (Enter toggles, the run key fills with the strongest)
function pickDeck() {
  const ids = Object.keys(CARDS).filter(k => G.cards[k] > 0).sort((a, b) => CARDS[b].v - CARDS[a].v);
  if (ids.length < 5) { narrate('You need at least five cards.'); return Promise.resolve(null); }
  const sel = new Set(G.lastDeck ? G.lastDeck.filter(k => G.cards[k] > 0) : ids.slice(0, 5));
  let i = 0, top = 0, fresh = true;
  return UI.push({
    update() {
      if (fresh) { fresh = false; return; }   // ignore the key press that opened this screen
      if (Input.p('up')) { i = (i + ids.length - 1) % ids.length; Audio_.sfx('cursor'); }
      if (Input.p('down')) { i = (i + 1) % ids.length; Audio_.sfx('cursor'); }
      if (Input.p('run')) { sel.clear(); ids.slice(0, 5).forEach(k => sel.add(k)); Audio_.sfx('cursor'); }
      if (Input.p('ok')) {
        if (sel.has(ids[i])) sel.delete(ids[i]); else if (sel.size < 5) sel.add(ids[i]); else Audio_.sfx('buzz');
        if (sel.size === 5 && Input.h('ok')) { }
      }
      if (Input.p('cancel')) {
        if (sel.size === 5) { G.lastDeck = [...sel]; UI.close(this, [...sel]); } else { Audio_.sfx('cancel'); UI.close(this, null); }
      }
      top = clamp(top, i - 9, i);
    },
    draw(g) {
      g.fillStyle = 'rgba(4,6,20,.9)'; g.fillRect(0, 0, W, H);
      drawWindow(g, 30, 20, 300, 440);
      text(g, `Your deck  ${sel.size}/5`, 46, 30, { size: 16, bold: true, color: '#ffe9a8' });
      ids.slice(top, top + 10).forEach((k, n) => {
        const y = 62 + n * 36, on = sel.has(k), cur = top + n === i;
        if (cur) rrect(g, 40, y - 4, 280, 32, 6, 'rgba(255,233,168,.15)');
        text(g, (on ? '◆ ' : '◇ ') + cardName(k), 52, y + 4, { size: 14, color: on ? '#ffe9a8' : '#fff' });
        text(g, `${CARDS[k].v} · ${FLAMES[CARDS[k].f].name}${G.cards[k] > 1 ? ` ×${G.cards[k]}` : ''}`, 308, y + 4, { size: 13, align: 'right', color: FLAMES[CARDS[k].f].col });
      });
      drawCard(g, ids[i], 400, 120, 1.5, 'p');
      text(g, 'Enter: pick · Shift: strongest five · Esc: ' + (sel.size === 5 ? 'play' : 'back'), 480, 420, { size: 12, align: 'center', color: '#b8c4ee' });
    }
  });
}
// a card face (or back) at x, y; scale 1 = 76×100
function drawCard(g, id, x, y, s = 1, owner = 'p', veiled = false, back = false) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const col = owner === 'p' ? '#3a6ad0' : '#c03a4a';
  if (back) {
    rrect(g, 0, 0, 76, 100, 8, '#2a1a40', '#e8c24a', 2);
    for (let i = 0; i < 4; i++) rrect(g, 8 + i * 4, 8 + i * 4, 60 - i * 8, 84 - i * 8, 6, null, 'rgba(232,194,74,.35)', 1);
    text(g, '✦', 38, 38, { size: 22, align: 'center', color: '#e8c24a' });
    g.restore(); return;
  }
  const c = CARDS[id], fl = FLAMES[c.f];
  rrect(g, 0, 0, 76, 100, 8, veiled ? '#2a2a3a' : '#f4ecd8', col, 3);
  if (veiled) { text(g, '?', 38, 30, { size: 34, bold: true, align: 'center', color: '#e8c24a' }); g.restore(); return; }
  rrect(g, 4, 4, 68, 64, 5, rgba(fl.col, 0.35));
  g.save(); g.beginPath(); g.rect(4, 4, 68, 64); g.clip();
  if (c.h) drawChar(g, HEROES[c.h].look, 38, 62, 'down', 0, 0.85, null, 0);
  else { const d = MONSTERS[c.m]; const sc = 0.62 / Math.max(1, monsterHeight(d) / 70, monsterWidth(d) / 80); drawMonster(g, d, 38, 64, { t: 0, scale: sc }); }
  g.restore();
  circle(g, 14, 14, 11, fl.col, OUT, 1.5);
  text(g, String(c.v), 14, 6, { size: 16, bold: true, align: 'center', color: '#1a1020', shadow: false });
  text(g, cardName(id).length > 12 ? cardName(id).slice(0, 11) + '…' : cardName(id), 38, 72, { size: 10, align: 'center', color: '#1a1020', shadow: false });
  text(g, fl.name, 38, 85, { size: 9, align: 'center', color: shade(fl.col, -0.4), shadow: false });
  g.restore();
}

// ---------------- the match ----------------
const ADJ = [[1, 3], [0, 2, 4], [1, 5], [0, 4, 6], [1, 3, 5, 7], [2, 4, 8], [3, 7], [4, 6, 8], [5, 7]];
function cardAttack(id, target) { const a = CARDS[id], d = CARDS[target]; return a.v + (FLAMES[a.f].beats === d.f ? 2 : 0) > d.v; }
// lay a card; returns the squares it flipped (veiled cards flip nothing when laid)
function layCard(board, cell, id, owner, veiled) {
  board[cell] = { id, owner, veiled };
  if (veiled) return [];
  const flips = [];
  for (const n of ADJ[cell]) { const b = board[n]; if (b && b.owner !== owner && cardAttack(id, b.id)) { b.owner = owner; b.veiled = false; flips.push(n); } }
  return flips;
}
// the end of the game: veiled cards turn over and attack, in the order they were laid
function revealLies(board) {
  const flips = [];
  board.forEach((b, cell) => {
    if (!b || !b.veiled) return;
    b.veiled = false;
    for (const n of ADJ[cell]) { const t = board[n]; if (t && t.owner !== b.owner && cardAttack(b.id, t.id)) { t.owner = b.owner; flips.push(n); } }
  });
  return flips;
}
// the opponent's choice: flips now, minus how exposed the card is, with some noise for weaker players
function cardAI(board, hand, veilLeft, skill) {
  let best = null;
  for (const id of hand) for (let cell = 0; cell < 9; cell++) {
    if (board[cell]) continue;
    let gain = 0, risk = 0;
    for (const n of ADJ[cell]) {
      const b = board[n];
      if (!b) { risk += 10 - CARDS[id].v; continue; }
      if (b.owner === 'p' && !b.veiled && cardAttack(id, b.id)) gain += 10;
      if (b.owner === 'p' && b.veiled) risk += 3;
    }
    const score = gain - risk * 0.4 * skill - CARDS[id].v * 0.3 + Math.random() * (1 - skill) * 14;
    if (!best || score > best.score) best = { id, cell, score, gain };
  }
  // tell a Lie with a strong card when it would flip nothing now
  best.veil = veilLeft && best.gain === 0 && CARDS[best.id].v >= 6 && Math.random() < 0.6 * skill + 0.2;
  return best;
}
function playCards(deck, foe) {
  const board = Array(9).fill(null); confirm_ = 0;
  const hands = { p: [...deck], o: [...foe.deck] };
  const veil = { p: true, o: true };
  let turn = Math.random() < 0.5 ? 'p' : 'o', sel = 0, cell = 4, phase = 'card', veilOn = false, wait_ = 0.9, flash = [], msg = turn === 'p' ? 'You go first.' : `${foe.name} goes first.`, result = null, msgT = 2;
  const score = who => board.filter(b => b && b.owner === who).length;
  CardGame.state = { board, hands, turn: () => turn, phase: () => phase, cell: () => cell, sel: () => sel };   // read-only view for the play-test
  const finish = () => { flash = revealLies(board); result = score('p') > score('o') ? 'win' : 'lose'; msg = result === 'win' ? 'You win!' : `${foe.name} wins.`; msgT = 99; Audio_.sfx(result === 'win' ? 'levelup' : 'buzz'); phase = 'done'; };
  const next = () => { if (board.every(Boolean)) { finish(); return; } turn = turn === 'p' ? 'o' : 'p'; wait_ = 0.8; if (turn === 'p') { sel = Math.min(sel, hands.p.length - 1); phase = 'card'; } };
  let fresh = true;
  return UI.push({
    update(dt) {
      dt = dt || 1 / 60; msgT -= dt;
      if (fresh) { fresh = false; return; }
      if (phase === 'done') { if (Input.p('ok') || Input.p('cancel')) UI.close(this, result); return; }
      if (turn === 'o') {
        wait_ -= dt; if (wait_ > 0) return;
        const mv = cardAI(board, hands.o, veil.o, foe.skill);
        if (mv.veil) veil.o = false;
        hands.o.splice(hands.o.indexOf(mv.id), 1);
        flash = layCard(board, mv.cell, mv.id, 'o', mv.veil); Audio_.sfx(flash.length ? 'hit' : 'cursor');
        msg = mv.veil ? `${foe.name} lays a card face-down…` : flash.length ? `${foe.name} takes ${flash.length}!` : ''; msgT = 1.6;
        next(); return;
      }
      if (phase === 'card') {
        if (Input.p('left')) { sel = (sel + hands.p.length - 1) % hands.p.length; Audio_.sfx('cursor'); }
        if (Input.p('right')) { sel = (sel + 1) % hands.p.length; Audio_.sfx('cursor'); }
        if (Input.p('run') && veil.p) { veilOn = !veilOn; Audio_.sfx('cursor'); }
        if (Input.p('ok')) { phase = 'cell'; cell = board[4] ? board.findIndex(b => !b) : 4; Audio_.sfx('ok'); }
        if (Input.p('cancel')) { const c = confirm_ = (confirm_ || 0) + 1; if (c >= 2) { result = 'quit'; UI.close(this, 'quit'); } else { msg = 'Press Esc again to forfeit.'; msgT = 1.5; } }
      } else if (phase === 'cell') {
        const r = Math.floor(cell / 3), c = cell % 3;
        if (Input.p('left') && c > 0) cell--; if (Input.p('right') && c < 2) cell++;
        if (Input.p('up') && r > 0) cell -= 3; if (Input.p('down') && r < 2) cell += 3;
        if (Input.p('cancel')) { phase = 'card'; Audio_.sfx('cancel'); }
        else if (Input.p('ok')) {
          if (board[cell]) { Audio_.sfx('buzz'); return; }
          const id = hands.p.splice(sel, 1)[0];
          const veiled = veilOn && veil.p; if (veiled) veil.p = false; veilOn = false;
          flash = layCard(board, cell, id, 'p', veiled); Audio_.sfx(flash.length ? 'hit' : 'cursor');
          msg = veiled ? 'You lay a card face-down. A Lie.' : flash.length ? `You take ${flash.length}!` : ''; msgT = 1.6;
          next();
        }
      }
    },
    draw(g) {
      g.fillStyle = '#120c20'; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 380); gr.addColorStop(0, '#2a4a2a'); gr.addColorStop(1, '#0a140a'); g.fillStyle = gr; rrect(g, 150, 20, 340, 440, 18, null); g.fill();
      const cx = (k) => 180 + (k % 3) * 96, cy = (k) => 40 + Math.floor(k / 3) * 140;
      for (let k = 0; k < 9; k++) {
        rrect(g, cx(k) - 6, cy(k) - 6, 88, 112, 8, 'rgba(0,0,0,.25)', phase === 'cell' && k === cell && turn === 'p' ? '#ffe9a8' : 'rgba(255,255,255,.12)', phase === 'cell' && k === cell ? 3 : 1);
        const b = board[k];
        if (b) { drawCard(g, b.id, cx(k), cy(k), 1, b.owner, b.veiled && b.owner === 'o', false); if (b.veiled && b.owner === 'p') text(g, 'veiled', cx(k) + 38, cy(k) + 90, { size: 10, align: 'center', color: '#c070ff' }); }
        if (flash.includes(k)) { g.save(); g.globalAlpha = clamp(msgT, 0, 1) * 0.5; rrect(g, cx(k), cy(k), 76, 100, 8, '#fff'); g.restore(); }
      }
      // opponent's hand (backs) and score
      text(g, foe.name, 70, 24, { size: 14, align: 'center', color: '#ff9a9a' });
      hands.o.forEach((id, n) => drawCard(g, id, 34 + (n % 2) * 40, 48 + n * 46, 0.7, 'o', false, true));
      text(g, String(score('o')), 70, 420, { size: 28, bold: true, align: 'center', color: '#ff9a9a' });
      text(g, 'You', 570, 24, { size: 14, align: 'center', color: '#9ab8ff' });
      hands.p.forEach((id, n) => { const on = n === sel && turn === 'p' && phase !== 'done'; drawCard(g, id, 520 + (n % 2) * 44 - (on ? 10 : 0), 48 + n * 50, on ? 0.72 : 0.6, 'p', false); if (on && veilOn) text(g, 'LIE', 548, 46 + n * 50, { size: 12, bold: true, color: '#c070ff' }); });
      text(g, String(score('p')), 570, 420, { size: 28, bold: true, align: 'center', color: '#9ab8ff' });
      if (msg && msgT > 0) { g.font = font(16); const w = g.measureText(msg).width + 40; drawWindow(g, (W - w) / 2, 210, w, 40); text(g, msg, W / 2, 220, { size: 16, align: 'center' }); }
      const help = phase === 'done' ? 'Enter to continue' : turn !== 'p' ? `${foe.name} is thinking…` : phase === 'card' ? `←→ choose a card · Enter: lay it${veil.p ? ' · Shift: Lie' + (veilOn ? ' (on)' : '') : ''} · Esc×2: forfeit` : 'Arrows: choose a square · Enter: lay · Esc: back';
      text(g, help, W / 2, 462, { size: 11, align: 'center', color: '#b8c4ee' });
    }
  });
}
let confirm_ = 0;
const CardGame = { state: null };

function cardQuests() {
  const f = G.flags; if (!f.q_cards) return [];
  const n = Object.keys(CARD_FOES).filter(k => f['cardwin_' + k]).length, tot = Object.keys(CARD_FOES).length;
  return [{ title: 'Lanterns & Lies', giver: 'Tess, Brightwater', done: !!f.cards_done, reward: 'Joker\'s Lantern', desc: f.cards_done ? 'Every card player in the world has lost to you at least once.' : `Beat every card player: Tess (Brightwater), Sailor Odo (Port Halden, night), Gorrim (Ironhold), Trapper Yuki (Frostmere, night), Madame Nyx (Mirage, night), Bookie Lark (Aerie), the Dealer (the Undermarket) and someone in Nerith. (${n}/${tot} beaten · ${cardCount()}/${Object.keys(CARDS).length} cards)` }];
}
