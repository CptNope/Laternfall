'use strict';
// ============================================================
//  ART — everything is drawn with canvas paths (pure vector)
// ============================================================
function circle(g, x, y, r, fill, stroke, lw = 1.5) {
  g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function ellipse(g, x, y, rx, ry, fill, stroke, lw = 1.5, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function poly(g, pts, fill, stroke, lw = 1.5) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function line(g, x1, y1, x2, y2, col, lw = 2) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
}
function rrect(g, x, y, w, h, r, fill, stroke, lw = 1.5) {
  roundRect(g, x, y, w, h, Math.min(r, w / 2, h / 2));
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
const OUT = 'rgba(20,14,30,.85)';

// ---------------- WORLD TILES ----------------
const WPAL = {
  grass: '#6dbb4f', grassD: '#4f9a3a', grassL: '#8fd468',
  forest: '#2f7a35', forestD: '#1f5a28', forestL: '#4f9a45',
  sand: '#e9d49a', sandD: '#cdb373',
  water: '#2c6fc4', waterD: '#1f569e', waterL: '#4f92e0',
  snow: '#eef4fb', snowD: '#c4d4e6',
  rock: '#8a7f73', rockD: '#5f574f', rockL: '#b3a99b',
  dirt: '#c9a46a', dirtD: '#a6824e',
  q: '#3b2a4c', qD: '#24182f', qL: '#6a3a8a'
};
function isWaterCh(c) { return c === '~' || c === 'r'; }
function groundOf(ch, reg) {
  if (reg === 'H') return ch === 's' ? 'ashsand' : 'ash';
  if (reg === 'F' || ch === 'z' || ch === 'v' || ch === 'm') return 'desert';
  if (ch === '*' || ch === 'P' || ch === 'M') return 'snow';
  if (ch === 'q' || ch === 'd' || reg === 'C') return 'q';
  if (ch === 's') return 'sand';
  return 'grass';
}
function fillGround(g, kind, px, py, x, y, t = 0) {
  if (kind === 'snow') {
    g.fillStyle = WPAL.snow; g.fillRect(px, py, TS, TS);
    g.fillStyle = WPAL.snowD;
    for (let i = 0; i < 3; i++) { const h = hash(x, y, i + 9); g.fillRect(px + 4 + h * 22, py + 4 + hash(x, y, i + 19) * 22, 3, 2); }
  } else if (kind === 'q') {
    g.fillStyle = WPAL.q; g.fillRect(px, py, TS, TS);
    g.strokeStyle = 'rgba(140,70,190,.45)'; g.lineWidth = 1.2;
    g.beginPath(); const a = hash(x, y, 3); g.moveTo(px + a * 30, py); g.quadraticCurveTo(px + 16, py + 16, px + hash(x, y, 4) * 30, py + 32); g.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(t / 0.6 + x * 1.7 + y);
    if (hash(x, y, 5) < 0.4) circle(g, px + 6 + hash(x, y, 6) * 20, py + 6 + hash(x, y, 7) * 20, 1.6, `rgba(200,120,255,${0.3 + pulse * 0.5})`);
  } else if (kind === 'ash' || kind === 'ashsand') {
    const sand = kind === 'ashsand';
    g.fillStyle = sand ? ((x + y) % 2 ? '#8a8078' : '#857b73') : ((x + y) % 2 ? '#5a5458' : '#565054'); g.fillRect(px, py, TS, TS);
    g.fillStyle = sand ? '#6a625a' : '#3e383c';
    for (let i = 0; i < 4; i++) g.fillRect(px + 3 + hash(x, y, i) * 26, py + 3 + hash(x, y, i + 7) * 26, 3, 2);
    if (!sand && hash(x, y, 12) < 0.22) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + x * 2.1 + y);
      g.strokeStyle = `rgba(255,120,50,${0.35 + pulse * 0.45})`; g.lineWidth = 1.4;
      const a = hash(x, y, 13); g.beginPath(); g.moveTo(px + 4 + a * 10, py + 8); g.lineTo(px + 14, py + 16); g.lineTo(px + 10 + a * 14, py + 27); g.stroke();
    }
  } else if (kind === 'desert') {
    g.fillStyle = (x + y) % 2 ? '#e8c47a' : '#e4be72'; g.fillRect(px, py, TS, TS);
    g.strokeStyle = 'rgba(160,110,50,.35)'; g.lineWidth = 1.3;
    const o = hash(x, y, 3) * 10;
    g.beginPath(); g.moveTo(px + 2, py + 12 + o); g.quadraticCurveTo(px + 16, py + 6 + o, px + 30, py + 12 + o); g.stroke();
  } else if (kind === 'sand') {
    g.fillStyle = WPAL.sand; g.fillRect(px, py, TS, TS);
    g.fillStyle = WPAL.sandD;
    for (let i = 0; i < 4; i++) g.fillRect(px + 3 + hash(x, y, i) * 26, py + 3 + hash(x, y, i + 7) * 26, 2, 2);
  } else {
    g.fillStyle = (x + y) % 2 ? WPAL.grass : '#6ab84c'; g.fillRect(px, py, TS, TS);
    g.strokeStyle = WPAL.grassD; g.lineWidth = 1.3;
    for (let i = 0; i < 2; i++) {
      const hx = px + 5 + hash(x, y, i) * 22, hy = py + 8 + hash(x, y, i + 4) * 20;
      g.beginPath(); g.moveTo(hx - 3, hy - 4); g.lineTo(hx, hy); g.lineTo(hx + 3, hy - 4); g.stroke();
    }
  }
}
function drawTreeRound(g, x, y, s, col, colD, colL) {
  line(g, x, y, x, y - 6 * s, '#5a3a1f', 3 * s);
  circle(g, x, y - 11 * s, 8 * s, colD);
  circle(g, x - 1 * s, y - 12.5 * s, 6.5 * s, col);
  circle(g, x - 3 * s, y - 15 * s, 2.5 * s, colL);
}
function drawPine(g, x, y, s, col, colD, snow) {
  line(g, x, y, x, y - 5 * s, '#5a3a1f', 3 * s);
  poly(g, [x, y - 22 * s, x - 8 * s, y - 4 * s, x + 8 * s, y - 4 * s], colD);
  poly(g, [x, y - 22 * s, x - 6 * s, y - 9 * s, x + 2 * s, y - 9 * s], col);
  if (snow) { poly(g, [x, y - 22 * s, x - 4 * s, y - 14 * s, x + 4 * s, y - 14 * s], '#fff'); }
}
function drawDeadTree(g, x, y, s) {
  g.strokeStyle = '#1a1020'; g.lineCap = 'round';
  g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 16 * s); g.stroke();
  g.lineWidth = 1.6 * s; g.beginPath();
  g.moveTo(x, y - 10 * s); g.lineTo(x - 7 * s, y - 17 * s);
  g.moveTo(x, y - 13 * s); g.lineTo(x + 6 * s, y - 20 * s);
  g.moveTo(x, y - 16 * s); g.lineTo(x - 2 * s, y - 22 * s);
  g.stroke();
}
function drawMountain(g, px, py, x, y, snowy, dark) {
  const h = hash(x, y, 11), ash = dark === 'ash';
  const base = ash ? '#3a3438' : dark ? '#4a3a5a' : snowy ? '#9aa8b8' : WPAL.rock;
  const light = ash ? '#5a5258' : dark ? '#6a5a7a' : snowy ? '#c8d4e2' : WPAL.rockL;
  const shadowC = ash ? '#1a1418' : dark ? '#2a1a3a' : snowy ? '#6a7a8e' : WPAL.rockD;
  const pk = px + 12 + h * 8, top = py - 8 - h * 4;
  poly(g, [pk, top, px - 2, py + TS, px + TS + 2, py + TS], base);
  poly(g, [pk, top, px - 2, py + TS, pk - 2, py + TS], light);
  poly(g, [pk, top, pk + 8, py + 18, px + TS + 2, py + TS, pk + 4, py + TS], shadowC);
  poly(g, [pk, top, pk - 6, top + 10, pk - 1, top + 8, pk + 3, top + 11, pk + 6, top + 8], ash ? '#ff7a3a' : dark ? '#9a7aba' : '#fff');
  g.strokeStyle = OUT; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(px - 2, py + TS); g.lineTo(pk, top); g.lineTo(px + TS + 2, py + TS); g.stroke();
}
function roadLinks(map, x, y) {
  const isR = (xx, yy) => { const c = map.at(xx, yy); return c === '=' || c === 'b' || c === 'x' || isLoc(c); };
  return [isR(x, y - 1), isR(x + 1, y), isR(x, y + 1), isR(x - 1, y)];
}
function drawWater(g, px, py, x, y, map, t) {
  g.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#2d72c8' : WPAL.water; g.fillRect(px, py, TS, TS);
  const ph = t * 1.4 + x * 0.9 + y * 1.3;
  g.strokeStyle = 'rgba(160,210,255,.55)'; g.lineWidth = 1.4;
  const wx = px + 6 + (Math.sin(ph) * 4 + hash(x, y, 2) * 10), wy = py + 10 + hash(x, y, 3) * 12;
  g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 4, wy - 3, wx + 8, wy); g.stroke();
  // shore foam
  if (map) {
    const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    nb.forEach(([dx, dy], i) => {
      const c = map.at(x + dx, y + dy);
      if (c && !isWaterCh(c) && c !== 'b' && c !== 'x') {
        const f = 0.5 + 0.5 * Math.sin(t * 2 + x + y);
        g.fillStyle = 'rgba(120,190,240,.7)';
        const w = 5 + f * 2;
        if (i === 0) g.fillRect(px, py, TS, w); if (i === 2) g.fillRect(px, py + TS - w, TS, w);
        if (i === 3) g.fillRect(px, py, w, TS); if (i === 1) g.fillRect(px + TS - w, py, w, TS);
        g.fillStyle = 'rgba(255,255,255,.75)';
        const w2 = 2;
        if (i === 0) g.fillRect(px, py + w - 1, TS, w2); if (i === 2) g.fillRect(px, py + TS - w - 1, TS, w2);
        if (i === 3) g.fillRect(px + w - 1, py, w2, TS); if (i === 1) g.fillRect(px + TS - w - 1, py, w2, TS);
      }
    });
  }
}
function drawWorldTile(g, map, x, y, px, py, t) {
  const ch = map.at(x, y);
  const reg = map.region ? map.region[y] && map.region[y][x] : null;
  if (isWaterCh(ch) || ch === undefined) { drawWater(g, px, py, x, y, ch === undefined ? null : map, t); return; }
  if (ch === 'b' || ch === 'x') {
    drawWater(g, px, py, x, y, null, t);
    // planks spanning horizontally
    g.fillStyle = '#5a3a1f'; g.fillRect(px, py + 6, TS, 3); g.fillRect(px, py + 23, TS, 3);
    if (ch === 'b') {
      g.fillStyle = '#a8763f'; g.fillRect(px, py + 9, TS, 14);
      g.strokeStyle = '#6a4522'; g.lineWidth = 1;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(px + i * 7 + 2, py + 9); g.lineTo(px + i * 7 + 2, py + 23); g.stroke(); }
    } else {
      g.fillStyle = '#a8763f'; g.fillRect(px, py + 9, 9, 14); g.fillRect(px + 24, py + 9, 8, 14);
      poly(g, [px + 9, py + 9, px + 13, py + 14, px + 9, py + 23], '#a8763f');
      poly(g, [px + 24, py + 9, px + 20, py + 17, px + 24, py + 23], '#a8763f');
      line(g, px + 12, py + 24, px + 16, py + 30, '#6a4522', 2);
    }
    return;
  }
  const gk = groundOf(ch, reg);
  fillGround(g, gk, px, py, x, y, t);
  switch (ch) {
    case 'T': {
      if (reg === 'F') { drawPalm(g, px + 10, py + 28, 1, x + y, t); drawPalm(g, px + 24, py + 22, 0.85, x * 3 + y, t); break; }
      const trees = [[9, 16], [23, 13], [15, 28], [27, 29], [4, 30]];
      for (let i = 0; i < trees.length; i++) {
        if (i > 2 && hash(x, y, 30 + i) < 0.5) continue;
        const [tx, ty] = trees[i];
        drawTreeRound(g, px + tx + (hash(x, y, i) - 0.5) * 4, py + ty, 0.9 + hash(x, y, i + 3) * 0.2, WPAL.forest, WPAL.forestD, WPAL.forestL);
      }
      break;
    }
    case 'P': {
      const trees = [[9, 18], [23, 15], [16, 30], [28, 31]];
      trees.forEach(([tx, ty], i) => drawPine(g, px + tx, py + ty, 0.9, '#3a7a5a', '#245a40', true));
      break;
    }
    case 'd': {
      drawDeadTree(g, px + 9, py + 18, 1); drawDeadTree(g, px + 23, py + 26, 0.9);
      if (hash(x, y, 2) < 0.5) drawDeadTree(g, px + 15, py + 31, 0.8);
      break;
    }
    case '^': drawMountain(g, px, py, x, y, false, reg === 'H' ? 'ash' : reg === 'C'); break;
    case 'm': drawMesa(g, px, py, x, y); break;
    case 'v': drawCactus(g, px + 10 + hash(x, y, 1) * 12, py + 28, 0.9); break;
    case 'M': drawMountain(g, px, py, x, y, true, false); break;
    case 'n': {
      ellipse(g, px + 16, py + 24, 15, 10, WPAL.grassD);
      ellipse(g, px + 14, py + 22, 12, 8, '#7cc65c');
      line(g, px + 8, py + 20, px + 12, py + 17, WPAL.grassL, 1.5);
      break;
    }
    case '=': case 'A': case 'B': case 'C': case 'D': case 'E': case 'F': case 'G': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9': {
      if (ch === '=' || /^[A-G]$/.test(ch)) {
        const L = roadLinks(map, x, y);
        g.fillStyle = gk === 'snow' ? '#c8b89a' : gk === 'q' ? '#5a4a6a' : gk === 'ash' ? '#7a6e66' : WPAL.dirt;
        const c = 10, cx = px + 16, cy = py + 16;
        rrect(g, cx - c / 2 - 1, cy - c / 2 - 1, c + 2, c + 2, 4, g.fillStyle);
        if (L[0]) g.fillRect(cx - c / 2, py, c, 16); if (L[2]) g.fillRect(cx - c / 2, cy, c, 16);
        if (L[3]) g.fillRect(px, cy - c / 2, 16, c); if (L[1]) g.fillRect(cx, cy - c / 2, 16, c);
        g.fillStyle = 'rgba(0,0,0,.1)';
        g.fillRect(cx - 2 + hash(x, y, 1) * 4, cy - 2, 2, 2);
      }
      if (ch !== '=') drawLocationIcon(g, ch, px, py, t);
      break;
    }
  }
}
function drawLocationIcon(g, ch, px, py, t) {
  const cx = px + 16, by = py + 28;
  if (ch === 'A' || ch === 'B') {
    const roofs = ch === 'A' ? ['#c0442e', '#3a6ad0', '#d08a2a'] : ['#2a8ab8', '#e0e0e0', '#3a5aa0'];
    const hs = [[-9, -2, 12], [6, 0, 12], [-1, -12, 11]];
    hs.sort((a, b) => a[1] - b[1]).forEach(([dx, dy, w], i) => {
      const x = cx + dx, y = by + dy;
      rrect(g, x - w / 2, y - 9, w, 9, 1, '#f1e4c4', OUT, 1);
      poly(g, [x - w / 2 - 2, y - 8, x, y - 16, x + w / 2 + 2, y - 8], roofs[i], OUT, 1);
      g.fillStyle = '#5a3a1f'; g.fillRect(x - 1.5, y - 5, 3, 5);
    });
    if (ch === 'B') { // lighthouse
      poly(g, [cx + 13, by + 2, cx + 15, by - 20, cx + 19, by - 20, cx + 21, by + 2], '#f0f0f0', OUT, 1);
      g.fillStyle = '#c03a3a'; g.fillRect(cx + 14.5, by - 12, 6, 4);
      circle(g, cx + 17, by - 22, 3, `rgba(255,230,120,${0.6 + 0.4 * Math.sin(t * 4)})`);
    }
  } else if (ch === 'C') {
    // fortress
    rrect(g, cx - 14, by - 14, 28, 16, 1, '#8e8a86', OUT, 1);
    for (let i = 0; i < 5; i++) g.fillStyle = '#8e8a86', g.fillRect(cx - 14 + i * 6, by - 18, 4, 4);
    rrect(g, cx - 4, by - 24, 8, 26, 1, '#a6a29e', OUT, 1);
    poly(g, [cx - 5, by - 24, cx, by - 31, cx + 5, by - 24], '#5a5f7a', OUT, 1);
    line(g, cx, by - 31, cx, by - 38, '#333', 1.2);
    poly(g, [cx, by - 38, cx + 7 + Math.sin(t * 5), by - 36, cx, by - 34], '#c0442e');
    rrect(g, cx - 3, by - 6, 6, 8, 2, '#3a2a1a');
  } else if (ch === 'D') {
    const hs = [[-9, -1, 12], [7, 1, 11], [-1, -11, 11]];
    hs.sort((a, b) => a[1] - b[1]).forEach(([dx, dy, w], i) => {
      const x = cx + dx, y = by + dy;
      rrect(g, x - w / 2, y - 9, w, 9, 1, '#d8c8b0', OUT, 1);
      poly(g, [x - w / 2 - 2, y - 8, x, y - 16, x + w / 2 + 2, y - 8], ['#4a6a9a', '#7a4a3a', '#3a3a6a'][i], OUT, 1);
      poly(g, [x - w / 2 + 1, y - 10, x, y - 16, x + w / 2 - 1, y - 10, x, y - 12], '#fff');
      g.fillStyle = `rgba(255,210,120,${0.6 + 0.3 * Math.sin(t * 3 + i)})`; g.fillRect(x - 1.5, y - 6, 3, 3);
    });
  } else if (ch === 'E') {
    [[-9, 0, 11], [7, 1, 12], [-1, -9, 12]].sort((a, b) => a[1] - b[1]).forEach(([dx, dy, w], i) => {
      const x = cx + dx, y = by + dy;
      rrect(g, x - w / 2, y - 10, w, 10, 1, '#e8c898', OUT, 1);
      g.beginPath(); g.arc(x, y - 10, w / 2 - 1, Math.PI, 0); g.fillStyle = ['#3a8a8a', '#c06a3a', '#8a3a5a'][i]; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#5a3a1f'; g.fillRect(x - 1.5, y - 5, 3, 5);
    });
    drawPalm(g, cx + 13, by + 2, 0.55, 3, t);
  } else if (ch === 'F') {
    [[-9, 0, 11], [7, 0, 11]].forEach(([dx, dy, w], i) => {
      const x = cx + dx, y = by + dy;
      rrect(g, x - w / 2, y - 9, w, 9, 1, '#f0e2c0', OUT, 1);
      poly(g, [x - w / 2 - 2, y - 8, x, y - 16, x + w / 2 + 2, y - 8], ['#5a8ad0', '#7a5a9a'][i], OUT, 1);
    });
    ellipse(g, cx, by - 16, 10, 6, '#d8cfc0', OUT, 1.2); rrect(g, cx - 10, by - 16, 20, 8, 1, '#d8cfc0', OUT, 1);
    line(g, cx, by - 22, cx, by - 32, '#333', 1.2); poly(g, [cx, by - 32, cx + 7 + Math.sin(t * 5) * 1.5, by - 30, cx, by - 28], '#a03a2a');
  } else if (ch === 'G') {
    // Lastlight: stone huts around an ever-burning brazier
    [[-10, 0, 11], [9, 1, 11], [0, -10, 10]].sort((a, b) => a[1] - b[1]).forEach(([dx, dy, w], i) => {
      const x = cx + dx, y = by + dy;
      rrect(g, x - w / 2, y - 9, w, 9, 1, '#9a948a', OUT, 1);
      poly(g, [x - w / 2 - 2, y - 8, x, y - 15, x + w / 2 + 2, y - 8], ['#5a4a5a', '#7a3a2a', '#4a3a5a'][i], OUT, 1);
      g.fillStyle = `rgba(255,170,90,${0.55 + 0.35 * Math.sin(t * 3 + i)})`; g.fillRect(x - 1.5, y - 6, 3, 3);
    });
    const f = Math.sin(t * 9) * 1.5;
    rrect(g, cx - 3, by - 2, 6, 4, 1, '#3a3438', OUT, 1);
    g.save(); g.globalAlpha = 0.35; circle(g, cx, by - 6, 7, '#ffb04a'); g.restore();
    poly(g, [cx - 3, by - 2, cx + f * 0.4, by - 11 - f, cx + 3, by - 2], '#ff8a2a');
  } else if (ch === '7') {
    // Crownfall Abyss: a glowing crater with a crown-shard spire
    ellipse(g, cx, by - 4, 15, 8, '#1a1418', OUT, 1.2);
    g.save(); g.globalAlpha = 0.45 + 0.25 * Math.sin(t * 2); ellipse(g, cx, by - 4, 11, 5, '#ff5a2a'); g.restore();
    ellipse(g, cx, by - 4, 7, 3, '#05020a');
    poly(g, [cx - 3, by - 6, cx - 1, by - 30, cx + 1, by - 22, cx + 4, by - 34, cx + 5, by - 6], '#e8c84a', OUT, 1.2);
    for (let i = 0; i < 3; i++) circle(g, cx - 8 + i * 8 + Math.sin(t + i) * 2, by - 18 - ((t * 10 + i * 7) % 14), 1.2, `rgba(255,140,60,${0.6 + 0.4 * Math.sin(t * 3 + i)})`);
  } else if (ch === '8') {
    // Ember Caves: a cave mouth in the hills, glowing from inside
    ellipse(g, cx, by - 7, 15, 12, '#7a6a58', OUT, 1.2);
    g.beginPath(); g.moveTo(cx - 8, by); g.quadraticCurveTo(cx, by - 18, cx + 8, by); g.fillStyle = '#1a0804'; g.fill();
    g.save(); g.globalAlpha = 0.45 + 0.25 * Math.sin(t * 3); ellipse(g, cx, by - 3, 6, 4, '#ff7a2a'); g.restore();
    for (let i = 0; i < 2; i++) circle(g, cx - 3 + i * 6, by - 18 - ((t * 9 + i * 6) % 12), 1.2, `rgba(255,150,60,${0.7})`);
  } else if (ch === '9') {
    // Sea Mother's Grotto: a shell-shaped arch over dark water
    g.beginPath(); g.arc(cx, by - 2, 13, Math.PI, 0); g.fillStyle = '#d8e0e8'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(cx, by - 2); g.lineTo(cx + Math.cos(Math.PI + i * Math.PI / 5) * 13, by - 2 + Math.sin(Math.PI + i * Math.PI / 5) * 13); g.strokeStyle = '#8aa0b8'; g.lineWidth = 1; g.stroke(); }
    g.beginPath(); g.arc(cx, by, 7, Math.PI, 0); g.fillStyle = '#0a2030'; g.fill();
    circle(g, cx, by - 4, 1.8, `rgba(120,240,255,${0.6 + 0.4 * Math.sin(t * 3)})`);
  } else if (ch === '6') {
    poly(g, [cx, by - 26, cx - 17, by + 1, cx + 17, by + 1], '#e0b860', OUT, 1.3);
    poly(g, [cx, by - 26, cx + 17, by + 1, cx + 4, by + 1], '#b88a40');
    for (let i = 1; i < 4; i++) line(g, cx - 17 + i * 4.2, by + 1 - i * 6.7, cx + 17 - i * 4.2, by + 1 - i * 6.7, 'rgba(90,60,20,.4)', 1);
    rrect(g, cx - 3, by - 7, 6, 8, 2, '#1a1008');
    circle(g, cx, by - 26, 2, `rgba(255,200,80,${0.5 + 0.5 * Math.sin(t * 3)})`);
  } else if (ch === '5') {
    rrect(g, cx - 13, by - 10, 26, 12, 1, '#c8d0e8', OUT, 1.2);
    g.beginPath(); g.arc(cx, by - 10, 13, Math.PI, 0); g.fillStyle = '#3a4a8a'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    g.save(); g.translate(cx + 3, by - 18); g.rotate(-0.6); g.fillStyle = '#e8e8f0'; g.fillRect(-2, -9, 5, 12); g.restore();
    for (let i = 0; i < 3; i++) circle(g, cx - 6 + i * 6 + Math.sin(t + i) * 2, by - 30 - i * 3, 1.3, `rgba(200,230,255,${0.5 + 0.5 * Math.sin(t * 3 + i)})`);
    rrect(g, cx - 3, by - 6, 6, 8, 2, '#1a1a3a');
  } else if (ch === '1') {
    ellipse(g, cx, by - 6, 15, 13, '#6a5a48', OUT, 1.2);
    ellipse(g, cx - 4, by - 10, 8, 6, '#857360');
    g.beginPath(); g.moveTo(cx - 7, by); g.quadraticCurveTo(cx, by - 18, cx + 7, by); g.fillStyle = '#120c08'; g.fill();
    drawTreeRound(g, cx + 12, by - 4, 0.6, WPAL.forest, WPAL.forestD, WPAL.forestL);
  } else if (ch === '2') {
    poly(g, [cx - 14, by - 14, cx, by - 24, cx + 14, by - 14], '#3a8ac8', OUT, 1.2);
    rrect(g, cx - 13, by - 14, 26, 3, 1, '#e8eef4', OUT, 1);
    for (let i = 0; i < 4; i++) rrect(g, cx - 11 + i * 7, by - 11, 3, 11, 1, '#e8eef4', OUT, 0.8);
    rrect(g, cx - 14, by, 28, 3, 1, '#c8d0dc', OUT, 1);
    circle(g, cx, by - 18, 2, `rgba(120,240,255,${0.6 + 0.4 * Math.sin(t * 3)})`);
  } else if (ch === '3') {
    poly(g, [cx, by - 26, cx - 16, by + 2, cx + 16, by + 2], '#9aa8b8', OUT, 1.2);
    poly(g, [cx, by - 26, cx - 5, by - 18, cx + 5, by - 18], '#fff');
    rrect(g, cx - 7, by - 12, 14, 14, 1, '#140c08');
    g.fillStyle = '#7a5a32'; g.fillRect(cx - 9, by - 14, 18, 3); g.fillRect(cx - 9, by - 14, 3, 16); g.fillRect(cx + 6, by - 14, 3, 16);
    circle(g, cx, by - 4, 2, `rgba(255,140,40,${0.5 + 0.5 * Math.sin(t * 5)})`);
  } else if (ch === '4') {
    const glow = 0.5 + 0.5 * Math.sin(t * 2);
    g.save(); g.globalAlpha = 0.35 + glow * 0.2; circle(g, cx, by - 46, 16, '#8a3aff'); g.restore();
    poly(g, [cx - 10, by + 2, cx - 5, by - 50, cx + 5, by - 50, cx + 10, by + 2], '#2a1a3a', OUT, 1.2);
    poly(g, [cx - 5, by - 50, cx, by - 64, cx + 5, by - 50], '#1a0e28', OUT, 1.2);
    for (let i = 0; i < 4; i++) g.fillStyle = `rgba(200,120,255,${0.5 + 0.5 * Math.sin(t * 3 + i)})`, g.fillRect(cx - 1.5, by - 42 + i * 10, 3, 5);
    circle(g, cx, by - 66, 3.5, '#d0a0ff');
    rrect(g, cx - 4, by - 8, 8, 10, 3, '#08040c');
  }
}
function drawShip(g, cx, by, t, dir) {
  const bob = Math.sin(t * 3) * 1.5;
  g.save(); g.translate(cx, by + bob);
  if (dir === 'left') g.scale(-1, 1);
  ellipse(g, 0, 2, 16, 4, 'rgba(255,255,255,.35)');
  poly(g, [-15, -6, 15, -6, 11, 2, -11, 2], '#7a4a22', OUT, 1.2);
  g.fillStyle = '#a8763f'; g.fillRect(-14, -8, 28, 3);
  line(g, 0, -6, 0, -30, '#4a2a12', 2);
  poly(g, [1, -29, 13, -14, 1, -12], '#f4efe0', OUT, 1);
  poly(g, [-1, -27, -11, -14, -1, -12], '#e8e0cc', OUT, 1);
  poly(g, [0, -30, 8, -28, 0, -26], '#e8c24a');
  g.restore();
}

