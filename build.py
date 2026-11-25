"""Builds Lanternfall into one file.

  python3 build.py                                  index.html (plus manifest.webmanifest and sw.js)
  python3 build.py --mod mods/example [--mod …]     the game with mods, in build/lanternfall-modded.html
  python3 build.py --mod mods/example --out x.html  …or wherever you like

Mods (2.0, EN-4) are folders: see mods/README.md. A modded build never touches index.html.
"""
import pathlib, hashlib, json
root=pathlib.Path(__file__).parent
import subprocess, shutil, sys, argparse
ap=argparse.ArgumentParser(description='Build Lanternfall into one HTML file.')
ap.add_argument('--mod', action='append', default=[], metavar='DIR', help='a mod folder to build in (repeat for more; applied in order)')
ap.add_argument('--out', metavar='FILE', help='where a modded build goes (default build/lanternfall-modded.html)')
ARGS=ap.parse_args()
MODDED=bool(ARGS.mod)
# Source files in load order. They share one global scope, so a file may only use, at load time,
# names declared in files before it (tools/load_check.js checks this). 'folder/*' takes every
# .js file in that folder, sorted: each one registers itself (a monster family, a battle background).
order=['lang','i18n','core','content','data','art','monsters/*','backgrounds/*','deep_art','maps','party','field','tilecache','interior','battle','menu','crafts','hearts','deep','platform','living','cards','heist','editor','story','endless']

# ---- content/*.json (2.0, EN-1): checked by tools/content.js, then written into the game as JS ----
import tempfile
MOD_SRC=[]; MODS=[]
def check_content():
    """Check content/ (and any mods); returns the merged tables when mods are given."""
    if not shutil.which('node'):
        if MODDED: sys.exit('build.py: building with mods needs node (it merges and checks them)')
        print('build.py: node not found, skipping the content check', file=sys.stderr); return None
    emit=pathlib.Path(tempfile.gettempdir())/'lanternfall_merged.json'
    cmd=['node',str(root/'tools'/'content.js')]+[a for m in ARGS.mod for a in ('--mod',m)]+(['--emit',str(emit)] if MODDED else [])
    r=subprocess.run(cmd,cwd=root)
    if r.returncode: sys.exit('build.py: fix the content problems above; nothing was built')
    # languages: a translation must keep the English line's {0}, {1}, … (tools/strings.js)
    r=subprocess.run(['node',str(root/'tools'/'strings.js'),'--check']+[a for m in ARGS.mod for a in ('--mod',m)],cwd=root,capture_output=True,text=True)
    if r.returncode: sys.exit(r.stdout+r.stderr+'build.py: fix the language problems above; nothing was built')
    return json.loads(emit.read_text()) if MODDED else None
def content_js(merged=None):
    if merged:
        T=merged['tables']; tables={k: T[k] for k in ('ITEMS','MONSTERS','NIGHT_ENC','ENCOUNTERS','SHOPS','TOWN_DEFS')}
    else:
        load=lambda f: json.loads((root/'content'/f).read_text())
        strip=lambda o: {k: v for k, v in o.items() if not k.startswith('//')}   # '// …' keys are comments
        enc=load('encounters.json')
        tables={'ITEMS': strip(load('items.json')['items']), 'MONSTERS': strip(load('monsters.json')['monsters']),
                'NIGHT_ENC': strip(enc['night']), 'ENCOUNTERS': strip(enc['day']), 'SHOPS': strip(load('shops.json')['shops']),
                'TOWN_DEFS': strip(load('towns.json')['towns'])}
    tables['MODS']=merged['mods'] if merged else []   # the mods built in: shown on the title screen, kept in saves
    out=['// ============================================================',
         '//  CONTENT: written by build.py from content/*.json'+(' and mods' if merged else '')+'. Edit those files, not this.',
         '// ============================================================']
    for name, t in tables.items():
        body=json.dumps(t, ensure_ascii=False, separators=(',', ':'))
        body=body.replace('</', '<\\/').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')   # safe inside <script>
        out.append(f'const {name} = {body};')
    out.append('translateContent();   // names and descriptions into the chosen language (i18n.js)')
    return '\n'.join(out)+'\n'
