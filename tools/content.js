'use strict';
// Lanternfall's content files (content/*.json, 2.0 EN-1): load them, check them, report problems.
//
//   node tools/content.js                       check content/ and print every problem (exit 1 if any)
//   node tools/content.js --mod mods/x [--mod …]  the same, with mods merged in (2.0, EN-4)
//   node tools/content.js --mod mods/x --emit f   …and write the merged tables to f (build.py uses this)
//   node tools/content.js --selftest              plant known mistakes and confirm each one is caught
//
// build.py runs the check before it builds; tools/extract.js uses load() for the guide tables.
// Checks, in order:
//  1. each file against its JSON Schema in content/schema/ (a small validator for the parts of
//     JSON Schema 2020-12 those files use; no packages needed);
//  2. references: every item, monster, move, hero, art family, shop and encounter table that
//     one piece of content names must exist, including those named in src/ (startBattle,
//     addItem, a town's shop, a dungeon's enc) and in data.js (recipes, treasures, the arena).
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
let MOD_SRC = [];   // .js files of the mods being checked (they can add monster families)
const FILES = { items: 'items.json', monsters: 'monsters.json', shops: 'shops.json', encounters: 'encounters.json', towns: 'towns.json' };

// ---------- loading ----------
const isComment = k => k.startsWith('//');
const strip = o => Object.fromEntries(Object.entries(o).filter(([k]) => !isComment(k)));
function readFiles(dir = path.join(ROOT, 'content')) {
  const raw = {};
  for (const [k, f] of Object.entries(FILES)) {
    const p = path.join(dir, f);
    try { raw[k] = JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch (e) { throw new Error(`content/${f}: ${e.message}`); }
  }
  return raw;
}
// ---------- mods (2.0, EN-4) ----------
// A mod is a folder: mod.json, optional content/*.json patches, optional src/*.js.
// Patches merge into the base, in the order the mods are given:
//  - items, monsters, towns: a new id is added at the end; an existing one is patched field by field
//    ({"hp": 30} changes only hp); null removes it.
//  - shops, encounter tables: a list replaces the whole list; {"add": [...], "remove": [...]}
//    edits it (remove takes item ids, or for encounters the index of a group); null removes it.
const MOD_FIELDS = { items: ['items'], monsters: ['monsters'], shops: ['shops'], encounters: ['day', 'night'], towns: ['towns'] };
function readMod(dir) {
  const id = path.basename(path.resolve(dir));
  const at = `mods/${id}`;
  let info;
  try { info = JSON.parse(fs.readFileSync(path.join(dir, 'mod.json'), 'utf8')); }
  catch (e) { throw new Error(`${at}/mod.json: ${e.code === 'ENOENT' ? 'missing (every mod needs one)' : e.message}`); }
  const errs = [], sch = schemaFile('mod.schema.json');
  validate(info, sch, `${at}/mod.json`, sch, errs);
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) errs.push(`${at}: a mod's folder name is its id: lower case letters, digits, - and _`);
  const patches = {}, cdir = path.join(dir, 'content');
  if (fs.existsSync(cdir)) for (const f of fs.readdirSync(cdir)) {
    const k = f.replace(/\.json$/, '');
    if (!f.endsWith('.json') || !MOD_FIELDS[k]) { errs.push(`${at}/content/${f}: not a content file (use ${Object.values(FILES).join(', ')})`); continue; }
    try { patches[k] = JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8')); } catch (e) { errs.push(`${at}/content/${f}: ${e.message}`); continue; }
    for (const top of Object.keys(patches[k])) if (top !== '$schema' && !MOD_FIELDS[k].includes(top)) errs.push(`${at}/content/${f}: unknown section "${top}" (use ${MOD_FIELDS[k].join(', ')})`);
  }
  const sdir = path.join(dir, 'src');
  const src = fs.existsSync(sdir) ? fs.readdirSync(sdir).filter(f => f.endsWith('.js')).sort().map(f => path.join(sdir, f)) : [];
  return { id, at, info, patches, src, errs };
}
function mergeMod(raw, mod, origin) {
  const note = (k, t, id) => { origin[`${k}.${t}.${id}`] = mod.id; };
  for (const [k, p] of Object.entries(mod.patches)) for (const t of MOD_FIELDS[k]) {
    if (!p[t]) continue;
    const base = raw[k][t];
    for (const [id, v] of Object.entries(p[t])) {
      if (isComment(id)) continue;
      note(k, t, id);
      if (v === null) { if (!(id in base)) mod.errs.push(`${mod.at}/content/${k}.json: ${t}.${id}: can't remove "${id}", it doesn't exist`); delete base[id]; continue; }
      if (k === 'items' || k === 'monsters' || k === 'towns') {
        if (id in base && typeof v === 'object' && !Array.isArray(v)) base[id] = { ...base[id], ...v };
        else base[id] = v;
      } else if (Array.isArray(v)) base[id] = v;
      else if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(x => x === 'add' || x === 'remove')) {
        if (!(id in base)) { mod.errs.push(`${mod.at}/content/${k}.json: ${t}.${id}: can't edit "${id}", it doesn't exist (give a list to create it)`); continue; }
        let list = base[id].slice();
        for (const r of v.remove || []) {
          if (k === 'encounters') { if (!Number.isInteger(r) || !list[r]) mod.errs.push(`${mod.at}/content/${k}.json: ${t}.${id}.remove: ${JSON.stringify(r)} isn't a group number (0–${list.length - 1})`); }
          else if (!list.includes(r)) mod.errs.push(`${mod.at}/content/${k}.json: ${t}.${id}.remove: "${r}" isn't in the list`);
        }
        if (k === 'encounters') { const drop = new Set(v.remove || []); list = list.filter((_, i) => !drop.has(i)); } else list = list.filter(x => !(v.remove || []).includes(x));
        base[id] = list.concat(v.add || []);
      } else mod.errs.push(`${mod.at}/content/${k}.json: ${t}.${id}: give a list, {"add": [...], "remove": [...]}, or null`);
    }
  }
}
// Base content with mods merged in. Returns the raw files, the mods, and which mod touched what.
function readWithMods(dirs = []) {
  const raw = readFiles(), mods = dirs.map(readMod), origin = {};
  for (const m of mods) mergeMod(raw, m, origin);
  return { raw, mods, origin };
}