// ---------------- TOWN TILES ----------------
function drawTownTile(g, map, x, y, px, py, t) {
  const ch = map.at(x, y);
  const theme = map.theme;
  const base = () => {
    if (theme === 'ash') {
      fillGround(g, 'ashsand', px, py, x, y, t);
      if (hash(x, y, 41) < 0.12) { const p = 0.5 + 0.5 * Math.sin(t * 2 + x * 1.7 + y); g.strokeStyle = `rgba(255,120,50,${0.3 + p * 0.4})`; g.lineWidth = 1.3; g.beginPath(); g.moveTo(px + 6, py + 10); g.lineTo(px + 15, py + 17); g.lineTo(px + 11, py + 27); g.stroke(); }
      return;
    }
    if (theme === 'snow') { fillGround(g, 'snow', px, py, x, y, t); return; }
    if (theme === 'sand') { fillGround(g, 'desert', px, py, x, y, t); return; }
    if (theme === 'stone') { g.fillStyle = (x + y) % 2 ? '#8e938a' : '#888d84'; g.fillRect(px, py, TS, TS); if (hash(x, y) < .3) { g.fillStyle = '#7a7f76'; g.fillRect(px + hash(x, y, 1) * 26, py + hash(x, y, 2) * 26, 4, 3); } }
    else fillGround(g, 'grass', px, py, x, y, t);
  };
  switch (ch) {
    case ':': {
      g.fillStyle = theme === 'stone' ? '#a8a49a' : theme === 'ash' ? '#a09890' : theme === 'snow' ? '#cfd6e2' : theme === 'sand' ? '#d8b880' : '#d6c8a6'; g.fillRect(px, py, TS, TS);
      g.strokeStyle = theme === 'stone' || theme === 'ash' ? '#8a867c' : theme === 'snow' ? '#aeb8c8' : '#b8a882'; g.lineWidth = 1;
      const o = (y % 2) * 8;
      g.beginPath();
      for (let i = 0; i < 2; i++) { g.moveTo(px, py + i * 16 + 16); g.lineTo(px + TS, py + i * 16 + 16); }
      for (let i = 0; i < 3; i++) { g.moveTo(px + o + i * 16 - 8 + 8, py); g.lineTo(px + o + i * 16, py + 16); g.moveTo(px + o + i * 16 - 8, py + 16); g.lineTo(px + o + i * 16 - 8, py + 32); }
      g.stroke();
      break;
    }
    case 't': base(); if (theme === 'sand') drawPalm(g, px + 16, py + 31, 1.5, x + y, t); else drawTreeRound(g, px + 16, py + 30, 1.55, '#3f8a3a', '#2a6a2a', '#5fae50'); break;
    case 'm': { g.fillStyle = theme === 'sand' ? '#a8603a' : '#7a6a5a'; g.fillRect(px, py, TS, TS); poly(g, [px, py + TS, px + 4, py + 6, px + 28, py + 4, px + TS, py + TS], theme === 'sand' ? '#c8784a' : '#8f7f6f', OUT, 1); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(px + 6, py + 6, 20, 3); break; }
    case 'P': base(); drawPine(g, px + 16, py + 31, 1.35, '#3a7a5a', '#245a40', theme === 'stone' || theme === 'snow'); break;
    case 'f': {
      base();
      const cols = ['#ff6a8a', '#ffd84a', '#ffffff', '#b07aff'];
      for (let i = 0; i < 5; i++) { const fx = px + 4 + hash(x, y, i) * 24, fy = py + 4 + hash(x, y, i + 5) * 24; circle(g, fx, fy, 2.2, cols[(i + x) % 4]); circle(g, fx, fy, .8, '#fff6'); }
      break;
    }
    case 'F': {
      base();
      g.fillStyle = '#c8a070'; g.strokeStyle = OUT; g.lineWidth = 1;
      g.fillRect(px, py + 14, TS, 3); g.fillRect(px, py + 22, TS, 3);
      for (let i = 0; i < 2; i++) { rrect(g, px + 4 + i * 16, py + 10, 5, 20, 1, '#d8b080', OUT, 1); }
      break;
    }
    case '~': drawWater(g, px, py, x, y, map, t); break;
    case 'p': {
      drawWater(g, px, py, x, y, null, t);
      g.fillStyle = '#a8763f'; g.fillRect(px, py + 1, TS, 30);
      g.strokeStyle = '#6a4522'; g.lineWidth = 1;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px, py + 1 + i * 8); g.lineTo(px + TS, py + 1 + i * 8); g.stroke(); }
      break;
    }
    case 'r': {
      g.fillStyle = '#5f574f'; g.fillRect(px, py, TS, TS);
      ellipse(g, px + 10, py + 12, 12, 10, '#8a7f73', OUT, 1);
      ellipse(g, px + 24, py + 22, 10, 9, '#7a7065', OUT, 1);
      ellipse(g, px + 8, py + 9, 4, 3, '#a89e92');
      break;
    }
    case 'w': { // well
      base();
      ellipse(g, px + 16, py + 22, 12, 7, '#8a8a8a', OUT, 1.2);
      ellipse(g, px + 16, py + 21, 8, 4, '#1a3a6a');
      line(g, px + 5, py + 21, px + 5, py + 2, '#6a4522', 2.5); line(g, px + 27, py + 21, px + 27, py + 2, '#6a4522', 2.5);
      poly(g, [px + 2, py + 4, px + 16, py - 4, px + 30, py + 4], '#a0402e', OUT, 1);
      break;
    }
    case 'l': { // lamp post
      base();
      line(g, px + 16, py + 30, px + 16, py + 6, '#2a2a30', 2.5);
      const f = 0.7 + 0.3 * Math.sin(t * 7 + x);
      g.save(); g.globalAlpha = 0.25 * f; circle(g, px + 16, py + 6, 14, '#ffd27a'); g.restore();
      rrect(g, px + 12, py + 1, 8, 9, 2, '#ffe9a0', '#2a2a30', 1.5);
      break;
    }
    case 'c': { // crates
      base();
      rrect(g, px + 4, py + 12, 14, 14, 1, '#b8844a', OUT, 1); line(g, px + 4, py + 12, px + 18, py + 26, '#7a5428', 1);
      rrect(g, px + 16, py + 16, 12, 12, 1, '#a8743a', OUT, 1);
      break;
    }
    case 'a': { // anvil / forge
      base();
      rrect(g, px + 6, py + 16, 20, 6, 2, '#3a3a40', OUT, 1); rrect(g, px + 12, py + 22, 8, 8, 1, '#2a2a30', OUT, 1);
      break;
    }
    case 'b': { // brazier — Lastlight's thousand-year fire
      base();
      ellipse(g, px + 16, py + 29, 11, 3, 'rgba(0,0,0,.3)');
      poly(g, [px + 6, py + 16, px + 26, py + 16, px + 21, py + 28, px + 11, py + 28], '#4a4448', OUT, 1.2);
      rrect(g, px + 4, py + 13, 24, 4, 1, '#6a6268', OUT, 1);
      const f = Math.sin(t * 10 + x) * 2;
      g.save(); g.globalAlpha = 0.3 + 0.1 * Math.sin(t * 5); circle(g, px + 16, py + 6, 16, '#ffa040'); g.restore();
      poly(g, [px + 8, py + 14, px + 13 + f, py - 2 - f, px + 16, py + 6, px + 20 - f, py - 6 + f, px + 24, py + 14], '#ff7a2a');
      poly(g, [px + 12, py + 14, px + 16 + f * 0.5, py + 1, px + 20, py + 14], '#ffe08a');
      break;
    }
    case 'g': { // grave / stone
      base(); rrect(g, px + 10, py + 8, 12, 18, 6, '#9a9aa2', OUT, 1); line(g, px + 16, py + 12, px + 16, py + 20, '#6a6a72', 1.5); line(g, px + 13, py + 15, px + 19, py + 15, '#6a6a72', 1.5);
      break;
    }
    default: base();
  }
}

