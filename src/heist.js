'use strict';
// ============================================================
//  THE SUNSET OPAL (1.9): a stealth heist in the Mirage palace at night.
//  Guards walk fixed patrols and see 4 squares ahead, widening to a 3-square
//  cone; walls and pillars block their sight. Get seen and you're thrown out.
// ============================================================

// # wall, o pillar (blocks sight), . floor, E the cellar grate (exit), V the vault
const HEIST_MAP = [
  '####################',
  '#E.....#....#......#',
  '#......#.o..#..o...#',
  '#..o...#....#......#',
  '#......###.###..o..#',
  '#..................#',
  '###.####....####.###',
  '#......#....#......#',
  '#.o....#.o..#....o.#',
  '#......#....#......#',
  '#......##..##......#',
  '#..o...........V...#',
  '#..................#',
  '####################'
];
// patrols: waypoints walked in order (and looped); a guard takes one step every GUARD_STEP seconds
const GUARD_STEP = 0.6;
const HEIST_GUARDS = [
  [[3, 5], [16, 5]],                       // the long hall, back and forth
  [[9, 7], [9, 9], [10, 9], [10, 7]],      // the middle room
  [[14, 1], [18, 1], [18, 3], [14, 3]],    // the east room
  [[11, 12], [18, 12]]                     // in front of the vault
];
const HEIST_SOLID = new Set(['#', 'o']);
function buildHeist() {
  const tiles = HEIST_MAP.map(r => r.split(''));
  return new GameMap({ id: 'heist', kind: 'heist', w: tiles[0].length, h: tiles.length, tiles, theme: 'tomb', name: 'The Palace Vaults', torches: new Set(['4,0', '15,0', '2,6', '17,6', '5,13', '14,13']) });
}
// expand a patrol into the square it stands on at each step
function patrolPath(wp) {
  const out = [];
  const legs = wp.length === 2 ? [wp[0], wp[1], wp[0]] : [...wp, wp[0]];
  for (let k = 0; k < legs.length - 1; k++) {
    let [x, y] = legs[k]; const [x1, y1] = legs[k + 1];
    while (x !== x1 || y !== y1) { out.push([x, y]); x += Math.sign(x1 - x); y += Math.sign(y1 - y); }
  }
  return out;
}
function guardAt(path, step) {
  const n = path.length, i = ((step % n) + n) % n, [x, y] = path[i], [nx, ny] = path[(i + 1) % n];
  const dir = nx > x ? 'right' : nx < x ? 'left' : ny > y ? 'down' : 'up';
  return { x, y, dir };
}
// the squares a guard can see: 4 ahead, the cone widening to 3 wide from the 2nd square; solid squares stop sight
function guardSight(map, g) {
  const [dx, dy] = DIRS[g.dir], px = -dy, py = dx, seen = [];
  const open = (x, y) => map.at(x, y) !== undefined && !HEIST_SOLID.has(map.at(x, y));
  for (let d = 1; d <= 4; d++) {
    const cx = g.x + dx * d, cy = g.y + dy * d;
    if (!open(cx, cy)) break;
    seen.push([cx, cy]);
    if (d >= 2) for (const s of [-1, 1]) {
      const sx = cx + px * s, sy = cy + py * s, bx = sx - dx, by = sy - dy;
      if (open(sx, sy) && open(bx, by)) seen.push([sx, sy]);
    }
  }
  return seen;
}
function heistEntities(m) {
  const out = [];
  const paths = HEIST_GUARDS.map(patrolPath);
  paths.forEach((p, i) => { const g = guardAt(p, 0); out.push({ kind: 'guard', x: g.x, y: g.y, dir: g.dir, path: p, step: 0, look: { ...LOOKS.guard, skin: '#c98e62', hat: 'cap', accent: '#e8c24a' }, idx: i }); });
  if (!hasItem('sunset_opal') && !G.flags.heist_done) out.push({ kind: 'chest', x: 15, y: 11, key: 'heist_opal', loot: 'sunset_opal', opened: false, opal: true });
  return out;
}
const Heist = {
  t: 0,
  seen(m) { const s = new Set(); for (const e of m.entities) if (e.kind === 'guard') for (const [x, y] of guardSight(m, e)) s.add(x + ',' + y); return s; },
  tick(m, dt) {
    if (Script.running || UI.stack.length) return;
    this.t += dt;
    if (this.t >= GUARD_STEP) {
      this.t -= GUARD_STEP;
      for (const e of m.entities) if (e.kind === 'guard') {
        const g = guardAt(e.path, e.step + 1);
        if (g.x === G.x && g.y === G.y) continue;      // never walk into the player: the guard waits
        e.step++; Object.assign(e, g);
      }
    }
    this.check(m);
  },
  check(m) {
    if (Script.running || Field.anim) return;
    const px = G.x, py = G.y;
    if (this.seen(m).has(px + ',' + py)) runScript(heistCaught);
  }
};
async function heistCaught() {
  const f = G.flags;
  Audio_.sfx('buzz');
  await say('Palace Guard', 'THIEF! In the vaults!');
  f.heist_caught = (f.heist_caught || 0) + 1;
  if (hasItem('sunset_opal')) addItem('sunset_opal', -1);
  await narrate('The guards march you out through the servants\' gate and dump you in the street.');
  await changeMap('mirage', HEIST_GATE.x, HEIST_GATE.y + 1, 'down');
  if (inParty('kestrel')) await say(KE, f.heist_caught > 2 ? 'Third time\'s the charm. Or the fourth. Watch which way they\'re facing, and wait behind the pillars.' : 'Rule one: they only see what\'s in front of them. Rule two: pillars are your friends.');
}
async function heistExit() {
  const f = G.flags;
  if (!hasItem('sunset_opal')) { const c = await choose(null, 'The cellar grate. Leave the vaults empty-handed?', ['Leave', 'Stay'], 1); if (c !== 0) return; await changeMap('mirage', HEIST_GATE.x, HEIST_GATE.y + 1, 'down'); return; }
  f.heist_out = true;
  await changeMap('mirage', HEIST_GATE.x, HEIST_GATE.y + 1, 'down');
  Audio_.sfx('chest');
  await sayAll(inParty('kestrel') ? [[KE, 'In, out, not a single shout. Mags is going to cry.'], [OS, 'I would like it noted that I was against this.'], [KE, 'Noted, Father. Duly noted.']] : [['', 'You slip out through the cellar grate with the Sunset Opal under your coat.']]);
  await narrate('Bring the Sunset Opal to Mags in the Undermarket.');
}
// the grate into the palace cellars, in Mirage (shown at night once Mags has asked)
const HEIST_GATE = { x: 16, y: 6 };
function heistTownEntities(m) {
  const f = G.flags;
  if (m.id !== 'mirage' || !f.q_heist || f.heist_done) return [];
  return [{ kind: 'hatch', x: HEIST_GATE.x, y: HEIST_GATE.y, talk: async () => {
    if (!isNight()) { await narrate('A grate into the palace cellars, right under a guard tower. Not in broad daylight. Come back after dark.'); return; }
    if (hasItem('sunset_opal')) { await narrate('You already have the Opal. Take it to Mags.'); return; }
    const c = await choose(null, 'The cellar grate is loose. Slip into the palace vaults?', ['Go in', 'Not yet'], 1);
    if (c !== 0) return;
    await changeMap('heist', 1, 2, 'down');
    if (!f.heist_seen) { f.heist_seen = true; await sayAll([[KE, 'Four guards. Each one sees four steps ahead, wider the farther it goes. Walls and pillars block them.'], [KE, 'The vault is in the far corner. Grab the opal, come back to this grate. Don\'t get seen. Easy.'], [A, 'You said "easy" about the Undercity too.']]); toast('Red squares: what the guards can see'); }
  } }];
}
async function heistStart() {
  await sayAll([
    ['Mags', 'Kes. A job, for old times. The Sultana\'s vault holds the Sunset Opal. The Guild\'s, a hundred years ago, before a sultan "borrowed" it.'],
    [KE, 'You want me to rob a palace. With a priest in tow.'],
    ['Mags', 'I want you to return stolen property to its rightful thieves. There\'s a loose cellar grate east of the palace in Mirage. Only at night.'],
    [OS, 'I am going to pretend I did not hear any of this.']
  ]);
  G.flags.q_heist = true; toast('New quest: The Sunset Opal');
  await narrate('Go to Mirage at night and find the loose cellar grate east of the palace.');
}
async function heistTurnIn() {
  await sayAll([['Mags', 'Is that... it IS. Look at it. A century of Guild members cried over a painting of this rock.'], ['Mags', 'Take this. The Guild\'s finest cloak. Nobody\'s worn it since Vane got fat.']]);
  addItem('sunset_opal', -1); addItem('night_cloak'); G.flags.heist_done = true; Audio_.sfx('chest');
  await narrate('Received the Night Cloak! (Accessory: ATK +10, SPD +16, prevents blind and stop)');
}
function heistQuests() {
  const f = G.flags; if (!f.q_heist) return [];
  return [{ title: 'The Sunset Opal', giver: 'Mags, the Undermarket', done: !!f.heist_done, reward: 'Night Cloak', desc: f.heist_done ? 'The Opal is back with the Guild, and the palace never noticed.' : hasItem('sunset_opal') ? 'Bring the Sunset Opal to Mags in the Undermarket.' : 'At night, slip through the cellar grate east of the Mirage palace and steal the Sunset Opal without being seen.' + (f.heist_caught ? ` (caught ${f.heist_caught}×)` : '') }];
}