// The tables the game uses, under the names it uses
function tables(raw) {
  return { ITEMS: strip(raw.items.items), MONSTERS: strip(raw.monsters.monsters), SHOPS: strip(raw.shops.shops),
    ENCOUNTERS: strip(raw.encounters.day), NIGHT_ENC: strip(raw.encounters.night), TOWN_DEFS: strip(raw.towns.towns) };
}
const load = dir => tables(readFiles(dir));

// ---------- JSON Schema (the subset content/schema uses) ----------
const schemas = {};
function schemaFile(name) {
  if (!schemas[name]) schemas[name] = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'schema', name), 'utf8'));
  return schemas[name];
}
function resolve(ref, base) {
  const [file, frag = ''] = ref.split('#');
  const doc = file ? schemaFile(file) : base;
  let s = doc;
  for (const part of frag.split('/').filter(Boolean)) s = s[part];
  if (!s) throw new Error('schema reference not found: ' + ref);
  return { s, doc };
}
const typeOf = v => Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v;
const show = v => JSON.stringify(v).slice(0, 60);
function validate(v, s, at, doc, errs) {
  if (s.$ref) { const r = resolve(s.$ref, doc); validate(v, r.s, at, r.doc, errs); }
  const before = errs.length;
  if (s.type) {
    const t = typeOf(v), ok = [].concat(s.type).some(x => x === t || (x === 'number' && t === 'integer'));
    if (!ok) { errs.push(`${at}: should be ${[].concat(s.type).join(' or ')}, not ${show(v)}`); return; }
  }
  if ('const' in s && JSON.stringify(v) !== JSON.stringify(s.const)) errs.push(`${at}: should be ${show(s.const)}, not ${show(v)}`);
  if (s.enum && !s.enum.some(e => JSON.stringify(e) === JSON.stringify(v))) errs.push(`${at}: ${show(v)} isn't one of ${s.enum.join(', ')}`);
  if (typeof v === 'number') {
    if (s.minimum !== undefined && v < s.minimum) errs.push(`${at}: ${v} is below ${s.minimum}`);
    if (s.maximum !== undefined && v > s.maximum) errs.push(`${at}: ${v} is above ${s.maximum}`);
    if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) errs.push(`${at}: ${v} should be above ${s.exclusiveMinimum}`);
    if (s.exclusiveMaximum !== undefined && v >= s.exclusiveMaximum) errs.push(`${at}: ${v} should be below ${s.exclusiveMaximum}`);
  }
  if (typeof v === 'string') {
    if (s.minLength !== undefined && v.length < s.minLength) errs.push(`${at}: too short`);
    if (s.maxLength !== undefined && v.length > s.maxLength) errs.push(`${at}: ${show(v)} is longer than ${s.maxLength} characters`);
    if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${at}: ${show(v)} doesn't match ${s.pattern}`);
  }
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) errs.push(`${at}: needs at least ${s.minItems} entries`);
    if (s.maxItems !== undefined && v.length > s.maxItems) errs.push(`${at}: has more than ${s.maxItems} entries`);
    if (s.uniqueItems && new Set(v.map(x => JSON.stringify(x))).size !== v.length) errs.push(`${at}: has a duplicate`);
    const pre = s.prefixItems || [];
    v.forEach((x, i) => { const sub = pre[i] || s.items; if (sub) validate(x, sub, `${at}[${i}]`, doc, errs); });
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const k of s.required || []) if (!(k in v)) errs.push(`${at}: missing "${k}"`);
    for (const [k, x] of Object.entries(v)) {
      let matched = false;
      if (s.properties && k in s.properties) { matched = true; validate(x, s.properties[k], `${at}.${k}`, doc, errs); }
      for (const [re, sub] of Object.entries(s.patternProperties || {})) if (new RegExp(re).test(k)) { matched = true; validate(x, sub, `${at}.${k}`, doc, errs); }
      if (!matched && s.additionalProperties === false) errs.push(`${at}: unknown field "${k}"`);
      else if (!matched && typeof s.additionalProperties === 'object') validate(x, s.additionalProperties, `${at}.${k}`, doc, errs);
    }
  }
  for (const sub of s.allOf || []) {
    if (sub.if) { const probe = []; validate(v, sub.if, at, doc, probe); if (!probe.length && sub.then) validate(v, sub.then, at, doc, errs); }
    else validate(v, sub, at, doc, errs);
  }
  return errs.length === before;
}