// Buildings drawn as whole structures. b = {x,y,w,h,kind,roof,label}
function drawBuilding(g, b, ox, oy, t, theme) {
  const x = b.x * TS - ox, y = b.y * TS - oy, w = b.w * TS, h = b.h * TS;
  const roofH = Math.floor(b.h * 0.55) * TS;
  const wallY = y + roofH, wallH = h - roofH;
  const stone = theme === 'stone' || theme === 'ash' || b.kind === 'jail' || b.kind === 'chapel';
  const wallC = b.wall || (stone ? '#b8b2a6' : '#f0e2c0');
  // shadow
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 6, y + h - 2, w, 6);
  // wall
  rrect(g, x + 2, wallY - 4, w - 4, wallH + 4, 2, wallC, OUT, 1.5);
  if (stone) {
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    for (let r = 0; r < wallH / 10; r++) {
      g.beginPath(); g.moveTo(x + 3, wallY + r * 10); g.lineTo(x + w - 3, wallY + r * 10); g.stroke();
      for (let c = 0; c < w / 16; c++) { const bx = x + c * 16 + (r % 2) * 8; g.beginPath(); g.moveTo(bx, wallY + r * 10); g.lineTo(bx, wallY + r * 10 + 10); g.stroke(); }
    }
  } else {
    g.fillStyle = '#8a5a32';
    g.fillRect(x + 2, wallY - 4, 4, wallH + 4); g.fillRect(x + w - 6, wallY - 4, 4, wallH + 4);
    g.fillRect(x + 2, wallY + wallH / 2 - 2, w - 4, 3);
  }
  // windows
  const doorX = x + (b.doorX - b.x) * TS;
  const nWin = Math.max(1, b.w - 2);
  for (let i = 0; i < b.w; i++) {
    const wx = x + i * TS;
    if (Math.abs(wx - doorX) < 2 || i === 0 && b.w > 3 || i === b.w - 1 && b.w > 3) continue;
    const lit = 0.6 + 0.4 * Math.sin(t * 2 + i + b.x);
    rrect(g, wx + 9, wallY + 6, 14, 12, 2, b.kind === 'jail' ? '#2a2a30' : `rgba(255,220,130,${lit})`, '#5a3a1f', 2);
    if (b.kind === 'jail') { for (let k = 0; k < 3; k++) line(g, wx + 12 + k * 4, wallY + 6, wx + 12 + k * 4, wallY + 18, '#888', 1.5); }
    else { line(g, wx + 16, wallY + 6, wx + 16, wallY + 18, '#5a3a1f', 1.5); line(g, wx + 9, wallY + 12, wx + 23, wallY + 12, '#5a3a1f', 1.5); }
  }
  // door
  const dy = y + h - 26;
  rrect(g, doorX + 8, dy, 16, 26, 7, b.kind === 'jail' ? '#3a3a44' : '#6a3e1e', OUT, 1.5);
  circle(g, doorX + 20, dy + 15, 1.5, '#e8c24a');
  // roof
  const rc = b.roof || '#b5533c';
  if (b.kind === 'chapel') {
    poly(g, [x - 4, wallY, x + w / 2, y - 2, x + w + 4, wallY], rc, OUT, 1.5);
    // steeple
    const sx = x + w / 2;
    rrect(g, sx - 9, y - 26, 18, 30, 1, wallC, OUT, 1.2);
    poly(g, [sx - 12, y - 24, sx, y - 50, sx + 12, y - 24], rc, OUT, 1.5);
    // wave/sun emblem
    circle(g, sx, y - 11, 5, '#e8c24a', OUT, 1);
  } else {
    poly(g, [x - 5, wallY + 2, x + 10, y, x + w - 10, y, x + w + 5, wallY + 2], rc, OUT, 1.5);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2;
    for (let r = 1; r < roofH / 9; r++) {
      const yy = y + r * 9, k = r * 9 / roofH;
      g.beginPath(); g.moveTo(x + 10 - 15 * k, yy); g.lineTo(x + w - 10 + 15 * k, yy); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 10, y + 2, w - 20, 3);
    if (theme === 'snow') { poly(g, [x - 3, wallY - 2, x + 10, y + 2, x + w - 10, y + 2, x + w + 3, wallY - 2, x + w - 6, wallY - 6, x + w * 0.6, wallY - 3, x + w * 0.3, wallY - 7, x + 6, wallY - 5], 'rgba(255,255,255,.92)'); }
    if (b.chimney) { rrect(g, x + w - 30, y - 8, 9, 16, 1, '#8a5a4a', OUT, 1.2); const s = (t * 0.6) % 1; g.save(); g.globalAlpha = 0.5 * (1 - s); circle(g, x + w - 26, y - 12 - s * 18, 4 + s * 4, '#ddd'); g.restore(); }
  }
  // sign
  if (b.sign) {
    const sx = doorX + 30, sy = wallY + 2;
    if (sx + 26 < x + w) {
      line(g, sx + 13, sy - 4, sx + 13, sy, '#3a2a1a', 1.5);
      rrect(g, sx, sy, 26, 18, 3, '#e8d8a8', OUT, 1.2);
      drawSignIcon(g, b.sign, sx + 13, sy + 9);
    }
  }
  if (b.label) {
    g.save(); g.font = font(10, true); g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.4)';
    g.restore();
  }
}
function drawSignIcon(g, s, x, y) {
  if (s === 'inn') { rrect(g, x - 8, y - 2, 16, 6, 2, '#7a3a8a'); circle(g, x - 5, y - 3, 2.5, '#fff'); }
  else if (s === 'item') { rrect(g, x - 4, y - 5, 8, 10, 3, '#3ab0e0', OUT, 1); g.fillStyle = '#5a3a1f'; g.fillRect(x - 2, y - 7, 4, 3); }
  else if (s === 'arms') { line(g, x - 6, y + 5, x + 6, y - 5, '#8a8a9a', 2.5); line(g, x - 6, y - 3, x - 2, y + 1, '#5a3a1f', 2); }
  else if (s === 'anchor') { line(g, x, y - 6, x, y + 5, '#3a3a50', 2); g.beginPath(); g.arc(x, y + 1, 5, 0.2, Math.PI - 0.2); g.strokeStyle = '#3a3a50'; g.lineWidth = 2; g.stroke(); circle(g, x, y - 6, 2, null, '#3a3a50', 1.5); }
  else if (s === 'jail') { for (let i = 0; i < 4; i++) line(g, x - 6 + i * 4, y - 6, x - 6 + i * 4, y + 6, '#3a3a40', 1.5); }
  else if (s === 'arena') { line(g, x - 6, y + 5, x + 6, y - 5, '#8a8a9a', 2.2); line(g, x + 6, y + 5, x - 6, y - 5, '#8a8a9a', 2.2); circle(g, x, y, 2.5, '#c0302a'); }
  else if (s === 'hall') { poly(g, [x - 7, y - 1, x, y - 7, x + 7, y - 1], '#c0442e'); g.fillStyle = '#5a3a1f'; g.fillRect(x - 5, y - 1, 10, 7); }
}