// ---------------- drawing ----------------
function drawHeistTile(g, m, x, y, px, py, t) {
  const c = m.at(x, y);
  if (c === 'E' || c === 'V') { const save = m.tiles[y][x]; m.tiles[y][x] = '.'; drawDungeonTile(g, m, x, y, px, py, t); m.tiles[y][x] = save; }
  else drawDungeonTile(g, m, x, y, px, py, t);
  if (c === 'E') { rrect(g, px + 5, py + 6, 22, 20, 2, '#2a2420', OUT, 1.2); for (let i = 1; i < 4; i++) line(g, px + 5 + i * 5.5, py + 6, px + 5 + i * 5.5, py + 26, '#6a6050', 1.5); }
  if (c === 'V') { g.save(); g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3); circle(g, px + 16, py + 16, 18, '#ff9a5a'); g.restore(); }
}
// the guards' sight, drawn as red squares; plus the vault's gloom
function drawHeistSight(g, m, cx, cy, t) {
  const gr = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 420); gr.addColorStop(0, 'rgba(10,8,30,.25)'); gr.addColorStop(1, 'rgba(10,8,30,.7)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const a = 0.22 + 0.06 * Math.sin(t * 6);
  for (const e of m.entities) if (e.kind === 'guard') for (const [x, y] of guardSight(m, e)) { g.fillStyle = `rgba(255,60,60,${a})`; g.fillRect(x * TS - cx + 1, y * TS - cy + 1, TS - 2, TS - 2); }
}