// ---------- references ----------
// data.js runs with the content tables defined first, the way the game loads them
function gameData(T) {
  const ctx = { console, Math, ...T };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'data.js'), 'utf8') +
    '\n;this.D = { HEROES, SPELLS, RECIPES, TREASURES, FISH, FISH_SPOTS, MEALS, ARENA_CUPS, BLACKMARKET_PRICES };', ctx);
  return ctx.D;
}
function srcFiles() {
  const out = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) out.push(p); } };
  walk(path.join(ROOT, 'src'));
  return out;
}
function references(T, errs) {
  const D = gameData(T), { ITEMS, MONSTERS, SHOPS, ENCOUNTERS, NIGHT_ENC } = T;
  const code = srcFiles().concat(MOD_SRC).map(f => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]);
  const families = new Set();
  for (const [f, s] of code) for (const m of s.matchAll(/MONSTER_ART\.(\w+) = /g)) families.add(m[1]);
  const item = (id, at) => { if (!(id in ITEMS)) errs.push(`${at}: "${id}" isn't an item in content/items.json`); };
  const monster = (id, at) => { if (!(id in MONSTERS)) errs.push(`${at}: "${id}" isn't a monster in content/monsters.json`); };
  const move = (a, at) => { if (a !== 'attack' && !(a in D.SPELLS)) errs.push(`${at}: "${a}" isn't "attack" or a move in SPELLS (src/data.js)`); };

  for (const [id, it] of Object.entries(ITEMS))
    for (const h of it.who || []) if (!(h in D.HEROES)) errs.push(`items.json: items.${id}.who: "${h}" isn't a hero`);
  for (const [id, m] of Object.entries(MONSTERS)) {
    const at = `monsters.json: monsters.${id}`;
    if (!families.has(m.fam)) errs.push(`${at}.fam: no drawing for "${m.fam}" (add src/monsters/${m.fam}.js)`);
    for (const k of ['drop', 'rare']) if (m[k]) item(m[k][0], `${at}.${k}`);
    if (m.mat) { item(m.mat[0], `${at}.mat`); if (ITEMS[m.mat[0]] && ITEMS[m.mat[0]].kind !== 'mat') errs.push(`${at}.mat: "${m.mat[0]}" isn't a forging material (kind "mat")`); }
    item(m.steal, `${at}.steal`);
    (m.acts || []).forEach((a, i) => move(a.a, `${at}.acts[${i}]`));
    (m.phases || []).forEach((p, i) => (p.acts || []).forEach((a, j) => move(a.a, `${at}.phases[${i}].acts[${j}]`)));
    if (m.phases && !m.boss) errs.push(`${at}.phases: only bosses have phases`);
  }
  for (const [id, list] of Object.entries(SHOPS)) list.forEach((x, i) => item(x, `shops.json: shops.${id}[${i}]`));
  for (const [name, T2] of [['day', ENCOUNTERS], ['night', NIGHT_ENC]])
    for (const [id, groups] of Object.entries(T2)) groups.forEach((g, i) => g.g.forEach((x, j) => monster(x, `encounters.json: ${name}.${id}[${i}].g[${j}]`)));
  for (const id of Object.keys(NIGHT_ENC)) if (!(id in ENCOUNTERS)) errs.push(`encounters.json: night.${id}: no day table "${id}" (night tables replace half of a day table's battles)`);

  // towns: shops exist, the music exists, building ids are unique
  const core = fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8'), tracks = core.slice(core.indexOf('const TRACKS = {'));
  for (const [id, t] of Object.entries(T.TOWN_DEFS)) {
    const at = `towns.json: towns.${id}`;
    if (!new RegExp(`\\n  ${t.music}: `).test(tracks)) errs.push(`${at}.music: "${t.music}" isn't a track in TRACKS (src/core.js)`);
    const seen = new Set();
    t.buildings.forEach((b, i) => {
      if (seen.has(b.id)) errs.push(`${at}.buildings[${i}].id: "${b.id}" is used twice in this town`); seen.add(b.id);
      if (b.shop && !(b.shop in SHOPS)) errs.push(`${at}.buildings[${i}].shop: "${b.shop}" isn't a shop in content/shops.json`);
    });
  }

  // what data.js names
  D.RECIPES.forEach((r, i) => { item(r.out, `data.js RECIPES[${i}].out`); for (const m of Object.keys(r.mats)) item(m, `data.js RECIPES[${i}].mats`); });
  for (const [n, t] of Object.entries(D.TREASURES)) for (const l of t.loot) if (!l.startsWith('gold:')) item(l, `data.js TREASURES[${n}].loot`);
  for (const f of Object.keys(D.FISH)) item(f, 'data.js FISH');
  for (const [spot, list] of Object.entries(D.FISH_SPOTS)) for (const x of list) if (!(x.f in D.FISH)) errs.push(`data.js FISH_SPOTS.${spot}: "${x.f}" isn't in FISH`);
  for (const [id, m] of Object.entries(D.MEALS)) for (const x of Object.keys(m.needs)) item(x, `data.js MEALS.${id}.needs`);
  D.ARENA_CUPS.forEach(c => { c.rounds.flat().forEach(x => monster(x, `data.js ARENA_CUPS ${c.id}`)); if (c.prize) item(c.prize, `data.js ARENA_CUPS ${c.id}.prize`); });
  for (const x of Object.keys(D.BLACKMARKET_PRICES)) item(x, 'data.js BLACKMARKET_PRICES');

  // what the rest of src/ names: towns' shops, dungeons' encounter tables, battles and items in scripts
  for (const [f, s] of code) {
    const line = i => s.slice(0, i).split('\n').length;
    for (const m of s.matchAll(/\bshop: '(\w+)'/g)) if (!(m[1] in SHOPS)) errs.push(`${f}:${line(m.index)}: shop "${m[1]}" isn't in content/shops.json`);
    for (const m of s.matchAll(/\benc: '(\w+)'/g)) if (!(m[1] in ENCOUNTERS)) errs.push(`${f}:${line(m.index)}: encounter table "${m[1]}" isn't in content/encounters.json`);
    for (const m of s.matchAll(/startBattle\(\[([^\]]*)\]/g)) for (const x of m[1].matchAll(/'(\w+)'/g)) monster(x[1], `${f}:${line(m.index)}: startBattle`);
    for (const m of s.matchAll(/\b(?:addItem|hasItem|removeItem)\('(\w+)'\s*[,)]/g)) item(m[1], `${f}:${line(m.index)}`);   // a whole id, not 'tmap' + k
  }
}

