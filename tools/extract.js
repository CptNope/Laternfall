// Loads src/data.js (plus DUNGEONS and WORLD_LOC from src/maps.js) in a sandbox and prints the game data as JSON.
// Used by tools/gentables.py. Usage: node tools/extract.js > data.json
const fs = require('fs'), vm = require('vm');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, '..', 'src', p), 'utf8');
const ctx = { console, Math };
vm.createContext(ctx);
vm.runInContext(src('data.js') + '\n;this.D={HEROES,SPELLS,ITEMS,MONSTERS,ENCOUNTERS,SHOPS,COMBOS,ARENA_CUPS,RECIPES,FISH,FISH_SPOTS,LIMITS,MAX_LEVEL,xpForLevel,MEALS,MEAL_BATTLES,BOARD_NODES,BOARD_HERO,BOARD_STATS,PASSIVES,STATUS_TURNS};', ctx);
const maps = src('maps.js');
const grab = name => { const i = maps.indexOf('const ' + name); let d = 0, j = maps.indexOf('{', i); const s = j; for (; j < maps.length; j++) { if (maps[j] === '{') d++; if (maps[j] === '}' && --d === 0) break; } return maps.slice(s, j + 1); };
vm.runInContext('this.WL=' + grab('WORLD_LOC') + ';this.DG=' + grab('DUNGEONS') + ';', ctx);
process.stdout.write(JSON.stringify({ ...ctx.D, xp: Array.from({ length: ctx.D.MAX_LEVEL }, (_, i) => ctx.D.xpForLevel(i + 1)), WORLD_LOC: ctx.WL, DUNGEONS: ctx.DG }));
