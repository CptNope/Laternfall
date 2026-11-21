'use strict';
// ============================================================
//  INTERIORS — walk inside every building
// ============================================================
// Legend: # wall top, = wall face, w window, F fireplace, X shelf, M banner/painting
//         . floor, R rug, K counter, B bed, T table, c chair, b barrel, p pot, P plant,
//         x crate, A altar, W pew, I bars, O telescope, a anvil, E exit door
const INT_SOLID = new Set(['#', '=', 'w', 'F', 'X', 'M', 'K', 'B', 'T', 'b', 'p', 'P', 'x', 'A', 'W', 'I', 'O', 'a']);
const INT_TEMPLATES = {
  inn: ['#############', '#X=w=F=w=X=M#', '#B.B........#', '#.......KKKK#', '#...........#', '#.TT....b..p#', '#.TT........#', '#.....RRR...#', '#.P...RRR..P#', '######E######'],
  shop: ['#############', '#X=X=w=X=X=X#', '#x....k....x#', '#KKKKKKKKKKK#', '#...........#', '#.b.......x.#', '#...RRRRR...#', '#.p.RRRRR.P.#', '#...........#', '######E######'],
  house: ['#############', '#X=w=F=w=X=M#', '#B......TT..#', '#B......cc..#', '#...........#', '#..RRRR...b.#', '#..RRRR.....#', '#.p.......P.#', '#...........#', '######E######'],
  chapel: ['#############', '#=w=M=w=M=w=#', '#.....A.....#', '#...........#', '#.WWW...WWW.#', '#...........#', '#.WWW...WWW.#', '#...........#', '#.P..RRR..P.#', '######E######'],
  hall: ['#############', '#X=X=M=M=X=X#', '#.....RR....#', '#..TTTTTT...#', '#..cccccc...#', '#.....RR....#', '#.x...RR..x.#', '#.P...RR..P.#', '#.....RR....#', '######E######'],
  jail: ['#############', '#=====M=====#', '#B..I.......#', '#...I..TT...#', '#IIII..cc...#', '#...........#', '#.x.......x.#', '#...........#', '#.........b.#', '######E######'],
  arena: ['#############', '#=M=w=M=w=M=#', '#x....k....x#', '#..KKKKKKK..#', '#...........#', '#.x.......x.#', '#.....RR....#', '#.P...RR..P.#', '#.....RR....#', '######E######'],
  study: ['#############', '#X=X=w=w=X=X#', '#.....O.....#', '#.T.........#', '#.T......B..#', '#...........#', '#.x..RRR..p.#', '#....RRR....#', '#.P.......P.#', '######E######'],
  forge: ['#############', '#X=X=F=F=X=X#', '#x....k...a.#', '#KKKKKKKKKKK#', '#...........#', '#.b.......x.#', '#...RRRRR...#', '#.x.RRRRR.b.#', '#...........#', '######E######']
};
function interiorKind(town, b) {
  if (b.kind === 'inn') return 'inn';
  if (b.kind === 'chapel') return 'chapel';
  if (b.kind === 'jail') return 'jail';
  if (b.kind === 'arena') return 'arena';
  if (b.kind === 'hall') return 'hall';
  if (b.id === 'wren') return 'study';
  if (b.shop) return b.sign === 'arms' && (town === 'ironhold' || town === 'frostmere') ? 'forge' : 'shop';
  return 'house';
}
function buildInterior(id) {
  const [, town, bid] = id.split(':');
  const b = TOWN_DEFS[town].buildings.find(x => x.id === bid);
  const kind = interiorKind(town, b);
  const tiles = INT_TEMPLATES[kind].map(r => r.split(''));
  let keeper = null;
  tiles.forEach((r, y) => r.forEach((c, x) => { if (c === 'k') { keeper = { x, y }; r[x] = '.'; } }));
  const theme = TOWN_DEFS[town].theme === 'stone' || kind === 'jail' || kind === 'chapel' ? 'stone' : TOWN_DEFS[town].theme === 'sand' ? 'sand' : 'wood';
  const names = { inn: 'Inn', shop: b.sign === 'arms' ? 'Armory' : 'Item Shop', chapel: 'Chapel', jail: 'Jail', arena: 'The Arena', hall: 'Hall', study: 'Observatory Hut', forge: 'Smithy', house: 'House' };
  return new GameMap({ id, kind: 'interior', town, bid, building: b, ikind: kind, keeper, w: tiles[0].length, h: tiles.length, tiles, theme, name: names[kind] });
}
async function enterInterior(town, b) {
  const m = getMap(`in:${town}:${b.id}`);
  const ex = m.tiles[m.h - 1].indexOf('E');
  await changeMap(m.id, ex, m.h - 2, 'up');
}
async function exitInterior() {
  const m = Field.map, b = m.building;
  await changeMap(m.town, b.x + Math.floor(b.w / 2), b.y + b.h, 'down');
  Field.banner = null;
}
const SEARCH_POOLS = {
  brightwater: ['potion', 'antidote', 'gold:30', 'potion'],
  halden: ['hipotion', 'ether', 'gold:120', 'remedy'],
  ironhold: ['hipotion', 'ether', 'gold:300', 'remedy', 'bomb'],
  frostmere: ['xpotion', 'hiether', 'gold:500', 'remedy'],
  mirage: ['xpotion', 'elixir', 'gold:800', 'hiether'],
  aerie: ['elixir', 'xpotion', 'gold:1200', 'megalixir']
};
async function interiorInteract(tx, ty, dx, dy) {
  const m = Field.map, c = m.at(tx, ty);
  // talk across counters and bars
  if (c === 'K' || c === 'I' || c === 'T') {
    const e = Field.entityAt(tx + dx, ty + dy);
    if (e && e.talk) { e.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[G.dir]; await e.talk(e); refreshEntities(); return; }
    if (c !== 'T') { await narrate(c === 'K' ? 'A polished counter.' : 'Cold iron bars.'); return; }
    await narrate('A sturdy table, set with plates and candles.'); return;
  }
  if (c === 'b' || c === 'p' || c === 'x') {
    const key = `srch:${m.id}:${tx},${ty}`;
    const what = { b: 'barrel', p: 'pot', x: 'crate' }[c];
    if (G.flags[key] || hash(tx, ty, m.id.length * 7 + m.town.length) > 0.55) { G.flags[key] = true; await narrate(`You search the ${what}... nothing but dust.`); return; }
    G.flags[key] = true;
    const pool = SEARCH_POOLS[m.town] || SEARCH_POOLS.brightwater;
    const loot = pool[Math.floor(hash(tx * 3, ty * 5, m.id.length) * pool.length)];
    Audio_.sfx('chest');
    if (loot.startsWith('gold:')) { const n = parseInt(loot.slice(5)); G.gold += n; await narrate(`You search the ${what}... found ${n} gold!`); }
    else { addItem(loot); await narrate(`You search the ${what}... found ${ITEMS[loot].name}!`); }
    return;
  }
  if (c === 'B') {
    if (m.town === 'brightwater' && m.bid === 'arinhouse') {
      const k = await choose(null, 'Your own bed. Rest a while?', ['Rest', 'Not now'], 1);
      if (k === 0) { await fadeTo(1, 500); Audio_.sfx('inn'); healAll(); G.lastInn = { town: 'brightwater' }; await wait(1200); await fadeTo(0, 500); await narrate('You slept in your own bed. HP and MP restored.'); }
      return;
    }
    await narrate(m.ikind === 'jail' ? 'A lumpy prison cot.' : 'A neatly made bed. It isn\'t yours.'); return;
  }
  if (c === 'O') { await narrate(G.flags.lantern3 ? 'Through the brass telescope the sky is crowded with stars. One constellation, the Lamplighter, has a gap where a fifth star should be.' + (G.flags.lantern5 ? ' ...No — it\'s there now, burning bright.' : '') : 'You peer through the telescope. Darkness. Wren has scribbled "TOO DARK!!" on a note beside it.'); return; }
  if (c === 'X') { await narrate(pick(['Dusty books: "A History of the Four Flames", "Lamplighting for Beginners", "101 Uses for Goblin Teeth".', 'A shelf of jars, labels faded.', 'Old ledgers. Someone owes someone else a goat.'])); return; }
  if (c === 'F') { await narrate('The fire crackles warmly.'); return; }
  if (c === 'A') { await narrate('An altar to the Sea Mother, strewn with shells.'); return; }
  if (c === 'a') { await narrate('A heavy anvil, still warm.'); return; }
  if (c === 'M') { await narrate('A faded tapestry of four flames around a fifth.'); return; }
  if (c === 'w') { await narrate('Through the window you can see the street outside.'); return; }
}
// ---------- drawing ----------
const IPAL = {
  wood: { floor: '#b88a56', floor2: '#ac7e4c', line: '#8a6038', top: '#3a2a1e', face: '#d8c098', trim: '#7a5030' },
  stone: { floor: '#9a9a96', floor2: '#90908c', line: '#6a6a66', top: '#2a2a2e', face: '#b8b4a8', trim: '#6a6a72' },
  sand: { floor: '#d8b880', floor2: '#cfae76', line: '#a8844a', top: '#5a3a1e', face: '#ecd6a8', trim: '#a06a3a' }
};
function drawInteriorTile(g, m, x, y, px, py, t) {
  const P = IPAL[m.theme], c = m.at(x, y);
  const floor = () => {
    g.fillStyle = m.theme === 'wood' ? ((y % 2) ? P.floor : P.floor2) : ((x + y) % 2 ? P.floor : P.floor2); g.fillRect(px, py, TS, TS);
    g.strokeStyle = P.line; g.lineWidth = 1;
    if (m.theme === 'wood') { g.beginPath(); g.moveTo(px, py + 0.5); g.lineTo(px + TS, py + 0.5); const o = (y % 2) * 16 + 8; g.moveTo(px + o, py); g.lineTo(px + o, py + TS); g.stroke(); }
    else g.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
    if (m.at(x, y - 1) && '#=wFXM'.includes(m.at(x, y - 1))) { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px, py, TS, 6); }
  };
  if (c === '#') {
    g.fillStyle = P.top; g.fillRect(px, py, TS, TS);
    if (y === m.h - 1 || x === 0 || x === m.w - 1) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(px, py, TS, 3); }
    return;
  }
  if ('=wFXM'.includes(c)) {
    g.fillStyle = P.face; g.fillRect(px, py, TS, TS);
    g.fillStyle = P.trim; g.fillRect(px, py + TS - 9, TS, 9); g.fillRect(px, py, TS, 3);
    if (m.theme === 'wood') { g.strokeStyle = 'rgba(120,80,40,.25)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(px + i * 8, py + 3); g.lineTo(px + i * 8, py + TS - 9); g.stroke(); } }
    if (c === 'w') { rrect(g, px + 6, py + 4, 20, 15, 2, '#9ad0ff', P.trim, 2.5); line(g, px + 16, py + 4, px + 16, py + 19, P.trim, 1.5); line(g, px + 6, py + 11, px + 26, py + 11, P.trim, 1.5); }
    if (c === 'X') { rrect(g, px + 2, py + 2, 28, 24, 1, '#6a4422', OUT, 1); for (let r = 0; r < 3; r++) { g.fillStyle = '#4a2a12'; g.fillRect(px + 3, py + 9 + r * 7, 26, 1.5); for (let k = 0; k < 6; k++) { g.fillStyle = ['#a03a2a', '#3a6aa0', '#3a8a4a', '#c0a040'][(k + r + x) % 4]; g.fillRect(px + 4 + k * 4, py + 3 + r * 7, 3, 6); } } }
    if (c === 'F') { rrect(g, px + 2, py + 6, 28, 22, 2, '#8a7a6a', OUT, 1.2); rrect(g, px + 7, py + 12, 18, 16, 6, '#1a0c06'); const f = Math.sin(t * 12 + x) * 1.5; poly(g, [px + 10, py + 27, px + 16 + f, py + 14 - f, px + 22, py + 27], '#ff8a2a'); poly(g, [px + 13, py + 27, px + 16, py + 19, px + 19, py + 27], '#ffe08a'); g.save(); g.globalAlpha = 0.18; circle(g, px + 16, py + 22, 20, '#ffb04a'); g.restore(); }
    if (c === 'M') { rrect(g, px + 6, py + 3, 20, 20, 1, '#8a3a3a', '#e8c24a', 1.5); for (let i = 0; i < 4; i++) circle(g, px + 10 + (i % 2) * 12, py + 8 + Math.floor(i / 2) * 10, 2, '#ffb04a'); circle(g, px + 16, py + 13, 2.4, '#a8d8ff'); }
    return;
  }
  if (c === 'E') { g.fillStyle = P.top; g.fillRect(px, py, TS, TS); rrect(g, px + 4, py, TS - 8, TS - 2, 2, '#e8d8a8', null); g.fillStyle = 'rgba(255,240,200,.5)'; g.fillRect(px + 6, py + 2, TS - 12, TS - 6); poly(g, [px + 11, py + 12, px + 21, py + 12, px + 16, py + 20], '#8a6038'); return; }
  floor();
  switch (c) {
    case 'R': { g.fillStyle = '#a03a3a'; g.fillRect(px, py, TS, TS); g.strokeStyle = '#e8c24a'; g.lineWidth = 1.5; const L = m.at(x - 1, y) !== 'R', Rr = m.at(x + 1, y) !== 'R', U = m.at(x, y - 1) !== 'R', D = m.at(x, y + 1) !== 'R'; g.beginPath(); if (L) { g.moveTo(px + 3, py); g.lineTo(px + 3, py + TS); } if (Rr) { g.moveTo(px + TS - 3, py); g.lineTo(px + TS - 3, py + TS); } if (U) { g.moveTo(px, py + 3); g.lineTo(px + TS, py + 3); } if (D) { g.moveTo(px, py + TS - 3); g.lineTo(px + TS, py + TS - 3); } g.stroke(); break; }
    case 'K': { rrect(g, px, py + 6, TS, 24, 1, '#8a5a2a', OUT, 1); g.fillStyle = '#b07a3a'; g.fillRect(px, py + 6, TS, 7); if (hash(x, y, 2) < 0.4) { rrect(g, px + 8, py - 2, 8, 9, 3, '#3ab0e0', OUT, 1); } break; }
    case 'B': { rrect(g, px + 3, py + 1, TS - 6, TS - 2, 3, '#7a4a22', OUT, 1.2); rrect(g, px + 5, py + 3, TS - 10, 8, 3, '#fff', null); rrect(g, px + 5, py + 12, TS - 10, TS - 15, 2, m.theme === 'stone' ? '#7a7a8a' : '#4a6ac0', null); break; }
    case 'T': { const L = m.at(x - 1, y) === 'T', Rr = m.at(x + 1, y) === 'T'; g.fillStyle = '#8a5a2a'; g.fillRect(px + (L ? 0 : 3), py + 6, TS - (L ? 0 : 3) - (Rr ? 0 : 3), 18); g.fillStyle = '#a8743a'; g.fillRect(px + (L ? 0 : 3), py + 6, TS - (L ? 0 : 3) - (Rr ? 0 : 3), 5); if (!L) line(g, px + 5, py + 24, px + 5, py + 30, '#5a3a1a', 2.5); if (!Rr) line(g, px + TS - 5, py + 24, px + TS - 5, py + 30, '#5a3a1a', 2.5); if (hash(x, y, 4) < 0.5) { circle(g, px + 16, py + 10, 4, '#e8e0d0', OUT, 1); } break; }
    case 'c': { rrect(g, px + 9, py + 10, 14, 12, 2, '#9a6a3a', OUT, 1); rrect(g, px + 9, py + 4, 14, 6, 2, '#7a4a22', OUT, 1); break; }
    case 'b': { ellipse(g, px + 16, py + 28, 10, 3, 'rgba(0,0,0,.25)'); rrect(g, px + 6, py + 6, 20, 22, 6, '#9a6a3a', OUT, 1.2); line(g, px + 6, py + 12, px + 26, py + 12, '#5a3a1a', 2); line(g, px + 6, py + 22, px + 26, py + 22, '#5a3a1a', 2); break; }
    case 'p': { ellipse(g, px + 16, py + 28, 9, 3, 'rgba(0,0,0,.25)'); g.beginPath(); g.moveTo(px + 11, py + 8); g.quadraticCurveTo(px + 4, py + 20, px + 10, py + 28); g.lineTo(px + 22, py + 28); g.quadraticCurveTo(px + 28, py + 20, px + 21, py + 8); g.closePath(); g.fillStyle = '#c06a3a'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke(); rrect(g, px + 10, py + 6, 12, 4, 2, '#a05a2a', OUT, 1); break; }
    case 'x': { rrect(g, px + 4, py + 8, 24, 20, 1, '#b8844a', OUT, 1.2); line(g, px + 4, py + 8, px + 28, py + 28, '#7a5428', 1.2); line(g, px + 28, py + 8, px + 4, py + 28, '#7a5428', 1.2); break; }
    case 'P': { rrect(g, px + 10, py + 18, 12, 11, 2, '#a0502a', OUT, 1); circle(g, px + 16, py + 12, 8, '#3f8a3a', OUT, 1); circle(g, px + 12, py + 9, 4, '#5fae50'); break; }
    case 'A': { rrect(g, px + 2, py + 8, TS - 4, 20, 2, '#e8eef4', OUT, 1.2); g.fillStyle = '#3a8fd0'; g.fillRect(px + 2, py + 14, TS - 4, 3); circle(g, px + 16, py + 4, 4, `rgba(255,220,120,${0.6 + 0.4 * Math.sin(t * 3)})`); break; }
    case 'W': { rrect(g, px, py + 10, TS, 10, 1, '#8a5a2a', OUT, 1); g.fillStyle = '#6a4020'; g.fillRect(px, py + 18, TS, 6); break; }
    case 'I': { for (let i = 0; i < 4; i++) line(g, px + 4 + i * 8, py, px + 4 + i * 8, py + TS, '#5a5a66', 2.5); line(g, px, py + 4, px + TS, py + 4, '#5a5a66', 2.5); break; }
    case 'O': { line(g, px + 10, py + 30, px + 16, py + 18, '#5a3a1f', 2); line(g, px + 22, py + 30, px + 16, py + 18, '#5a3a1f', 2); g.save(); g.translate(px + 16, py + 16); g.rotate(-0.7); rrect(g, -4, -16, 8, 22, 3, '#c8a040', OUT, 1.2); g.restore(); break; }
    case 'a': { rrect(g, px + 6, py + 12, 20, 6, 2, '#3a3a40', OUT, 1); rrect(g, px + 12, py + 18, 8, 10, 1, '#2a2a30', OUT, 1); break; }
  }
}