# ---- languages (2.0, EN-6): content/lang/<code>.json, plus any mod's lang/<code>.json ----
def lang_js():
    packs={}
    def merge(f, who):
        code=f.stem
        if code=='template': return   # the list of lines to translate, made by tools/strings.js
        try: d=json.loads(f.read_text())
        except Exception as e: sys.exit(f'build.py: {who}/{f.name}: {e}')
        p=packs.setdefault(code, {'name': code, 'strings': {}})
        if d.get('name'): p['name']=d['name']
        p['strings'].update({k: v for k, v in (d.get('strings') or {}).items() if not k.startswith('//') and isinstance(v, str) and v})
    for f in sorted((root/'content'/'lang').glob('*.json')): merge(f, 'content/lang')
    for m in ARGS.mod:
        for f in sorted((pathlib.Path(m)/'lang').glob('*.json')): merge(f, f'{m}/lang')
    body=json.dumps(packs, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return f'// LANGUAGES: written by build.py from content/lang/*.json (and mods). Edit those files, not this.\nconst LANG_PACKS = {body};\n'
merged=check_content()
if merged: MOD_SRC=[pathlib.Path(f) for f in merged['src']]; MODS=merged['mods']
CONTENT=pathlib.Path(tempfile.gettempdir())/'lanternfall_content.js'
CONTENT.write_text(content_js(merged))
LANGJS=pathlib.Path(tempfile.gettempdir())/'lanternfall_lang.js'
LANGJS.write_text(lang_js())
def sources():
    out=[]
    for n in order:
        if n=='content': out.append(CONTENT); continue
        if n=='lang': out.append(LANGJS); continue
        out += sorted((root/'src').glob(n+'.js')) if n.endswith('*') else [root/'src'/f'{n}.js']
    return out+MOD_SRC   # a mod's code loads last: it can use anything the game defines
js='\n'.join(p.read_text() for p in sources())
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Lanternfall — A Tale of the Four Flames</title>
<meta name="description" content="A complete 16-bit-style JRPG that runs in your browser. No downloads, no image or audio files.">
<meta name="theme-color" content="#07060f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>
html,body{{margin:0;height:100%;background:#05040c;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}}
body{{display:flex;align-items:center;justify-content:center}}
canvas{{display:block;image-rendering:auto;box-shadow:0 0 60px rgba(120,90,200,.25)}}
#touch{{display:none;position:fixed;inset:0;pointer-events:none}}
#touch .b{{position:absolute;pointer-events:auto;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.35);color:rgba(255,255,255,.8);font:bold 18px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;border-radius:12px;touch-action:none}}
#touch .b.on{{background:rgba(255,255,255,.35)}}
#touch .d{{width:54px;height:54px}}
#touch .r{{width:66px;height:66px;border-radius:50%}}
#touch .s{{width:46px;height:46px;border-radius:50%;font-size:15px}}
</style>
</head>
<body>
<canvas id="game" width="640" height="480"></canvas>
<div id="touch">
  <div class="b d" data-a="up" style="left:70px;bottom:136px">▲</div>
  <div class="b d" data-a="left" style="left:14px;bottom:80px">◀</div>
  <div class="b d" data-a="right" style="left:126px;bottom:80px">▶</div>
  <div class="b d" data-a="down" style="left:70px;bottom:24px">▼</div>
  <div class="b r" data-a="ok" style="right:20px;bottom:90px">A</div>
  <div class="b r" data-a="cancel" style="right:96px;bottom:40px">B</div>
  <div class="b s" data-a="run" style="right:30px;bottom:170px" title="Run / repeat last turn">R</div>
</div>
<script>
{js}
</script>
</body>
</html>
'''
OUT=pathlib.Path(ARGS.out) if ARGS.out else root/'build'/'lanternfall-modded.html'
if MODDED:
    # a modded build is one file you can put anywhere, so it doesn't link the app manifest or icons
    import re
    html=re.sub(r'<link rel="(?:manifest|icon|apple-touch-icon)"[^>]*>\n', '', html)
    OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(html)
else: (root/'index.html').write_text(html)

# ---- load-order check: run the joined script once in node, as a browser would on page load ----
if shutil.which('node'):
    r=subprocess.run(['node',str(root/'tools'/'load_check.js'),*map(str,sources())],cwd=root)
    if r.returncode: sys.exit(f'build.py: {OUT if MODDED else "index.html"} was written, but it fails to load or a town check (see above)')
else:
    print('build.py: node not found, skipping the load-order check', file=sys.stderr)
if MODDED:   # the installable-app files belong to the real game only
    print(f'build.py: wrote {OUT} with', ', '.join(f"{m['name']} {m['version']}" for m in MODS)); sys.exit(0)

# ---- installable app (PWA): a manifest and an offline service worker beside index.html ----
# index.html stays a single self-contained file; these only matter when it's served over http(s).
icons=sorted(p.name for p in (root/'icons').glob('*.png') if p.name != 'icon-1024.png')   # the 1024 source is only for desktop icons
manifest={
  'name':'Lanternfall — A Tale of the Four Flames','short_name':'Lanternfall','id':'./','start_url':'./','scope':'./',
  'display':'fullscreen','display_override':['fullscreen','standalone'],'orientation':'landscape',
  'background_color':'#07060f','theme_color':'#07060f','categories':['games'],
  'description':'A complete 16-bit-style JRPG that runs in your browser. Plays offline once installed.',
  'icons':[{'src':'icons/icon-192.png','sizes':'192x192','type':'image/png','purpose':'any'},
           {'src':'icons/icon-512.png','sizes':'512x512','type':'image/png','purpose':'any'},
           {'src':'icons/icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]
}
(root/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
version=hashlib.sha256((html+''.join(icons)).encode()).hexdigest()[:12]
files=['./','./index.html','./manifest.webmanifest']+[f'./icons/{n}' for n in icons]
sw=f'''// Generated by build.py — do not edit. Cache version changes whenever index.html changes.
const CACHE = 'lanternfall-{version}';
const FILES = {json.dumps(files)};
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener('activate', e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('lanternfall-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // the page: network first, so a new version arrives as soon as you're online; the cache when offline
  if (req.mode === 'navigate') {{
    e.respondWith(fetch(req).then(r => {{ const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; }}).catch(() => caches.match('./index.html')));
    return;
  }}
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
}});
'''
(root/'sw.js').write_text(sw)
print(len(html))
