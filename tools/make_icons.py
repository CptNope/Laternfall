"""Render the app icons from the game's own drawing helpers (no hand-made image files).
icon-1024.png is the source for the desktop app icons (CI runs `tauri icon` on it).
Usage: CHROME=/path/to/chrome python3 tools/make_icons.py   (writes icons/*.png; run after build.py)"""
import os, base64, asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SIZES = {'icon-1024.png': (1024, 0.0), 'icon-192.png': (192, 0.0), 'icon-512.png': (512, 0.0), 'icon-maskable-512.png': (512, 0.12), 'apple-touch-icon.png': (180, 0.06), 'favicon-32.png': (32, 0.0)}
JS = """([size, pad]) => {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const s = size / 256; g.scale(s, s);
  const inset = pad * 256, r = pad ? 0 : 52;
  // background: night sky with a warm glow (full-bleed for maskable icons)
  g.save(); g.beginPath(); if (r) { g.moveTo(r, 0); g.arcTo(256, 0, 256, 256, r); g.arcTo(256, 256, 0, 256, r); g.arcTo(0, 256, 0, 0, r); g.arcTo(0, 0, 256, 0, r); } else g.rect(0, 0, 256, 256); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, '#1c1040'); bg.addColorStop(1, '#07060f'); g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) circle(g, hash(i, 3) * 256, hash(i, 4) * 150, 0.6 + hash(i, 5) * 1.3, 'rgba(255,255,255,' + (0.3 + hash(i, 6) * 0.6) + ')');
  const gl = g.createRadialGradient(128, 128, 8, 128, 128, 120); gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, 256, 256);
  g.restore();
  // a hanging lantern in the game's palette, drawn with the game's helpers
  const k = 1 - pad * 2; g.save(); g.translate(128, 132); g.scale(k, k);
  const halo = g.createRadialGradient(0, 6, 10, 0, 6, 96); halo.addColorStop(0, 'rgba(255,214,120,.75)'); halo.addColorStop(0.45, 'rgba(255,170,70,.28)'); halo.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(0, 6, 96, 0, Math.PI * 2); g.fill();
  line(g, 0, -118, 0, -84, '#5a4a3a', 5);                                  // chain
  circle(g, 0, -80, 9, null, '#c8a050', 5);                                // ring
  poly(g, [-40, -54, 0, -76, 40, -54], '#3a2a20', OUT, 3);                 // roof
  rrect(g, -46, -58, 92, 10, 4, '#c8a050', OUT, 3);                        // top band
  const glass = g.createLinearGradient(0, -48, 0, 58); glass.addColorStop(0, '#ffe9a0'); glass.addColorStop(1, '#ffb04a');
  rrect(g, -36, -48, 72, 100, 10, null, null); g.fillStyle = glass; g.fill();
  // flame
  g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(22, 0, 18, 28, 0, 32); g.bezierCurveTo(-18, 28, -22, 0, 0, -30); g.fillStyle = '#ff7a2a'; g.fill();
  g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(10, 10, 8, 24, 0, 26); g.bezierCurveTo(-8, 24, -10, 10, 0, -8); g.fillStyle = '#fff4c0'; g.fill();
  // frame bars over the glass
  rrect(g, -36, -48, 72, 100, 10, null, '#c8a050', 6);
  line(g, -12, -48, -12, 52, 'rgba(200,160,80,.9)', 4); line(g, 12, -48, 12, 52, 'rgba(200,160,80,.9)', 4);
  rrect(g, -46, 50, 92, 12, 4, '#c8a050', OUT, 3);                         // base
  rrect(g, -30, 62, 60, 10, 4, '#8a6a30', OUT, 3);
  g.restore();
  return c.toDataURL('image/png');
}"""
async def main():
    async with async_playwright() as p:
        chrome = os.environ.get('CHROME')
        b = await p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
        pg = await b.new_page(); await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(500)
        (ROOT / 'icons').mkdir(exist_ok=True)
        for name, (size, pad) in SIZES.items():
            url = await pg.evaluate(JS, [size, pad])
            (ROOT / 'icons' / name).write_bytes(base64.b64decode(url.split(',', 1)[1])); print('wrote icons/' + name)
        await b.close()
asyncio.run(main())
