'use strict';
// Lanternfall's text, for translators (2.0, EN-6).
//
//   node tools/strings.js            write content/lang/template.json: every line to translate
//   node tools/strings.js --check    check content/lang/*.json (and --mod DIR's lang/): placeholders
//                                    match the English, and say which lines are stale or missing
//
// A line is a tl('…') or tl`…${x}…` in src/ (a value becomes {0}, {1}, …, exactly as tl() makes
// its key at runtime), or a name or description in content/*.json. build.py runs --check; CI
// checks the template is up to date, like the game guide.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), LANG_DIR = path.join(ROOT, 'content', 'lang');

// ---------- every line in src/ ----------
// a small scanner: skips comments and strings, and finds tl( and tl` in code
function linesIn(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  const skipString = (q) => { let j = i + 1; while (j < n && src[j] !== q) j += src[j] === '\\' ? 2 : 1; return j + 1; };
  const skipTemplate = () => {
    let j = i + 1, depth = 0;
    while (j < n) {
      if (src[j] === '\\') { j += 2; continue; }
      if (depth === 0 && src[j] === '`') break;
      if (src.startsWith('${', j)) { depth++; j += 2; continue; }
      if (depth && src[j] === '}') { depth--; j++; continue; }
      if (depth && (src[j] === "'" || src[j] === '"')) { const q = src[j]; j++; while (j < n && src[j] !== q) j += src[j] === '\\' ? 2 : 1; j++; continue; }
      if (depth && src[j] === '`') { j++; while (j < n && src[j] !== '`') j += src[j] === '\\' ? 2 : 1; j++; continue; }
      j++;
    }
    return j + 1;
  };
  while (i < n) {
    const c = src[i];
    if (src.startsWith('//', i)) { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === "'" || c === '"') { i = skipString(c); continue; }
    if (c === '`') { i = skipTemplate(); continue; }
    if (src.startsWith('tl', i) && !/[\w$.]/.test(src[i - 1] || ' ')) {
      const k = i + 2;
      if (src[k] === '(' && (src[k + 1] === "'" || src[k + 1] === '"')) {
        i = k + 1; const end = skipString(src[i]);
        out.push({ text: vm.runInNewContext(src.slice(i, end)), at: i }); i = end; continue;
      }
      if (src[k] === '`') {
        i = k; const end = skipTemplate(), raw = src.slice(k, end);
        // each ${…} becomes ${0}: the tag below sees only the text, exactly as tl() does
        let body = '', d = 0;
        for (let j = 1; j < raw.length - 1; j++) {
          if (raw[j] === '\\' && d === 0) { body += raw[j] + raw[j + 1]; j++; continue; }
          if (d === 0 && raw.startsWith('${', j)) { d = 1; j++; body += '${0'; continue; }
          if (d > 0) { if (raw[j] === '{') d++; else if (raw[j] === '}' && --d === 0) body += '}'; continue; }
          body += raw[j];
        }
        const parts = vm.runInNewContext('(s => s)`' + body + '`');
        let key = parts[0]; for (let p = 1; p < parts.length; p++) key += '{' + (p - 1) + '}' + parts[p];
        out.push({ text: key, at: k }); i = end; continue;
      }
    }
    i++;
  }
  return out;
}
function srcFiles() {
  return fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => path.join('src', f));
}
// Every line, in order, grouped by where it's from
function catalog() {
  const groups = [], seen = new Set();
  for (const f of srcFiles()) {
    const lines = linesIn(fs.readFileSync(path.join(ROOT, f), 'utf8')).map(l => l.text).filter(s => !seen.has(s) && seen.add(s));
    if (lines.length) groups.push([f, lines]);
  }
  const { load } = require('./content.js'), T = load(), add = (name, list) => { const l = list.filter(s => s && !seen.has(s) && seen.add(s)); if (l.length) groups.push([name, l]); };
  add('content/items.json', Object.values(T.ITEMS).flatMap(i => [i.name, i.desc]));
  add('content/monsters.json', Object.values(T.MONSTERS).flatMap(m => [m.name, ...(m.phases || []).map(p => p.msg)]));
  add('content/towns.json', Object.values(T.TOWN_DEFS).map(t => t.name));
  return groups;
}
const placeholders = s => (s.match(/\{\d+\}/g) || []).sort().join(',');

if (require.main === module) {
  const argv = process.argv.slice(2), groups = catalog(), all = new Set(groups.flatMap(g => g[1]));
  if (!argv.includes('--check')) {
    const strings = {};
    for (const [f, lines] of groups) { strings['// ' + f] = ''; for (const l of lines) strings[l] = ''; }
    const lines = ['{', '  "$schema": "../schema/lang.schema.json",', '  "name": "",',
      '  "// how": "Copy this file to <code>.json (es.json, fr.json, …), set name to the language\'s own name, and fill in the strings you translate. Keep {0}, {1}, … : they are values such as names and numbers, in any order. Leave a string empty to keep the English.",',
      '  "strings": {'];
    const ents = Object.entries(strings);
    ents.forEach(([k, v], i) => lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)}${i < ents.length - 1 ? ',' : ''}`));
    lines.push('  }', '}');
    fs.mkdirSync(LANG_DIR, { recursive: true });
    fs.writeFileSync(path.join(LANG_DIR, 'template.json'), lines.join('\n') + '\n');
    console.log(`strings: ${all.size} lines in ${groups.length} files written to content/lang/template.json`);
    process.exit(0);
  }
  // --check
  const dirs = [LANG_DIR]; argv.forEach((a, i) => { if (a === '--mod') dirs.push(path.join(argv[i + 1], 'lang')); });
  let errs = 0;
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json') && f !== 'template.json' && !f.endsWith('.schema.json'))) {
      const at = path.relative(ROOT, path.join(d, f));
      let L; try { L = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) { console.error(`strings: ${at}: ${e.message}`); errs++; continue; }
      if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(f.replace('.json', ''))) { console.error(`strings: ${at}: name the file by its language code, like es.json or pt-BR.json`); errs++; }
      if (typeof L.strings !== 'object') { console.error(`strings: ${at}: needs a "strings" object`); errs++; continue; }
      let done = 0, stale = 0;
      for (const [en, tr] of Object.entries(L.strings)) {
        if (en.startsWith('//') || !tr) continue;
        if (typeof tr !== 'string') { console.error(`strings: ${at}: ${JSON.stringify(en).slice(0, 60)}: the translation should be text`); errs++; continue; }
        if (!all.has(en)) { stale++; continue; }
        if (placeholders(en) !== placeholders(tr)) { console.error(`strings: ${at}: ${JSON.stringify(en).slice(0, 60)}: needs the values ${placeholders(en) || '(none)'}, has ${placeholders(tr) || '(none)'}`); errs++; continue; }
        done++;
      }
      console.log(`strings: ${at}: ${done} of ${all.size} lines translated${stale ? `, ${stale} no longer in the game (the English changed)` : ''}`);
    }
  }
  process.exit(errs ? 1 : 0);
}
module.exports = { catalog, linesIn };
