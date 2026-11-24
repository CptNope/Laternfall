// Loads src/data.js (plus DUNGEONS and WORLD_LOC from src/maps.js) in a sandbox and prints the game data as JSON.
// Used by tools/gentables.py. Usage: node tools/extract.js > data.json
const fs = require('fs'), vm = require('vm');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
const ctx = { console, Math };
vm.createContext(ctx);
vm.runInContext(src('data.js') + '\n;this.D={HEROES,SPELLS,ITEMS,MONSTERS,ENCOUNTERS,SHOPS,COMBOS,ARENA_CUPS,RECIPES,FISH,FISH_SPOTS,LIMITS,MAX_LEVEL,xpForLevel,MEALS,MEAL_BATTLES,BOARD_NODES,BOARD_HERO,BOARD_STATS,PASSIVES,STATUS_TURNS,TREASURES,BLACKMARKET_PRICES,BLACKMARKET_MARKUP};', ctx);
const maps = src('maps.js');
const grab = name => { const i = maps.indexOf('const ' + name); let d = 0, j = maps.indexOf('{', i); const s = j; for (; j < maps.length; j++) { if (maps[j] === '{') d++; if (maps[j] === '}' && --d === 0) break; } return maps.slice(s, j + 1); };
vm.runInContext('this.WL=' + grab('WORLD_LOC') + ';this.DG=' + grab('DUNGEONS') + ';', ctx);
// trophies live in platform.js beside browser code, so read their names with a pattern instead of running the file
const unq = s => s && s.replace(/\\'/g, "'");
const TROPHIES = [...src('platform.js').matchAll(/\{ id: '([^']+)', name: '((?:[^'\\]|\\.)*)', desc: '((?:[^'\\]|\\.)*)'(?:, secret: '((?:[^'\\]|\\.)*)')?/g)].map(m => ({ id: m[1], name: unq(m[2]), desc: unq(m[3]), secret: unq(m[4]) }));
process.stdout.write(JSON.stringify({ ...ctx.D, TROPHIES, xp: Array.from({ length: ctx.D.MAX_LEVEL }, (_, i) => ctx.D.xpForLevel(i + 1)), WORLD_LOC: ctx.WL, DUNGEONS: ctx.DG }));
