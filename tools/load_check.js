// Load-order check: runs the joined game script once in a sandbox, the way a browser does
// when the page loads, and reports any error thrown at load time with the source file and line.
//
// The bug it exists for: every src/*.js file shares one global scope, in build order. A top-level
// `const A = { look: LOOKS.sailor }` in cards.js throws "Cannot access 'LOOKS' before
// initialization" because LOOKS is declared later, in story.js. The same goes for a duplicate
// top-level name in two files (a SyntaxError) or a typo in code that runs at load time.
//
// Browser APIs are replaced by a stand-in that accepts any use, so only the game's own code is
// tested. Code inside functions that run later (events, the main loop) isn't reached.
//
// Usage: node tools/load_check.js src/core.js src/data.js ...   (build.py passes its order)
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node tools/load_check.js <files in build order>'); process.exit(2); }

// join exactly like build.py, remembering where each file starts
let js = '', line = 1;
const starts = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  starts.push({ f: path.relative(process.cwd(), f), line });
  js += (js ? '\n' : '') + text;
  line += text.split('\n').length;
}
const where = n => { let s = starts[0]; for (const x of starts) if (x.line <= n) s = x; return `${s.f}:${n - s.line + 1}`; };

// a value that is happy to be anything: called, constructed, read from, written to, compared
const stub = new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'length' ? 0 : k === Symbol.iterator ? function* () {} : stub,
  set: () => true, apply: () => stub, construct: () => stub, has: () => true, deleteProperty: () => true,
});
const store = new Map();
const base = {
  console,
  localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  performance: { now: () => 0 }, location: { search: '', href: 'file:///index.html', protocol: 'file:' },
  innerWidth: 1280, innerHeight: 960, devicePixelRatio: 1,
};
// unknown globals (document, navigator, AudioContext, …) resolve to the stub; the game's own
// top-level let/const/class live in the script scope, not on this object, so TDZ still throws
const global = new Proxy(base, {
  has: () => true,
  get: (t, k) => k in t ? t[k] : (typeof k === 'string' && k in globalThis && k !== 'window' && k !== 'self') ? globalThis[k] : stub,
});
base.window = base.self = base.globalThis = global;
const ctx = vm.createContext(global);

try {
  new vm.Script(js, { filename: 'index.js' }).runInContext(ctx, { timeout: 5000 });
} catch (e) {
  const m = /index\.js:(\d+)/.exec(e.stack || '');
  console.error(`load_check: ${e.name}: ${e.message}${m ? `\n  at ${where(+m[1])}` : ''}`);
  const tdz = /Cannot access '(\w+)' before initialization/.exec(e.message);
  if (tdz) {   // say where the name is declared, so the fix is obvious
    const re = new RegExp(`^(?:const|let|class)\\b[^=]*\\b${tdz[1]}\\b`);
    const at = js.split('\n').findIndex(l => re.test(l));
    if (at >= 0) console.error(`  '${tdz[1]}' is declared at ${where(at + 1)}`);
  }
  if (/before initialization/.test(e.message)) console.error('  A top-level value reads a name that is declared in a later file (or later in the same file). Move the declaration earlier in build.py\'s order, or read it inside a function that runs after loading.');
  process.exit(1);
}
console.log(`load_check: ${files.length} files load cleanly in build order`);
