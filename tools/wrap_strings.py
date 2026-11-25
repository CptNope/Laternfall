"""Wraps player-facing string literals in src/ with tl() (2.0, EN-6). Run once; kept for new files.

  python3 tools/wrap_strings.py src/foo.js [...]      rewrite these files
  python3 tools/wrap_strings.py --dry src/foo.js      print what would be wrapped

The function is tl, not t: plenty of drawing code keeps the time in a local t.
A literal is player-facing when it has a space or a capital letter and some letters, because the
game's ids are lower case (arin, fire, halden_items). It is left alone when it is: already in t();
already in tl(); an object key; a key name (Escape, ArrowUp, KeyZ); all capitals (map letters like 'A'); CSS, a font
or a colour; or an argument to console.*, Error(), querySelector or a DOM call. Template literals
become tagged templates: `Hi ${n}` -> tl`Hi ${n}`.
"""
import re, sys, pathlib

KEYS = re.compile(r'^(Arrow(Up|Down|Left|Right)|Key[A-Z]|Digit\d|Numpad\w*|Enter|Escape|Space|Shift\w*|Control\w*|Alt\w*|Meta\w*|Tab|Backspace|Delete|Home|End|PageUp|PageDown|F\d{1,2}|Gamepad\w*)$')
CODEY = re.compile(r'px\b|^#|rgba?\(|hsla?\(|^\s*$|\b(system-ui|monospace|serif|sans-serif|Georgia)\b|=>|^[\w.-]+\.(js|json|png|html)$|^<|^\w+:\w')
SKIP_CALLS = re.compile(r'(?:\b(console\.\w+|querySelector(?:All)?|getElementById|createElement|addEventListener|removeEventListener|setAttribute|getItem|setItem|removeItem|matchMedia|postMessage|require|RegExp)|(?<![\w$.])(tl))\s*\($')

def tokens(src):
    """Yield (kind, start, end): kind is 'str', 'tpl', or 'code' for one character of code."""
    i, n, prev = 0, len(src), ''   # prev: the last significant code character, to tell / regex from division
    while i < n:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            yield ('str', i, j + 1); i = j + 1; prev = 'x'; continue
        if c == '`':
            j, depth = i + 1, 0
            while j < n:
                if src[j] == '\\': j += 2; continue
                if src[j] == '`' and depth == 0: break
                if src.startswith('${', j): depth += 1; j += 2; continue
                if src[j] == '}' and depth: depth -= 1; j += 1; continue
                if src[j] == '`' and depth:   # a template inside ${…}: skip it whole
                    k = j + 1
                    while k < n and src[k] != '`': k += 2 if src[k] == '\\' else 1
                    j = k + 1; continue
                j += 1
            yield ('tpl', i, j + 1); i = j + 1; prev = 'x'; continue
        if c == '/' and (prev in '' or prev in '(,=:[!&|?{};+-*%<>~^' or re.search(r'\b(return|typeof|case|in|of)\s*$', src[max(0, i - 8):i])):
            j, cls = i + 1, False   # a regex literal
            while j < n and (src[j] != '/' or cls):
                if src[j] == '\\': j += 1
                elif src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                if src[j] == '\n': break
                j += 1
            j += 1
            while j < n and src[j].isalpha(): j += 1
            i = j; prev = 'x'; continue
        if not c.isspace(): prev = c if c in '(,=:[!&|?{};+-*%<>~^)]}.' else 'x'
        yield ('code', i, i + 1); i += 1

def static_text(tok, kind):
    if kind == 'str': return tok[1:-1]
    return re.sub(r'\$\{(?:[^{}]|\{[^{}]*\})*\}', '{}', tok[1:-1])   # the template's text, each value as {}

NOTES = re.compile(r'([A-GR][#b]?\d*(:[\d.]+)?[\s,|-]*)+')   # music, as in TRACKS: 'E5:4 G5:4 Bb1'

def wants(text):
    if text in ('use strict', 'MacIntel') or NOTES.fullmatch(text.strip()): return False
    if re.fullmatch(r'[a-z]+[A-Z]\w*', text.strip()): return False   # camelCase: a setting or a property name
    if not re.search(r'[A-Za-z]{2}', text): return False
    if not (' ' in text.strip() or re.search(r'[A-Z]', text)): return False
    t = text.strip()
    if KEYS.match(t) or re.fullmatch(r'[A-Z0-9_]+', t) or CODEY.search(t): return False
    return True

def wrap(src):
    out, last, made, skipped = [], 0, 0, []
    for kind, a, b in tokens(src):
        if kind == 'code': continue
        tok = src[a:b]
        if not wants(static_text(tok, kind)): continue
        before = src[:a].rstrip()
        after = src[b:].lstrip()
        why = None
        if re.search(r'\btl\($', before) or kind == 'tpl' and a and re.match(r'[\w$]', src[a - 1]): why = 'already wrapped or tagged'
        elif after.startswith(':') and before[-1:] in '{,': why = 'object key'
        elif re.match(r'\.(includes|indexOf|split|charAt|startsWith|replace|test)\b', after): why = 'a set of characters'
        elif SKIP_CALLS.search(before[-60:]): m = SKIP_CALLS.search(before[-60:]); why = 'call: ' + (m.group(1) or m.group(2))
        elif re.search(r'\[\s*$', before) and after.startswith(']') and re.search(r'[\w)\]]\s*\[\s*$', before): why = 'property name'
        if why: skipped.append((why, tok[:60])); continue
        out.append(src[last:a]); out.append(('tl(' + tok + ')') if kind == 'str' else ('tl' + tok)); last = b; made += 1
    out.append(src[last:])
    return ''.join(out), made, skipped

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry' in sys.argv
    total = 0
    for f in args:
        p = pathlib.Path(f); src = p.read_text()
        new, made, skipped = wrap(src)
        total += made
        print(f'{f}: {made} wrapped, {len(skipped)} skipped')
        if dry:
            for why, s in skipped[:12]: print(f'    skip ({why}): {s}')
        else: p.write_text(new)
    print('total', total)