// ---------- check ----------
function check(raw, mods = [], origin = {}) {
  const errs = mods.flatMap(m => m.errs);
  MOD_SRC = mods.flatMap(m => m.src);
  for (const [k, f] of Object.entries(FILES)) { const sch = schemaFile(f.replace('.json', '.schema.json')); validate(raw[k], sch, f, sch, errs); }
  if (errs.length === mods.reduce((n, m) => n + m.errs.length, 0)) references(tables(raw), errs);   // references assume the shapes are right
  // say which mod brought in an entry that has a problem
  return errs.map(e => {
    const m = /^(\w+)\.json: (\w+)\.(\w+)/.exec(e), who = m && origin[`${m[1]}.${m[2]}.${m[3]}`];
    return who ? `${e}  (from mod "${who}")` : e;
  });
}

function selftest() {
  const base = readFiles();
  const cases = [
    ['a misspelt drop', r => { r.monsters.monsters.slime.drop = ['potoin', 0.1]; }, /"potoin" isn't an item/],
    ['an unknown field', r => { r.items.items.potion.heals = 60; }, /unknown field "heals"/],
    ['a wrong type', r => { r.monsters.monsters.bat.hp = '18'; }, /monsters\.bat\.hp: should be integer/],
    ['a missing field', r => { delete r.items.items.potion.price; }, /items\.potion: missing "price"/],
    ['a weapon with no wielder', r => { delete r.items.items.bronze_sword.who; }, /bronze_sword: missing "who"/],
    ['a bad colour', r => { r.monsters.monsters.slime.c[0] = 'green'; }, /doesn't match/],
    ['a move that doesn\'t exist', r => { r.monsters.monsters.sporecap.acts[1].a = 'e_sporez'; }, /"e_sporez" isn't "attack" or a move/],
    ['a family with no drawing', r => { r.monsters.monsters.slime.fam = 'blob'; }, /no drawing for "blob"/],
    ['a shop selling nothing real', r => { r.shops.shops.brightwater_items.push('potion2'); }, /shops\.brightwater_items\[4\]: "potion2"/],
    ['an encounter with a typo', r => { r.encounters.day.r1[0].g[0] = 'slim'; }, /"slim" isn't a monster/],
    ['a night table with no day table', r => { r.encounters.night.r9 = [{ w: 1, g: ['slime'] }]; }, /night\.r9: no day table/],
    ['a removed item still in a recipe', r => { delete r.items.items.forge_ring; }, /RECIPES\[0\]\.out: "forge_ring"/],
    ['a removed shop a town uses', r => { delete r.shops.shops.halden_items; }, /"halden_items" isn't a shop/],
    ['a removed monster a script fights', r => { delete r.monsters.monsters.crown; }, /startBattle: "crown" isn't a monster/],
    ['a bad id', r => { r.items.items['Big Potion'] = r.items.items.potion; }, /unknown field "Big Potion"/],
    ['a town shop that sells from a list that doesn\'t exist', r => { r.towns.towns.brightwater.buildings[3].shop = 'brightwater_itemz'; }, /buildings\[3\]\.shop: "brightwater_itemz" isn't a shop/],
    ['a town with music that doesn\'t exist', r => { r.towns.towns.halden.music = 'harbour'; }, /halden\.music: "harbour" isn't a track/],
  ];
  let bad = 0;
  if (check(base).length) { console.log('FAIL the real content has problems: run node tools/content.js'); return 1; }
  for (const [what, mutate, expect] of cases) {
    const r = JSON.parse(JSON.stringify(base)); mutate(r);
    const errs = check(r), ok = errs.some(e => expect.test(e));
    console.log((ok ? 'ok   ' : 'FAIL ') + 'catches ' + what + (ok ? '' : ': got ' + JSON.stringify(errs.slice(0, 3))));
    if (!ok) bad++;
  }
  // mods: build a throwaway mod folder for each case
  const os = require('os');
  const modCases = [
    ['a mod adding a monster with a misspelt drop', { 'content/monsters.json': { monsters: { foxling: { ...base.monsters.monsters.wolf, name: 'Foxling', drop: ['ehter', 0.1] } } } }, /monsters\.foxling\.drop: "ehter" isn't an item.*from mod "t"/],
    ['a mod removing an item a shop still sells', { 'content/items.json': { items: { potion: null } } }, /"potion" isn't an item/],
    ['a mod editing a shop that doesn\'t exist', { 'content/shops.json': { shops: { nowhere: { add: ['potion'] } } } }, /can't edit "nowhere"/],
    ['a mod removing an encounter group that isn\'t there', { 'content/encounters.json': { day: { r1: { remove: [40] } } } }, /isn't a group number/],
    ['a mod with a misnamed content file', { 'content/item.json': { items: {} } }, /content\/item\.json: not a content file/],
    ['a mod without a version', { 'mod.json': { name: 'T' } }, /mod\.json: missing "version"/],
    ['a mod moving a town\'s shop to a list that doesn\'t exist', { 'content/towns.json': { towns: { brightwater: { buildings: [{ x: 2, y: 10, w: 5, h: 4, kind: 'shop', roof: '#3a8a4a', id: 'items', shop: 'nowhere' }] } } } }, /shop: "nowhere" isn't a shop.*from mod "t"/],
  ];
  for (const [what, files, expect] of modCases) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfmod-')), md = path.join(dir, 't');
    fs.mkdirSync(path.join(md, 'content'), { recursive: true });
    const all = { 'mod.json': { name: 'Test', version: '1.0.0' }, ...files };
    for (const [f, v] of Object.entries(all)) fs.writeFileSync(path.join(md, f), JSON.stringify(v));
    let errs;
    try { const { raw, mods, origin } = readWithMods([md]); errs = check(raw, mods, origin); } catch (e) { errs = [e.message]; }
    const ok = errs.some(e => expect.test(e));
    console.log((ok ? 'ok   ' : 'FAIL ') + 'catches ' + what + (ok ? '' : ': got ' + JSON.stringify(errs.slice(0, 3))));
    if (!ok) bad++;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // and a good mod merges: add, patch, shop and encounter edits
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lfmod-')), md = path.join(dir, 'good');
    fs.mkdirSync(path.join(md, 'content'), { recursive: true });
    fs.writeFileSync(path.join(md, 'mod.json'), JSON.stringify({ name: 'Good', version: '1.0.0' }));
    fs.writeFileSync(path.join(md, 'content', 'items.json'), JSON.stringify({ items: { tonic: { name: 'Tonic', price: 10, kind: 'use', effect: 'hp', amount: 20, target: 'ally', desc: 'A little.' } } }));
    fs.writeFileSync(path.join(md, 'content', 'monsters.json'), JSON.stringify({ monsters: { slime: { hp: 30 } } }));
    fs.writeFileSync(path.join(md, 'content', 'shops.json'), JSON.stringify({ shops: { brightwater_items: { add: ['tonic'], remove: ['tent'] } } }));
    fs.writeFileSync(path.join(md, 'content', 'encounters.json'), JSON.stringify({ day: { r1: { add: [{ w: 1, g: ['bat'] }], remove: [0] } } }));
    const { raw, mods, origin } = readWithMods([md]), errs = check(raw, mods, origin), T = tables(raw), B = load();
    const ok = !errs.length && T.ITEMS.tonic && T.MONSTERS.slime.hp === 30 && T.MONSTERS.slime.atk === B.MONSTERS.slime.atk &&
      T.SHOPS.brightwater_items.join() === 'potion,antidote,plume,tonic' && T.ENCOUNTERS.r1.length === B.ENCOUNTERS.r1.length &&
      JSON.stringify(T.ENCOUNTERS.r1[0]) === JSON.stringify(B.ENCOUNTERS.r1[1]) && Object.keys(T.ITEMS).pop() === 'tonic';
    console.log((ok ? 'ok   ' : 'FAIL ') + 'merges a good mod (a new item, a one-field patch, shop and encounter edits)' + (ok ? '' : ': ' + JSON.stringify(errs.slice(0, 3))));
    if (!ok) bad++;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const total = cases.length + modCases.length + 1;
  console.log(bad ? `${bad} self-test case(s) failed` : `content self-test: all ${total} cases pass`);
  return bad ? 1 : 0;
}

if (require.main === module) {
  if (process.argv.includes('--selftest')) process.exit(selftest());
  const argv = process.argv.slice(2), dirs = [], emit = argv.includes('--emit') ? argv[argv.indexOf('--emit') + 1] : null;
  argv.forEach((a, i) => { if (a === '--mod') dirs.push(argv[i + 1]); });
  let errs, got;
  try { got = readWithMods(dirs); errs = check(got.raw, got.mods, got.origin); } catch (e) { errs = [e.message]; }
  if (errs.length) { console.error(`content: ${errs.length} problem(s)\n  ` + errs.join('\n  ')); process.exit(1); }
  const T = tables(got.raw);
  const mods = got.mods.map(m => ({ id: m.id, name: m.info.name, version: m.info.version }));
  if (emit) fs.writeFileSync(emit, JSON.stringify({ tables: T, mods, src: got.mods.flatMap(m => m.src.map(f => path.resolve(f))) }));
  console.log(`content: ${Object.keys(T.ITEMS).length} items, ${Object.keys(T.MONSTERS).length} monsters, ${Object.keys(T.SHOPS).length} shops, ${Object.keys(T.ENCOUNTERS).length}+${Object.keys(T.NIGHT_ENC).length} encounter tables check out` + (mods.length ? `, with ${mods.map(m => m.name + ' ' + m.version).join(', ')}` : ''));
}
module.exports = { load, readFiles, readWithMods, tables, check, validate };
