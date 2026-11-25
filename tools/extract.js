// Loads content/*.json and src/data.js (plus DUNGEONS and WORLD_LOC from src/maps.js) in a sandbox and prints the game data as JSON.
// Used by tools/gentables.py. Usage: node tools/extract.js > data.json
const fs = require('fs'), vm = require('vm');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
// content/*.json first (items, monsters, shops, encounters), the way the game loads them
const ctx = { console, Math, ...require('./content.js').load() };
vm.createContext(ctx);
vm.runInContext(src('data.js') + '\n;this.D={HEROES,SPELLS,ITEMS,MONSTERS,ENCOUNTERS,SHOPS,COMBOS,ARENA_CUPS,RECIPES,FISH,FISH_SPOTS,LIMITS,MAX_LEVEL,xpForLevel,MEALS,MEAL_BATTLES,BOARD_NODES,BOARD_HERO,BOARD_STATS,PASSIVES,STATUS_TURNS,TREASURES,BLACKMARKET_PRICES,BLACKMARKET_MARKUP,NIGHT_ENC};', ctx);
const maps = src('maps.js');
const grab = name => { const i = maps.indexOf('const ' + name); let d = 0, j = maps.indexOf('{', i); const s = j; for (; j < maps.length; j++) { if (maps[j] === '{') d++; if (maps[j] === '}' && --d === 0) break; } return maps.slice(s, j + 1); };
vm.runInContext('this.WL=' + grab('WORLD_LOC') + ';this.DG=' + grab('DUNGEONS') + ';', ctx);
// trophies live in platform.js beside browser code, so read their names with a pattern instead of running the file
const unq = s => s && s.replace(/\\'/g, "'");
const TROPHIES = [...src('platform.js').matchAll(/\{ id: '([^']+)', name: '((?:[^'\\]|\\.)*)', desc: '((?:[^'\\]|\\.)*)'(?:, secret: '((?:[^'\\]|\\.)*)')?/g)].map(m => ({ id: m[1], name: unq(m[2]), desc: unq(m[3]), secret: unq(m[4]) }));
// Lanterns & Lies cards and players live in cards.js: read them with patterns too
const cardsSrc = src('cards.js');
const CARDS = [...cardsSrc.matchAll(/(\w+): \{ v: (\d), f: '(\w+)', (m|h): '(\w+)' \}/g)].map(m => ({ id: m[1], v: +m[2], f: m[3], kind: m[4], who: m[5] }));
const FOES = [...cardsSrc.matchAll(/(\w+): \{ name: '((?:[^'\\]|\\.)*)', town: '(\w+)', when: '(\w+)'.*?deck: \[([^\]]*)\], skill: ([\d.]+)/g)].map(m => ({ id: m[1], name: unq(m[2]), town: m[3], when: m[4], deck: m[5].match(/'(\w+)'/g).map(x => x.slice(1, -1)), skill: +m[6] }));
process.stdout.write(JSON.stringify({ ...ctx.D, TROPHIES, CARDS, FOES, xp: Array.from({ length: ctx.D.MAX_LEVEL }, (_, i) => ctx.D.xpForLevel(i + 1)), WORLD_LOC: ctx.WL, DUNGEONS: ctx.DG }));
