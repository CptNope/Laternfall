'use strict';
// ============================================================
//  LANGUAGES (2.0, EN-6). Player-facing text is written in English, wrapped in tl():
//    tl('Welcome to Brightwater.')         a plain line
//    tl`${name} found ${n} gold!`          a line with values: the key is "{0} found {1} gold!"
//  (tl, not t: plenty of drawing code keeps the time in a local t.)
//  tl() looks the English up in the active language and falls back to English, so the code
//  stays readable and an untranslated line still works. Language files are content/lang/*.json
//  ({ "name": "Español", "strings": { "English": "translation" } }); build.py puts them in
//  LANG_PACKS. A translation may reorder the values: "{1} de oro para {0}".
//  The language is chosen once, when the game loads (?lang=xx, else the saved choice, else
//  English); changing it in Settings reloads the game. "pseudo" is a test language that
//  changes every translated line, so English left untranslated stands out (docs/TESTING.md).
// ============================================================
const LANG_KEY = 'lanternfall_lang';
const LANG = (() => {
  const url = /[?&]lang=([\w-]+)/.exec(location.search);
  let code = url ? url[1] : null;
  if (!code) { try { code = localStorage.getItem(LANG_KEY); } catch (e) { } }
  return code && (code === 'pseudo' || code === 'en' || LANG_PACKS[code]) ? code : 'en';
})();
// the lines of the active language (English has an empty pack, which a mod can use to reword)
const LANG_STRINGS = (LANG_PACKS[LANG] && LANG_PACKS[LANG].strings) || {};
// Pseudo: accent every letter, keep {0} values and line breaks, and pad by a third, so missed
// lines and text too long for its box both show up on screen.
// every letter has an accented twin, so a plain ASCII letter on screen is always untranslated
const PSEUDO_MAP = { a: 'å', b: 'ƀ', c: 'ç', d: 'đ', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ', n: 'ñ', o: 'ö', p: 'þ', q: 'ʠ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž', A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Đ', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ', N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž' };
function pseudo(s) {
  if (!/[A-Za-z]/.test(s)) return s;
  const body = s.replace(/\{\d+\}|[A-Za-z]/g, m => m.length > 1 ? m : PSEUDO_MAP[m] || m);
  const pad = '·'.repeat(Math.ceil(s.replace(/\{\d+\}/g, '').length / 3));
  return '⟦' + body + pad + '⟧';
}
const T_CACHE = new Map(), T_KEYS = new WeakMap();
const T_SEEN = LANG === 'pseudo' ? new Set() : null;   // the keys asked for, so a test can check the template has them all
function lookup(key) {
  if (T_SEEN) T_SEEN.add(key);
  let v = T_CACHE.get(key);
  if (v === undefined) {
    v = LANG === 'pseudo' ? pseudo(key) : (typeof LANG_STRINGS[key] === 'string' && LANG_STRINGS[key]) || key;
    T_CACHE.set(key, v);
  }
  return v;
}
function tl(s, ...vals) {
  if (Array.isArray(s) && s.raw) {   // t`…${x}…`
    let key = T_KEYS.get(s);
    if (!key) { key = s[0]; for (let i = 1; i < s.length; i++) key += '{' + (i - 1) + '}' + s[i]; T_KEYS.set(s, key); }
    return lookup(key).replace(/\{(\d+)\}/g, (m, i) => +i < vals.length ? String(vals[+i]) : m);
  }
  return typeof s === 'string' ? lookup(s) : s;
}
// The languages to offer in Settings: English, every pack, and pseudo only when asked for
function languages() {
  const out = [['en', 'English']];
  for (const [code, p] of Object.entries(LANG_PACKS)) if (code !== 'en') out.push([code, p.name || code]);
  if (LANG === 'pseudo') out.push(['pseudo', tl('Pseudo (test)')]);
  return out;
}
function setLanguage(code) { try { localStorage.setItem(LANG_KEY, code); } catch (e) { } location.reload(); }
// content/*.json is data, not code: its names and descriptions are translated here, once loaded
function translateContent() {
  if (LANG === 'en' && !Object.keys(LANG_STRINGS).length) return;
  for (const it of Object.values(ITEMS)) { it.name = tl(it.name); it.desc = tl(it.desc); }
  for (const m of Object.values(MONSTERS)) { m.name = tl(m.name); for (const p of m.phases || []) p.msg = tl(p.msg); }
  for (const tw of Object.values(TOWN_DEFS)) tw.name = tl(tw.name);
}
