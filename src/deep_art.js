'use strict';
// ============================================================
//  DEEP ART (1.7): the sea floor, Nerith's mood, the diving bell, lanternmoths,
//  the jelly / angler / tide monster families and three battle backgrounds.
//  Registers itself with art.js through MONSTER_ART, MONSTER_SIZE, BATTLE_BGS and DTHEME.
// ============================================================

DTHEME.palace = { wall: '#2a5a6a', top: '#0e2630', floor: '#3a6a74', floor2: '#35626b', acc: '#5af0d0', light: 270, bg: 'palace' };
DTHEME.hadal = { wall: '#1a1a2e', top: '#06060e', floor: '#1c1c34', floor2: '#18182e', acc: '#c070ff', light: 255, bg: 'hadal' };

const DEEP_PAL = { sand: '#1e3a4a', sandD: '#183242', sandL: '#2a4a5a', rock: '#0e1e2a', rockF: '#1a2e3c', rockL: '#28465a' };

function drawDeepTile(g, m, x, y, px, py, t) {
  const ch = m.at(x, y), P = DEEP_PAL;
  if (ch === '#' || ch === undefined) {
    const below = m.at(x, y + 1);
    if (below && below !== '#') {
      g.fillStyle = P.rockF; g.fillRect(px, py, TS, TS);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const yy = py + 6 + i * 9 + hash(x, y, i) * 3; g.beginPath(); g.moveTo(px, yy); g.quadraticCurveTo(px + 16, yy + (hash(x, i, 5) - 0.5) * 8, px + TS, yy); g.stroke(); }
      g.fillStyle = 'rgba(90,240,208,.06)'; g.fillRect(px, py, TS, 3);
      if (hash(x, y, 9) < 0.18) { const k = 0.5 + 0.5 * Math.sin(t * 2 + x); circle(g, px + 8 + hash(x, y, 10) * 16, py + 14, 2, `rgba(120,255,220,${0.25 + k * 0.4})`); }
    } else {
      g.fillStyle = P.rock; g.fillRect(px, py, TS, TS);
      if (hash(x, y, 2) < 0.2) { g.fillStyle = 'rgba(40,80,100,.25)'; g.fillRect(px + hash(x, y, 3) * 22, py + hash(x, y, 4) * 22, 8, 5); }
    }
    return;
  }
  // sand floor with ripples
  g.fillStyle = (x + y) % 2 ? P.sand : P.sandD; g.fillRect(px, py, TS, TS);
  g.strokeStyle = 'rgba(120,200,220,.08)'; g.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) { const yy = py + 9 + i * 13; g.beginPath(); g.moveTo(px + 2, yy); g.quadraticCurveTo(px + 16, yy - 4, px + 30, yy); g.stroke(); }
  if (m.at(x, y - 1) === '#') { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px, py, TS, 6); }
  if (hash(x, y, 7) < 0.08) { ellipse(g, px + 8 + hash(x, y, 8) * 16, py + 22, 3, 1.6, '#e8e0d0'); }   // shells
  switch (ch) {
    case 'k': { // kelp
      for (let i = 0; i < 3; i++) {
        const bx = px + 6 + i * 10, sw = Math.sin(t * 1.6 + x + i) * 5;
        g.strokeStyle = i % 2 ? '#2a7a4a' : '#3a9a5a'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx, py + TS); g.quadraticCurveTo(bx + sw, py + 14, bx + sw * 1.4, py - 6); g.stroke();
        ellipse(g, bx + sw * 0.8, py + 10, 3, 1.8, '#4aba6a', null, 1, 0.6);
      }
      break;
    }
    case 'o': { // boulder
      ellipse(g, px + 16, py + 26, 14, 4, 'rgba(0,0,0,.35)');
      ellipse(g, px + 16, py + 17, 13, 11, P.rockL, OUT, 1.5);
      ellipse(g, px + 12, py + 12, 5, 3, 'rgba(255,255,255,.08)');
      if (hash(x, y, 3) < 0.5) ellipse(g, px + 20, py + 9, 4, 2, '#3a8a5a');
      break;
    }
    case 'c': { // coral
      const col = ['#e87a8a', '#f0a060', '#c070ff', '#5af0d0'][Math.floor(hash(x, y, 4) * 4)];
      g.strokeStyle = col; g.lineWidth = 3.5; g.lineCap = 'round';
      const branch = (x0, y0, a, l, d) => { if (d > 3) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); branch(x1, y1, a - 0.5, l * 0.7, d + 1); branch(x1, y1, a + 0.5, l * 0.7, d + 1); };
      branch(px + 16, py + 30, -Math.PI / 2, 10, 0);
      break;
    }
    case 'v': { // vent
      ellipse(g, px + 16, py + 22, 7, 3, '#0a1a22', OUT, 1);
      for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i * 0.25 + hash(x, y, i)) % 1; circle(g, px + 16 + Math.sin(k * 9 + i) * 3, py + 20 - k * 30, 1.5 + k * 1.5, `rgba(200,240,255,${0.7 * (1 - k)})`); }
      break;
    }
    case 'w': { // wreck
      poly(g, [px - 2, py + 28, px + 34, py + 28, px + 30, py + 12, px + 2, py + 16], '#4a3424', OUT, 1.5);
      for (let i = 0; i < 4; i++) line(g, px + 4 + i * 7, py + 15, px + 5 + i * 7, py + 28, '#2a1c14', 1.2);
      line(g, px + 22, py + 14, px + 26, py - 10, '#3a2a1a', 3);
      poly(g, [px + 26, py - 8, px + 36, py + 2, px + 26, py + 4], 'rgba(200,190,160,.35)');
      break;
    }
    case 'u': { // the diving bell's line, back to the surface
      g.save(); g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3); ellipse(g, px + 16, py + 20, 13, 5, '#9ad8ff'); g.restore();
      line(g, px + 16, py - 200, px + 16, py + 18, '#c8a868', 2);
      poly(g, [px + 11, py + 10, px + 21, py + 10, px + 16, py + 3], '#ffe9a8');
      break;
    }
    case 'H': { // Nerith, in its bubble
      g.save(); g.globalAlpha = 0.25 + 0.05 * Math.sin(t * 2); circle(g, px + 16, py + 14, 22, '#9ad8ff'); g.restore();
      for (const [dx, h] of [[-8, 14], [0, 22], [8, 16]]) { rrect(g, px + 16 + dx - 3, py + 28 - h, 6, h, 1, '#b8d0d4', OUT, 1); poly(g, [px + 16 + dx - 4, py + 28 - h, px + 16 + dx, py + 22 - h, px + 16 + dx + 4, py + 28 - h], '#3a8a9a'); }
      g.strokeStyle = 'rgba(200,240,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px + 16, py + 22, 18, Math.PI, 0); g.stroke();
      break;
    }
    case '0': { // the Drowned Palace
      rrect(g, px + 2, py + 12, 28, 16, 1, '#2a5a6a', OUT, 1.2);
      for (let i = 0; i < 4; i++) line(g, px + 6 + i * 7, py + 14, px + 6 + i * 7, py + 28, '#5a9aa8', 2);
      poly(g, [px, py + 12, px + 16, py + 2, px + 32, py + 12], '#1a4a5a', OUT, 1.2);
      circle(g, px + 16, py + 8, 2, '#5af0d0');
      break;
    }
    case 'I': { // the Hadal Rift
      ellipse(g, px + 16, py + 18, 15, 9, '#020208', '#c070ff', 1.5);
      g.save(); g.globalAlpha = 0.4 + 0.3 * Math.sin(t * 2); ellipse(g, px + 16, py + 18, 9, 4, '#4a1a6a'); g.restore();
      break;
    }
  }
}
// darkness around the bell's lamp, with glows at vents, wrecks and the city
function drawDeepLight(g, m, cx, cy, psx, psy, t) {
  const R = 230 + Math.sin(t * 2) * 6;
  const gr = g.createRadialGradient(psx, psy - 14, R * 0.25, psx, psy - 14, R);
  gr.addColorStop(0, 'rgba(2,10,20,0)'); gr.addColorStop(1, 'rgba(2,10,20,.86)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  const x0 = Math.floor(cx / TS) - 4, y0 = Math.floor(cy / TS) - 4;
  for (let y = y0; y <= y0 + VH + 8; y++) for (let x = x0; x <= x0 + VW + 8; x++) {
    const ch = m.at(x, y);
    const col = { v: '120,255,220', H: '150,220,255', 0: '90,240,208', I: '192,112,255', u: '154,216,255' }[ch];
    if (!col) continue;
    const r = ch === 'H' ? 160 : ch === 'v' ? 60 : 110;
    const sx = x * TS - cx + 16, sy = y * TS - cy + 14;
    const lg = g.createRadialGradient(sx, sy, 3, sx, sy, r);
    lg.addColorStop(0, `rgba(${col},.4)`); lg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = lg; g.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  g.restore();
  // marine snow
  for (let i = 0; i < 40; i++) { const k = (t * 0.05 + hash(i, 71)) % 1; circle(g, (hash(i, 72) * W + Math.sin(t + i) * 10) % W, k * H, 1 + hash(i, 73), `rgba(220,240,255,${0.25 + 0.2 * hash(i, 74)})`); }
}
// a blue, watery tint for Nerith; a dim lamplit gloom for the Undermarket
function drawTownMood(g, m, t) {
  if (m.underwater) {
    g.fillStyle = 'rgba(20,90,150,.2)'; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const x = (i * 130 + Math.sin(t * 0.3 + i) * 60) % (W + 100) - 50; poly(g, [x, 0, x + 40, 0, x + 120, H, x + 60, H], 'rgba(150,220,255,.05)'); }
    g.restore();
    for (let i = 0; i < 24; i++) { const k = (t * 0.12 + hash(i, 91)) % 1; circle(g, hash(i, 92) * W + Math.sin(t * 2 + i) * 6, H - k * H, 1.5 + hash(i, 93) * 2, null, `rgba(220,245,255,${0.5 * (1 - k)})`, 1); }
  } else if (m.underground) {
    const gr = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
    gr.addColorStop(0, 'rgba(10,8,4,.15)'); gr.addColorStop(1, 'rgba(10,8,4,.7)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
}
function drawDiveSpot(g, x, y, t) {
  ellipse(g, x, y, 26, 16, 'rgba(2,10,24,.7)');
  ellipse(g, x, y, 34, 21, null, 'rgba(2,10,24,.35)', 4);
  for (let r = 0; r < 3; r++) { const k = (t * 0.4 + r / 3) % 1; g.strokeStyle = `rgba(90,240,208,${0.6 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 8 + k * 26, 5 + k * 16, 0, 0, Math.PI * 2); g.stroke(); }
}
function drawBell(g, cx, by, t) {
  const bob = Math.sin(t * 2) * 2;
  line(g, cx, by - 120, cx, by - 40 + bob, '#c8a868', 2);
  ellipse(g, cx, by - 1, 14, 4, 'rgba(0,0,0,.35)');
  g.beginPath(); g.moveTo(cx - 13, by - 6 + bob); g.bezierCurveTo(cx - 14, by - 30 + bob, cx - 8, by - 40 + bob, cx, by - 40 + bob); g.bezierCurveTo(cx + 8, by - 40 + bob, cx + 14, by - 30 + bob, cx + 13, by - 6 + bob); g.closePath();
  const gr = g.createLinearGradient(cx - 14, 0, cx + 14, 0); gr.addColorStop(0, '#8a6a2a'); gr.addColorStop(0.4, '#e8c060'); gr.addColorStop(1, '#7a5a22');
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
  line(g, cx - 13, by - 6 + bob, cx + 13, by - 6 + bob, '#5a4218', 3);
  circle(g, cx, by - 22 + bob, 5.5, '#9ad8ff', '#5a4218', 2);
  g.save(); g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5); circle(g, cx, by - 22 + bob, 3, '#fff8d0'); g.restore();
  for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; circle(g, cx + 8 + Math.sin(k * 8) * 2, by - 40 - k * 30 + bob, 1.5 + k, null, `rgba(220,245,255,${1 - k})`, 1); }
}
function drawMoth(g, cx, cy, t, dir, look) {
  const f = Math.sin(t * 16), flip = dir === 'left' ? -1 : 1;
  g.save(); g.translate(cx, cy + Math.sin(t * 4) * 2); g.scale(flip, 1);
  for (const s of [-1, 1]) {
    g.save(); g.scale(s, 1);
    poly(g, [2, -4, 22, -16 - f * 8, 26, -2, 18, 6, 4, 4], '#e8dcc8', OUT, 1.2);
    poly(g, [3, 2, 16, 8 + f * 3, 12, 14, 3, 8], '#d8c8b0', OUT, 1.2);
    circle(g, 14, -7 - f * 3, 3, '#ffd27a');
    g.restore();
  }
  ellipse(g, 0, 2, 4, 10, '#c8b8a0', OUT, 1.2);
  line(g, -2, -8, -6, -16, '#8a7a6a', 1); line(g, 2, -8, 6, -16, '#8a7a6a', 1);
  // rider: a small head and shoulders
  circle(g, 0, -12, 5, look.skin, OUT, 1); g.fillStyle = look.hair; g.beginPath(); g.arc(0, -13, 5, Math.PI, 0); g.fill();
  rrect(g, -5, -8, 10, 6, 2, look.body, OUT, 1);
  g.restore();
  g.save(); g.globalAlpha = 0.25; circle(g, cx, cy, 18, '#ffd27a'); g.restore();
}
function drawLampMoths(g, sx, sy, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * (1.6 + i * 0.4) + i * 2.1, x = sx + Math.cos(a) * (9 + i * 3), y = sy - 24 + Math.sin(a * 1.3) * 6;
    const f = Math.sin(t * 20 + i) * 2;
    poly(g, [x, y, x - 4, y - 2 - f, x - 3, y + 2], '#f0e8d8'); poly(g, [x, y, x + 4, y - 2 - f, x + 3, y + 2], '#f0e8d8');
  }
}

// ---------- the sea floor on the map screen ----------
function drawDeepMap(g, ox, oy, ow, oh, wsc) {
  const m = getMap('deep'); applyDeepFlags(m);
  const sc = wsc * 2, t = performance.now() / 1000;
  g.fillStyle = 'rgba(2,8,18,.94)'; g.fillRect(0, 0, W, H);
  drawWindow(g, ox - 10, oy - 34, ow + 20, oh + 58);
  text(g, tl('The Sea Floor'), ox, oy - 26, { size: 15, bold: true, color: '#9ad8ff' });
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = m.at(x, y);
    g.fillStyle = { '#': '#0a1620', k: '#1e5a3a', o: '#1a2e3c', c: '#7a3a5a', w: '#5a3a24' }[c] || '#1e4a5a';
    g.fillRect(ox + x * sc, oy + y * sc, sc + 0.5, sc + 0.5);
  }
  for (const d of DIVE_SPOTS) { const x = ox + d.x / 2 * sc + sc / 2, y = oy + d.y / 2 * sc + sc / 2; poly(g, [x - 4, y + 3, x + 4, y + 3, x, y - 4], '#ffe9a8', OUT, 1); }
  for (const k in DEEP_LOC) {
    const L = DEEP_LOC[k]; if (k === 'I' && !G.flags.boss_palace) continue;
    const x = ox + L.x * sc + sc / 2, y = oy + L.y * sc + sc / 2;
    circle(g, x, y, 5, L.town ? '#9ad8ff' : k === 'I' ? '#c070ff' : '#5af0d0', OUT, 1.5);
    if (G.flags['visit_' + k] || k === 'H') text(g, L.name, x + 8, y - 7, { size: 11, bold: true });
  }
  if (onSeaFloor() && Math.sin(t * 8) > -0.3) { const p = Field.map.kind === 'deep' ? { x: G.x, y: G.y } : (() => { const q = worldPos(); return { x: q.x / 2, y: q.y / 2 }; })(); circle(g, ox + p.x * sc + sc / 2, oy + p.y * sc + sc / 2, 4, '#ff3a3a', '#fff', 1.5); }
  text(g, tl('Red: you   ▲ bell lines (surface)   Shift: world map   Enter/Esc to close'), W / 2, oy + oh + 5, { size: 11, align: 'center', color: '#b8c4ee' });
}

// ---------- monsters ----------
MONSTER_SIZE.jelly = [60, 84]; MONSTER_SIZE.angler = [96, 70]; MONSTER_SIZE.tide = [220, 200];
MONSTER_ART.jelly = (g, def, t) => {
  const c = def.c, fl = Math.sin(t * 1.8) * 6, pulse = 1 + Math.sin(t * 3) * 0.06;
  g.translate(0, -48 + fl);
  ellipse(g, 0, 48 - fl, 18, 4, 'rgba(0,0,0,.2)');
  for (let i = 0; i < 6; i++) {
    const x0 = -15 + i * 6;
    g.beginPath(); g.moveTo(x0, 4);
    g.bezierCurveTo(x0 + Math.sin(t * 2 + i) * 8, 18, x0 - Math.sin(t * 2.4 + i) * 8, 30, x0 + Math.sin(t * 3 + i) * 5, 44);
    g.strokeStyle = rgba(c[0], 0.7); g.lineWidth = 2.5; g.lineCap = 'round'; g.stroke();
  }
  g.save(); g.globalAlpha *= 0.35; circle(g, 0, -6, 34, c[2]); g.restore();
  g.save(); g.scale(pulse, 1 / pulse);
  g.beginPath(); g.moveTo(-26, 4); g.bezierCurveTo(-28, -30, 28, -30, 26, 4); g.quadraticCurveTo(0, -4, -26, 4); g.closePath();
  const gr = g.createRadialGradient(0, -14, 2, 0, -8, 30); gr.addColorStop(0, shade(c[0], 0.4)); gr.addColorStop(1, rgba(c[1], 0.85));
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
  g.restore();
  g.save(); g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); circle(g, 0, -10, 6, c[2]); g.restore();
  ellipse(g, -10, -14, 6, 3, 'rgba(255,255,255,.45)', null, 1, -0.4);
};
MONSTER_ART.angler = (g, def, t, { shadow }) => {
  const c = def.c, sw = Math.sin(t * 3) * 3;
  shadow();
  g.translate(0, -34 + Math.sin(t * 1.5) * 3);
  // tail
  poly(g, [36, -2, 54, -18 + sw, 50, 0, 54, 18 + sw, 36, 4], c[1], OUT, 1.5);
  // body
  ellipse(g, 0, 0, 40, 26, c[0], OUT, 2);
  ellipse(g, 2, 10, 30, 12, shade(c[0], 0.15));
  for (let i = 0; i < 3; i++) poly(g, [-6 + i * 12, -24, 0 + i * 12, -36 - sw, 4 + i * 12, -23], c[1], OUT, 1);
  // jaw and teeth
  g.beginPath(); g.moveTo(-40, -4); g.quadraticCurveTo(-20, 22, 8, 12); g.lineTo(-38, 8); g.closePath(); g.fillStyle = '#05050a'; g.fill();
  for (let i = 0; i < 6; i++) poly(g, [-36 + i * 6, -2 + i * 1.5, -33 + i * 6, 6 + i * 1.5, -30 + i * 6, -1 + i * 1.6], '#f0f0e0');
  // eye
  circle(g, -18, -10, 6, '#f0f0d0', OUT, 1.5); circle(g, -19, -10, 3, '#05050a');
  // lure
  g.beginPath(); g.moveTo(-14, -24); g.quadraticCurveTo(-30, -54, -48 + sw, -40); g.strokeStyle = c[1]; g.lineWidth = 2.5; g.stroke();
  g.save(); g.globalAlpha = 0.35 + 0.25 * Math.sin(t * 5); circle(g, -48 + sw, -38, 14, c[2]); g.restore();
  circle(g, -48 + sw, -38, 5, c[2], OUT, 1);
};
MONSTER_ART.tide = (g, def, t) => {
  const c = def.c, sw = Math.sin(t * 1.2) * 6;
  g.save(); g.globalAlpha *= 0.25; circle(g, 0, -110, 120 + Math.sin(t * 1.5) * 6, c[0]); g.restore();
  ellipse(g, 0, -2, 96, 12, 'rgba(0,0,0,.45)');
  // the body: a wave rearing up, wide at the base, curling over at the top
  const body = () => {
    g.beginPath(); g.moveTo(-96, 0);
    g.bezierCurveTo(-110, -60, -70 + sw, -150, -20 + sw, -190);
    g.bezierCurveTo(20 + sw, -222, 86 + sw, -206, 92 + sw, -160);
    g.bezierCurveTo(96 + sw, -128, 64, -132, 54, -150);
    g.bezierCurveTo(46, -120, 80, -70, 100, 0);
    g.closePath();
  };
  body();
  const gr = g.createLinearGradient(0, -210, 0, 0); gr.addColorStop(0, shade(c[0], 0.35)); gr.addColorStop(0.5, c[0]); gr.addColorStop(1, c[1]);
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
  // foam bands, clipped to the body
  g.save(); body(); g.clip();
  for (let i = 0; i < 7; i++) {
    const y0 = -20 - i * 28;
    g.beginPath();
    for (let x = -110; x <= 110; x += 8) { const y = y0 + Math.sin(x * 0.06 + t * 2 + i * 1.3) * 6; x === -110 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.strokeStyle = rgba(c[2], 0.12 + i * 0.03); g.lineWidth = 3; g.stroke();
  }
  g.restore();
  // the curl's foam lip and spray
  g.beginPath(); g.moveTo(-20 + sw, -190); g.bezierCurveTo(20 + sw, -222, 86 + sw, -206, 92 + sw, -160);
  g.strokeStyle = c[2]; g.lineWidth = 5; g.lineCap = 'round'; g.stroke();
  for (let i = 0; i < 12; i++) { const k = (t * 0.45 + i / 12) % 1; circle(g, 90 + sw - k * 50 + Math.sin(i) * 10, -160 + k * 30 - Math.sin(k * 3) * 20, 3.5 * (1 - k), rgba(c[2], 0.9 * (1 - k))); }
  // eyes, opening and closing, scattered through the water
  for (let i = 0; i < 16; i++) {
    const ex = -70 + hash(i, 61) * 130, ey = -20 - hash(i, 62) * 150;
    const half = 92 - (-ey) * 0.25; if (ex < -half || ex > half - 10 || (ey < -140 && ex > 40)) continue;
    const open = Math.max(0, Math.sin(t * (0.7 + hash(i, 63)) + i * 1.7));
    g.save(); g.globalAlpha = 0.35; ellipse(g, ex, ey, 11, 8, c[2]); g.restore();
    ellipse(g, ex, ey, 7, 0.8 + open * 5, '#e8f4ff', OUT, 1);
    if (open > 0.3) circle(g, ex + Math.sin(t + i) * 2, ey, 2.6 * open, '#0a1a3a');
  }
};

// ---------- battle backgrounds ----------
BATTLE_BGS.deep = (g, t, { ground }) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a2a44'); gr.addColorStop(0.6, '#06182a'); gr.addColorStop(1, '#030c16');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const x = (i * 150 + Math.sin(t * 0.2 + i) * 40); poly(g, [x, 0, x + 50, 0, x + 140, 300, x + 80, 300], 'rgba(120,200,255,.05)'); }
  g.restore();
  ground('#1e3a4a', '#0c1a24', 262);
  for (let i = 0; i < 10; i++) { const x = hash(i, 21) * W, h = 40 + hash(i, 22) * 90, sw = Math.sin(t * 1.4 + i) * 10; g.strokeStyle = i % 2 ? '#1e6a3a' : '#2a7a4a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 300); g.quadraticCurveTo(x + sw, 300 - h / 2, x + sw * 1.5, 300 - h); g.stroke(); }
  for (let i = 0; i < 24; i++) { const k = (t * 0.1 + hash(i, 23)) % 1; circle(g, hash(i, 24) * W, H - k * H, 1.5 + hash(i, 25) * 2, null, `rgba(220,245,255,${0.5 * (1 - k)})`, 1); }
};
BATTLE_BGS.palace = (g, t, { ground }) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e3a48'); gr.addColorStop(1, '#06161e');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const x = 40 + i * 112; rrect(g, x - 14, 40, 28, 230, 3, '#2a5a6a', OUT, 1.5); rrect(g, x - 20, 30, 40, 14, 2, '#3a7a8a', OUT, 1.5); ellipse(g, x, 120, 6, 18, 'rgba(90,240,208,.15)'); }
  ground('#3a6a74', '#163038', 262);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const x = i * 80 + (r % 2) * 40, y = 280 + r * 46; rrect(g, x, y, 74, 40, 2, null, 'rgba(0,0,0,.15)', 1); }
  for (let i = 0; i < 16; i++) { const k = (t * 0.12 + hash(i, 33)) % 1; circle(g, hash(i, 34) * W, H - k * H, 2 + hash(i, 35) * 2, null, `rgba(200,255,240,${0.45 * (1 - k)})`, 1); }
};
BATTLE_BGS.hadal = (g, t, { ground }) => {
  const gr = g.createRadialGradient(W / 2, 220, 20, W / 2, 220, 520); gr.addColorStop(0, '#1a1036'); gr.addColorStop(0.5, '#08061a'); gr.addColorStop(1, '#010104');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { const tw = 0.4 + 0.6 * Math.sin(t * 1.5 + i * 2); circle(g, hash(i, 41) * W, hash(i, 42) * 240, 1 + hash(i, 43) * 1.5, `rgba(192,112,255,${0.5 * tw})`); }
  ground('#16162a', '#05050c', 262);
  g.strokeStyle = 'rgba(192,112,255,.35)'; g.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const x0 = hash(i, 44) * W; g.beginPath(); g.moveTo(x0, 266); g.lineTo(x0 + 24 - hash(i, 45) * 48, 340); g.lineTo(x0 + 30 - hash(i, 46) * 60, H); g.stroke(); }
};