// ---------------- DUNGEON TILES ----------------
const DTHEME = {
  hollow: { wall: '#4a3f2e', top: '#352d1f', floor: '#5c5238', floor2: '#544a32', acc: '#6aa040', light: 245, bg: 'cave' },
  shrine: { wall: '#3a5a7a', top: '#22344a', floor: '#6a8aa6', floor2: '#5f7f9a', acc: '#5af0d0', light: 290, bg: 'shrine' },
  mine: { wall: '#5a3a2a', top: '#2e1e14', floor: '#6a4a36', floor2: '#5f4230', acc: '#ff8a2a', light: 240, bg: 'mine' },
  tomb: { wall: '#a8844a', top: '#4a3418', floor: '#c8a868', floor2: '#bc9c5e', acc: '#ffc04a', light: 255, bg: 'tomb' },
  astral: { wall: '#2a3a6a', top: '#141e3c', floor: '#22305a', floor2: '#1e2a50', acc: '#a8d8ff', light: 280, bg: 'astral' },
  spire: { wall: '#3a2a4e', top: '#1c1228', floor: '#2e2440', floor2: '#281f38', acc: '#c070ff', light: 260, bg: 'spire' },
  undercity: { wall: '#4a4a44', top: '#16160f', floor: '#3a3a32', floor2: '#35352e', acc: '#9adf5a', light: 230, bg: 'mine' },
  abyss: { wall: '#3a3238', top: '#120c10', floor: '#2e282c', floor2: '#2a2428', acc: '#ff8a4a', light: 235, bg: 'abyss' }
};
function drawDungeonTile(g, map, x, y, px, py, t) {
  const th = DTHEME[map.theme];
  const ch = map.at(x, y);
  if (ch === '#' || ch === undefined) {
    const below = map.at(x, y + 1);
    if (below && below !== '#') {
      // front face
      g.fillStyle = th.wall; g.fillRect(px, py, TS, TS);
      g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        g.beginPath(); g.moveTo(px, py + r * 11); g.lineTo(px + TS, py + r * 11); g.stroke();
        const o = ((r + x) % 2) * 8;
        g.beginPath(); g.moveTo(px + o + 8, py + r * 11); g.lineTo(px + o + 8, py + r * 11 + 11); g.moveTo(px + o + 24, py + r * 11); g.lineTo(px + o + 24, py + r * 11 + 11); g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px, py, TS, 3);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py + TS - 4, TS, 4);
      if (map.theme === 'tomb' && hash(x, y, 5) < 0.45) { g.strokeStyle = 'rgba(80,50,20,.55)'; g.lineWidth = 1.5; const k = Math.floor(hash(x, y, 6) * 3); g.beginPath(); if (k === 0) { g.arc(px + 16, py + 12, 4, 0, Math.PI * 2); g.moveTo(px + 16, py + 16); g.lineTo(px + 16, py + 26); } else if (k === 1) { g.moveTo(px + 9, py + 8); g.lineTo(px + 23, py + 8); g.lineTo(px + 16, py + 24); g.closePath(); } else { g.moveTo(px + 8, py + 20); g.quadraticCurveTo(px + 16, py + 4, px + 24, py + 20); g.moveTo(px + 16, py + 12); g.lineTo(px + 16, py + 26); } g.stroke(); }
      if (map.theme === 'hollow' && hash(x, y, 5) < 0.35) { // roots
        g.strokeStyle = '#7a5a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 8 + hash(x, y, 6) * 16, py); g.quadraticCurveTo(px + 12, py + 16, px + 6 + hash(x, y, 7) * 20, py + 28); g.stroke();
      }
      if ((map.theme === 'spire' || map.theme === 'astral') && hash(x, y, 5) < 0.3) { g.fillStyle = map.theme === 'astral' ? `rgba(168,216,255,${0.4 + 0.3 * Math.sin(t * 2 + x)})` : `rgba(192,112,255,${0.4 + 0.3 * Math.sin(t * 2 + x)})`; g.fillRect(px + 14, py + 6, 4, 16); }
      if (map.theme === 'abyss' && hash(x, y, 5) < 0.28) { const p = 0.5 + 0.5 * Math.sin(t * 1.6 + x * 0.7 + y); g.strokeStyle = `rgba(255,110,40,${0.3 + p * 0.5})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px + 6 + hash(x, y, 6) * 8, py + 2); g.lineTo(px + 16, py + 14); g.lineTo(px + 10 + hash(x, y, 7) * 14, py + 28); g.stroke(); }
      if (map.torches && map.torches.has(x + ',' + y)) drawTorch(g, px + 16, py + 12, t + x, th.acc);
    } else {
      g.fillStyle = th.top; g.fillRect(px, py, TS, TS);
      if (hash(x, y, 2) < 0.15) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(px + hash(x, y, 3) * 24, py + hash(x, y, 4) * 24, 6, 4); }
    }
    return;
  }
  // floor
  g.fillStyle = (x + y) % 2 ? th.floor : th.floor2; g.fillRect(px, py, TS, TS);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, TS - 1, TS - 1);
  // wall shadow on floor below wall
  if (map.at(x, y - 1) === '#') { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(px, py, TS, 7); }
  if (map.theme === 'hollow' && hash(x, y, 8) < 0.06) { circle(g, px + 10, py + 22, 3, '#b6f25a'); line(g, px + 10, py + 25, px + 10, py + 29, '#e8e0c0', 2); }
  if (map.theme === 'mine' && hash(x, y, 8) < 0.05) { circle(g, px + 8 + hash(x, y, 9) * 16, py + 20, 3, '#3a2a20'); }
  if ((map.theme === 'spire' || map.theme === 'astral') && hash(x, y, 8) < (map.theme === 'astral' ? 0.18 : 0.08)) { const s = 0.5 + 0.5 * Math.sin(t * 3 + x * y); circle(g, px + 6 + hash(x, y, 9) * 20, py + 6 + hash(x, y, 10) * 20, 1.3, `rgba(220,180,255,${s})`); }
  if (map.theme === 'abyss' && hash(x, y, 8) < 0.1) { const k = (t * 0.25 + hash(x, y, 11)) % 1; circle(g, px + 6 + hash(x, y, 9) * 20, py + 26 - k * 22, 1.3, `rgba(255,150,70,${0.8 * (1 - k)})`); }
  if (map.theme === 'shrine' && hash(x, y, 8) < 0.06) { g.strokeStyle = 'rgba(90,240,208,.4)'; g.beginPath(); g.arc(px + 16, py + 16, 6 + Math.sin(t * 2 + x) * 2, 0, Math.PI * 2); g.stroke(); }
  switch (ch) {
    case '<': {
      for (let i = 0; i < 4; i++) rrect(g, px + 4 + i * 2, py + 4 + i * 6, TS - 8 - i * 4, 6, 1, shade(th.floor, 0.25 - i * 0.12), OUT, 1);
      break;
    }
    case '>': {
      rrect(g, px + 3, py + 3, TS - 6, TS - 6, 2, '#0a0610', OUT, 1.2);
      for (let i = 0; i < 3; i++) { g.fillStyle = shade(th.floor, -0.2 - i * 0.2); g.fillRect(px + 6 + i * 2, py + 6 + i * 7, TS - 12 - i * 4, 5); }
      break;
    }
    case '~': drawWater(g, px, py, x, y, null, t); g.fillStyle = 'rgba(90,240,208,.15)'; g.fillRect(px, py, TS, TS); break;
    case 'L': {
      g.fillStyle = '#c0300a'; g.fillRect(px, py, TS, TS);
      const p = Math.sin(t * 2 + x * 1.3 + y);
      g.fillStyle = `rgba(255,${160 + p * 60},40,.8)`;
      ellipse(g, px + 10 + p * 3, py + 12, 7, 4, null); g.fill();
      ellipse(g, px + 22, py + 22 - p * 2, 6, 3, `rgba(255,220,80,.7)`);
      break;
    }
    case 'o': { // pillar
      ellipse(g, px + 16, py + 28, 11, 4, 'rgba(0,0,0,.3)');
      rrect(g, px + 7, py - 14, 18, 42, 3, shade(th.wall, 0.15), OUT, 1.2);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px + 10, py - 12, 3, 38);
      rrect(g, px + 4, py - 18, 24, 6, 2, shade(th.wall, 0.3), OUT, 1.2);
      break;
    }
    case 'k': { // crystal
      const glow = 0.5 + 0.5 * Math.sin(t * 2 + x);
      g.save(); g.globalAlpha = 0.25 + glow * 0.2; circle(g, px + 16, py + 16, 16, th.acc); g.restore();
      poly(g, [px + 16, py - 4, px + 24, py + 14, px + 16, py + 28, px + 8, py + 14], shade(th.acc, 0.2), OUT, 1.2);
      poly(g, [px + 16, py - 4, px + 16, py + 28, px + 8, py + 14], shade(th.acc, -0.15));
      break;
    }
  }
}
function drawTorch(g, x, y, t, acc) {
  rrect(g, x - 2, y, 4, 10, 1, '#5a3a1f');
  const f = Math.sin(t * 13) * 1.5;
  g.save(); g.globalAlpha = 0.25; circle(g, x, y - 4, 14 + f, '#ffb04a'); g.restore();
  poly(g, [x - 4, y, x + f * 0.6, y - 12 - f, x + 4, y], '#ff8a2a');
  poly(g, [x - 2, y, x + f * 0.4, y - 7, x + 2, y], '#ffe08a');
}
function drawChest(g, cx, by, opened) {
  ellipse(g, cx, by - 1, 12, 3, 'rgba(0,0,0,.3)');
  rrect(g, cx - 11, by - 14, 22, 13, 2, '#9a5a22', OUT, 1.5);
  g.fillStyle = '#e8c24a'; g.fillRect(cx - 11, by - 9, 22, 2);
  if (opened) {
    rrect(g, cx - 11, by - 22, 22, 7, 2, '#7a4012', OUT, 1.5);
    rrect(g, cx - 9, by - 15, 18, 3, 1, '#1a0e04');
  } else {
    rrect(g, cx - 11, by - 21, 22, 9, 4, '#b06a2a', OUT, 1.5);
    rrect(g, cx - 2, by - 14, 4, 6, 1, '#e8c24a', OUT, 1);
  }
}
function drawLantern(g, cx, by, lit, t, col = '#ffb04a') {
  // altar
  rrect(g, cx - 16, by - 10, 32, 10, 2, '#8a8478', OUT, 1.5);
  rrect(g, cx - 10, by - 22, 20, 12, 2, '#a8a294', OUT, 1.5);
  if (lit) {
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    g.save(); g.globalAlpha = 0.25 + p * 0.15; circle(g, cx, by - 38, 34, col); g.globalAlpha = 0.35; circle(g, cx, by - 38, 18, '#fff3c0'); g.restore();
  }
  line(g, cx, by - 22, cx, by - 26, '#3a3030', 2);
  rrect(g, cx - 9, by - 50, 18, 24, 4, lit ? 'rgba(255,230,150,.9)' : 'rgba(60,60,70,.8)', '#3a3030', 2.2);
  line(g, cx - 9, by - 38, cx + 9, by - 38, '#3a3030', 1.5);
  poly(g, [cx - 11, by - 50, cx, by - 58, cx + 11, by - 50], '#3a3030');
  if (lit) {
    const f = Math.sin(t * 11) * 1.5;
    poly(g, [cx - 4, by - 30, cx + f * 0.5, by - 46 - f, cx + 4, by - 30], col);
    poly(g, [cx - 2, by - 31, cx, by - 40, cx + 2, by - 31], '#fff');
  }
}

// ---------------- CHARACTERS ----------------
const NPC_PALS = {
  skin: ['#f1c9a0', '#e2b48c', '#c98e62', '#8d5a3a', '#f6d6b8'],
  hair: ['#3a2a1a', '#7a3e1d', '#d8b04a', '#1f1b2e', '#a0a0a0', '#c9472f', '#e8e0d0'],
  body: ['#a0403a', '#3a7a4a', '#4a5aa0', '#8a6a3a', '#6a4a8a', '#c08a3a', '#3a8a8a', '#7a7a7a']
};
function npcLook(seed, o = {}) {
  const r = mulberry(seed * 9973 + 7);
  const p = arr => arr[Math.floor(r() * arr.length)];
  return Object.assign({ skin: p(NPC_PALS.skin), hair: p(NPC_PALS.hair), style: p(['short', 'long', 'spiky', 'bun', 'short']), body: p(NPC_PALS.body), accent: p(['#e8c24a', '#fff', '#5a3a1f']) }, o);
}
// draws chibi character; (cx, by) = center, feet
function drawChar(g, L, cx, by, dir = 'down', step = 0, s = 1, pose = null, t = 0) {
  g.save(); g.translate(cx, by); g.scale(s, s);
  if (pose === 'ko') {
    g.rotate(dir === 'left' ? -Math.PI / 2 : Math.PI / 2);
    g.translate(0, 4);
  }
  if (pose === 'cast') g.translate(0, -2 - Math.abs(Math.sin(t * 10)) * 2);
  ellipse(g, 0, -1, 9, 3, 'rgba(0,0,0,.28)');
  const bob = step ? -1 : 0;
  const pants = L.pants || shade(L.body, -0.45);
  // legs
  const la = step === 1 ? 2 : step === 2 ? -2 : 0;
  if (dir === 'left' || dir === 'right') {
    rrect(g, -4 + la, -8, 4, 8, 1.5, pants); rrect(g, 0 - la, -8, 4, 8, 1.5, shade(pants, -0.15));
  } else {
    rrect(g, -5, -8 - Math.max(0, la), 4, 8, 1.5, pants); rrect(g, 1, -8 - Math.max(0, -la), 4, 8, 1.5, pants);
  }
  g.translate(0, bob);
  const back = dir === 'up';
  const flip = dir === 'left' ? -1 : 1;
  // cape behind
  if (L.cape && !back) {
    poly(g, [-7, -19, 7, -19, 9 - (dir === 'right' ? 6 : 0) + (dir === 'left' ? 4 : 0), -5, -9 + (dir === 'left' ? 6 : 0) - (dir === 'right' ? 4 : 0), -5], shade(L.cape, -0.2));
  }
  // robe / body
  if (L.robe) {
    poly(g, [-6, -20, 6, -20, 9, -5, -9, -5], L.body, OUT, 1.2);
  } else {
    rrect(g, -7, -20, 14, 13, 4, L.body, OUT, 1.2);
  }
  g.fillStyle = L.accent; g.fillRect(-7, -11, 14, 2);
  if (L.cape && back) poly(g, [-8, -20, 8, -20, 10, -4, -10, -4], L.cape, OUT, 1.2);
  // arms
  const sw = step === 1 ? 2 : step === 2 ? -2 : 0;
  if (pose === 'cast') {
    line(g, -6, -17, -9, -27, L.body, 4); line(g, 6, -17, 9, -27, L.body, 4);
    circle(g, -9, -28, 2.3, L.skin); circle(g, 9, -28, 2.3, L.skin);
  } else if (pose === 'attack') {
    line(g, 5 * flip, -17, 12 * flip, -14, L.body, 4); circle(g, 12 * flip, -14, 2.3, L.skin);
  } else if (dir === 'left' || dir === 'right') {
    line(g, 0, -17, sw * flip, -10, shade(L.body, -0.1), 4); circle(g, sw * flip, -9, 2.2, L.skin);
  } else {
    line(g, -7, -17, -8, -10 + sw, shade(L.body, -0.1), 3.5); line(g, 7, -17, 8, -10 - sw, shade(L.body, -0.1), 3.5);
    circle(g, -8, -9 + sw, 2.2, L.skin); circle(g, 8, -9 - sw, 2.2, L.skin);
  }
  // head
  const hy = -29;
  if (L.hood) {
    circle(g, 0, hy, 10.5, shade(L.body, -0.25), OUT, 1.2);
  }
  circle(g, 0, hy, 9, L.skin, OUT, 1.2);
  // hair
  const hc = L.hair, hd = shade(L.hair, -0.25);
  if (!L.hood) {
    if (L.style === 'bald') {
      if (!back) { poly(g, [-9, hy, -8, hy - 4, -6, hy + 1], hc); poly(g, [9, hy, 8, hy - 4, 6, hy + 1], hc); }
      else { g.beginPath(); g.arc(0, hy + 2, 8, 0.2, Math.PI - 0.2); g.fillStyle = hc; g.fill(); }
    } else {
      g.beginPath();
      if (back) { g.arc(0, hy, 9.5, 0, Math.PI * 2); }
      else if (dir === 'down') { g.arc(0, hy - 1, 9.5, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(9, hy - 1); g.quadraticCurveTo(0, hy - 6, -9, hy - 1); }
      else { g.arc(0, hy - 1, 9.5, Math.PI * 0.95, Math.PI * 2.05); g.lineTo(-4 * flip * -1, hy - 4); }
      g.fillStyle = hc; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
      if (L.style === 'spiky') {
        poly(g, [-9, hy - 3, -11, hy - 10, -5, hy - 8, -3, hy - 13, 1, hy - 9, 5, hy - 13, 6, hy - 7, 11, hy - 9, 9, hy - 2], hc, OUT, 1.2);
      }
      if (L.style === 'long') {
        if (back) rrect(g, -9, hy, 18, 14, 4, hc, OUT, 1.2);
        else if (dir === 'down') { rrect(g, -11, hy - 2, 5, 15, 2, hc, OUT, 1); rrect(g, 6, hy - 2, 5, 15, 2, hc, OUT, 1); }
        else rrect(g, -4 * flip - 5, hy - 2, 9, 15, 3, hc, OUT, 1);
      }
      if (L.style === 'bun') circle(g, 0, hy - 10, 4.5, hc, OUT, 1.2);
      if (L.style === 'pony') { const px = dir === 'down' ? 0 : -9 * flip; if (dir !== 'down') ellipse(g, px, hy + 3, 3.5, 7, hd, OUT, 1); else ellipse(g, 8, hy + 4, 3, 6, hd, OUT, 1); }
    }
  } else {
    // hood front opening
    if (!back) { g.beginPath(); g.arc(0, hy - 1, 10.5, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(6, hy - 4); g.quadraticCurveTo(0, hy - 7, -6, hy - 4); g.closePath(); g.fillStyle = shade(L.body, -0.25); g.fill(); }
    else circle(g, 0, hy, 10.5, shade(L.body, -0.25), OUT, 1.2);
  }
  if (L.beard && !back) {
    g.beginPath(); g.moveTo(-6, hy + 2); g.quadraticCurveTo(0, hy + 16, 6, hy + 2); g.quadraticCurveTo(0, hy + 6, -6, hy + 2);
    g.fillStyle = L.hair; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
  }
  // face
  if (!back) {
    if (dir === 'down') {
      ellipse(g, -3.5, hy + 1, 1.4, 2, '#1a1020'); ellipse(g, 3.5, hy + 1, 1.4, 2, '#1a1020');
      circle(g, -5.5, hy + 4, 1.5, 'rgba(255,120,120,.35)'); circle(g, 5.5, hy + 4, 1.5, 'rgba(255,120,120,.35)');
    } else {
      ellipse(g, 4 * flip, hy + 1, 1.4, 2, '#1a1020');
      circle(g, 6 * flip, hy + 4, 1.4, 'rgba(255,120,120,.35)');
    }
  }
  // hat
  if (L.hat === 'witch') {
    poly(g, [-12, hy - 5, 12, hy - 5, 7, hy - 8, 2, hy - 24, -1, hy - 22, -7, hy - 8], shade(L.body, -0.3), OUT, 1.2);
    g.fillStyle = L.accent; g.fillRect(-7, hy - 9, 14, 2);
  }
  if (L.hat === 'helm') {
    g.beginPath(); g.arc(0, hy - 1, 10, Math.PI, 0); g.fillStyle = '#9aa0aa'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
  }
  if (L.hat === 'cap') { g.beginPath(); g.arc(0, hy - 2, 9.5, Math.PI, 0); g.fillStyle = L.accent; g.fill(); g.stroke(); }
  g.restore();
}
function drawWeapon(g, kind, x, y, ang, s = 1) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  if (kind === 'sword') {
    poly(g, [-2, 0, 2, 0, 2, -24, 0, -28, -2, -24], '#dfe6f0', OUT, 1);
    g.fillStyle = '#e8c24a'; g.fillRect(-6, -1, 12, 3); g.fillStyle = '#5a3a1f'; g.fillRect(-1.5, 2, 3, 6);
  } else if (kind === 'staff') {
    line(g, 0, 10, 0, -22, '#7a4a22', 3); circle(g, 0, -25, 4.5, '#ff7a3a', OUT, 1); circle(g, -1, -26, 1.5, '#ffe08a');
  } else if (kind === 'mace') {
    line(g, 0, 8, 0, -16, '#6a5a4a', 3); circle(g, 0, -19, 5.5, '#b8c0c8', OUT, 1.2);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; line(g, Math.cos(a) * 5, -19 + Math.sin(a) * 5, Math.cos(a) * 8, -19 + Math.sin(a) * 8, '#b8c0c8', 2); }
  } else if (kind === 'dagger') {
    poly(g, [-1.5, 0, 1.5, 0, 1.5, -13, 0, -16, -1.5, -13], '#e6ecf4', OUT, 1);
    g.fillStyle = '#3a3a3a'; g.fillRect(-4, -1, 8, 2); g.fillStyle = '#5a3a1f'; g.fillRect(-1.2, 1, 2.4, 5);
  }
  g.restore();
}

// ---------------- MONSTERS ----------------
// draw at (x, by) feet, facing right. state: {t, flash, hurt}
function drawMonster(g, def, x, by, st = {}) {
  const t = st.t || 0, s = (def.size || 1) * (st.scale || 1);
  const c = def.c;
  g.save(); g.translate(x, by); g.scale(s, s);
  if (st.alpha !== undefined) g.globalAlpha = st.alpha;
  const shadow = () => ellipse(g, 0, -1, 26, 5, 'rgba(0,0,0,.3)');
  const eyes = (ex, ey, r = 3, col = '#fff', pc = '#1a1020', gap = 8) => {
    ellipse(g, ex, ey, r, r * 1.2, col, OUT, 1); ellipse(g, ex + gap, ey, r, r * 1.2, col, OUT, 1);
    circle(g, ex + r * 0.4, ey, r * 0.5, pc); circle(g, ex + gap + r * 0.4, ey, r * 0.5, pc);
  };
  const art = MONSTER_ART[def.fam];
  if (art) art(g, def, t, { shadow, eyes }); else circle(g, 0, -20, 20, c[0], OUT, 2);
  g.restore();
  if (st.flash) { // white flash overlay via composite
    g.save(); g.globalCompositeOperation = 'source-atop'; g.restore();
  }
}
// Registries: every monster family (src/monsters/*.js) and battle background (src/backgrounds/*.js)
// registers itself here, as do the 1.7 additions in deep_art.js
const MONSTER_ART = {}, MONSTER_SIZE = {}, BATTLE_BGS = {};
// sizes come from each family's file in src/monsters/ (or deep_art.js); [width, height] at size 1
function monsterHeight(def) { return (MONSTER_SIZE[def.fam] ? MONSTER_SIZE[def.fam][1] : 60) * (def.size || 1); }
function monsterWidth(def) { return (MONSTER_SIZE[def.fam] ? MONSTER_SIZE[def.fam][0] : 60) * (def.size || 1); }

// ---------------- BATTLE BACKGROUNDS ----------------
function drawBattleBG(g, kind, t) {
  const sky = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, 300); };
  const ground = (a, b, y = 270) => { const gr = g.createLinearGradient(0, y, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, y, W, H - y); };
  const hills = (y, amp, col, seed, freq = 0.012) => {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed * 3) * amp * 0.4);
    g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
  };
  const stars = (n, seed, a = 1) => { for (let i = 0; i < n; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + i); circle(g, hash(i, seed) * W, hash(i, seed + 1) * 240, hash(i, seed + 2) * 1.4 + 0.4, `rgba(255,255,255,${tw * a})`); } };
  const art = BATTLE_BGS[kind];
  if (art) art(g, t, { sky, ground, hills, stars }, kind); else { sky('#333', '#666'); ground('#444', '#222'); }
}

// Title screen art
function drawTitleArt(g, t) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#060818'); gr.addColorStop(0.6, '#1a1840'); gr.addColorStop(1, '#3a2040'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + hash(i, 3)) + i)); circle(g, hash(i, 1) * W, hash(i, 2) * 300, hash(i, 4) * 1.3 + 0.3, `rgba(255,255,255,${tw})`); }
  // moon
  circle(g, 520, 80, 30, '#f4ecd0'); circle(g, 532, 72, 27, '#0d0f28');
  // mountains
  const mtn = (y, col, seed, amp) => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, y - Math.abs(Math.sin(x * 0.01 + seed)) * amp - hash(x, seed) * 30); g.lineTo(W, H); g.fill(); g.fillStyle = col; g.fill(); };
  g.fillStyle = '#1c1a3a'; mtn(330, '#1c1a3a', 1, 90);
  g.fillStyle = '#141228'; mtn(380, '#141228', 2, 60);
  // hill with lantern
  g.beginPath(); g.moveTo(160, H); g.quadraticCurveTo(320, 340, 480, H); g.fillStyle = '#0c0a18'; g.fill();
  const p = 0.5 + 0.5 * Math.sin(t * 2);
  g.save();
  const lg = g.createRadialGradient(320, 350, 5, 320, 350, 220); lg.addColorStop(0, `rgba(255,190,90,${0.45 + p * 0.1})`); lg.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = lg; g.fillRect(0, 100, W, H - 100);
  g.restore();
  drawLantern(g, 320, 392, true, t);
  // fireflies
  for (let i = 0; i < 24; i++) {
    const x = 320 + Math.sin(t * 0.4 + i * 1.7) * (90 + hash(i, 5) * 200), y = 360 + Math.cos(t * 0.5 + i * 2.1) * (40 + hash(i, 6) * 60);
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    g.save(); g.globalAlpha = a * 0.4; circle(g, x, y, 5, '#ffe08a'); g.restore(); circle(g, x, y, 1.5, `rgba(255,240,170,${a})`);
  }
}

// ---------------- EXPANSION ART ----------------
function drawWhirl(g, cx, cy, t) {
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.2) {
      const r = 3 + a * 3.2, aa = a + t * 3 + i * Math.PI / 2;
      const x = cx + Math.cos(aa) * r, y = cy + Math.sin(aa) * r * 0.55;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = i % 2 ? 'rgba(220,240,255,.75)' : 'rgba(20,60,120,.6)'; g.lineWidth = 2; g.stroke();
  }
  circle(g, cx, cy, 3, '#0a2040');
}
function drawCat(g, cx, by, t) {
  ellipse(g, cx, by - 1, 9, 2.5, 'rgba(0,0,0,.3)');
  g.beginPath(); g.moveTo(cx + 6, by - 4); g.quadraticCurveTo(cx + 16, by - 8 + Math.sin(t * 4) * 3, cx + 12, by - 16); g.strokeStyle = '#e8903a'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
  ellipse(g, cx + 1, by - 6, 8, 5.5, '#f0a050', OUT, 1.2);
  circle(g, cx - 5, by - 13, 6, '#f0a050', OUT, 1.2);
  poly(g, [cx - 10, by - 15, cx - 9, by - 22, cx - 6, by - 18], '#f0a050', OUT, 1);
  poly(g, [cx - 3, by - 18, cx - 1, by - 23, cx + 0, by - 16], '#f0a050', OUT, 1);
  circle(g, cx - 7, by - 13, 1.1, '#1a1020'); circle(g, cx - 3, by - 13, 1.1, '#1a1020');
  line(g, cx - 5, by - 10.5, cx - 5, by - 10, '#c05a5a', 1.5);
}
// Arin's roadside lamps on the world map
function drawRoadLamp(g, cx, by, lit, t) {
  ellipse(g, cx, by - 1, 6, 2, 'rgba(0,0,0,.3)');
  line(g, cx, by, cx, by - 20, '#2a2a30', 2.5);
  if (lit) { g.save(); g.globalAlpha = 0.3 + 0.1 * Math.sin(t * 5 + cx); circle(g, cx, by - 22, 12, '#ffd27a'); g.restore(); }
  rrect(g, cx - 4, by - 27, 8, 8, 2, lit ? '#ffe9a0' : '#3a3a48', '#2a2a30', 1.5);
  poly(g, [cx - 5, by - 27, cx, by - 31, cx + 5, by - 27], '#2a2a30');
}
// Riddle braziers in the Ember Caves
function drawRiddleFire(g, cx, by, solved, t) {
  ellipse(g, cx, by - 1, 11, 3, 'rgba(0,0,0,.3)');
  poly(g, [cx - 10, by - 14, cx + 10, by - 14, cx + 6, by - 2, cx - 6, by - 2], '#5a4a48', OUT, 1.2);
  const f = Math.sin(t * 9 + cx) * 2, col = solved ? '#7ad8ff' : '#ff7a2a';
  g.save(); g.globalAlpha = 0.3; circle(g, cx, by - 22, 14, col); g.restore();
  poly(g, [cx - 7, by - 14, cx + f * 0.5, by - 34 - f, cx + 7, by - 14], col);
  poly(g, [cx - 3, by - 14, cx, by - 24, cx + 3, by - 14], '#fff4c0');
}
// The trapdoor in the Ironhold jail
function drawHatch(g, cx, by) {
  rrect(g, cx - 12, by - 22, 24, 20, 2, '#5a3a1f', OUT, 1.2);
  for (let i = 1; i < 4; i++) line(g, cx - 12 + i * 6, by - 22, cx - 12 + i * 6, by - 2, '#3a2412', 1);
  circle(g, cx + 6, by - 12, 2, '#c0a040');
}
function drawGlint(g, cx, by, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 5);
  g.save(); g.globalAlpha = 0.35 + p * 0.3; circle(g, cx, by - 10, 12, '#fff6c0'); g.restore();
  const r = 6 + p * 4;
  poly(g, [cx, by - 10 - r, cx + 2, by - 12, cx + r, by - 10, cx + 2, by - 8, cx, by - 10 + r, cx - 2, by - 8, cx - r, by - 10, cx - 2, by - 12], '#fffbe0');
}

// t: the field's clock in seconds, so cached tiles can tell that palms move (see tilecache.js)
function drawPalm(g, x, y, s, seed, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3, -10, 1, -20); g.strokeStyle = '#8a5a2a'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
  const sw = Math.sin(t * 1.5 + seed) * 0.08;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.75 + sw;
    g.beginPath(); g.moveTo(1, -20);
    g.quadraticCurveTo(1 + Math.cos(a) * 8, -20 + Math.sin(a) * 8 - 3, 1 + Math.cos(a) * 13, -20 + Math.sin(a) * 9 + 4);
    g.strokeStyle = i % 2 ? '#3a8a3a' : '#2f7a35'; g.lineWidth = 3.2; g.stroke();
  }
  circle(g, 0, -19, 1.8, '#6a3a1a');
  g.restore();
}
function drawCactus(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rrect(g, -2.5, -16, 5, 16, 2.5, '#4a9a4a', OUT, 1);
  rrect(g, -8, -11, 4, 7, 2, '#4a9a4a', OUT, 1); rrect(g, -6, -6, 4, 2.5, 1, '#4a9a4a');
  rrect(g, 4, -13, 4, 6, 2, '#4a9a4a', OUT, 1); rrect(g, 2, -9, 4, 2.5, 1, '#4a9a4a');
  circle(g, 0, -16.5, 1.5, '#ff8ab0');
  g.restore();
}
function drawMesa(g, px, py, x, y) {
  const h = hash(x, y, 13);
  poly(g, [px - 1, py + TS, px + 3, py - 2 - h * 6, px + TS - 3, py - 4 - h * 4, px + TS + 1, py + TS], '#b8683a', OUT, 1.2);
  poly(g, [px + 3, py - 2 - h * 6, px + TS - 3, py - 4 - h * 4, px + TS - 6, py + 4, px + 6, py + 5], '#d8884a');
  line(g, px + 4, py + 14, px + TS - 4, py + 12, 'rgba(90,40,20,.4)', 1.5);
  line(g, px + 5, py + 22, px + TS - 5, py + 21, 'rgba(90,40,20,.3)', 1.5);
}
function drawAirship(g, cx, by, t, dir, flying) {
  const bob = flying ? Math.sin(t * 2.5) * 2 : 0;
  g.save(); g.translate(cx, by + bob);
  if (dir === 'left') g.scale(-1, 1);
  // envelope
  ellipse(g, 0, -34, 22, 10, '#c8443a', OUT, 1.5);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -34, 22, 4, 0, 0, Math.PI * 2); g.stroke();
  line(g, -22, -34, 22, -34, 'rgba(0,0,0,.25)', 1);
  poly(g, [-22, -34, -30, -42, -28, -34, -30, -26], '#e8c24a', OUT, 1);
  // ropes & gondola
  line(g, -10, -25, -9, -14, '#5a3a1f', 1); line(g, 10, -25, 9, -14, '#5a3a1f', 1);
  poly(g, [-14, -14, 14, -14, 11, -6, -11, -6], '#8a5a2a', OUT, 1.2);
  g.fillStyle = '#e8c24a'; g.fillRect(-13, -14, 26, 2);
  // propeller
  const pr = Math.sin(t * 40) * 6;
  line(g, 15, -10, 18, -10, '#5a3a1f', 2); line(g, 19, -10 - pr, 19, -10 + pr, '#ddd', 2);
  g.restore();
}
