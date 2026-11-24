'use strict';
// Monster family 'king2'. Used by: king2.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.king2 = [200, 190];
MONSTER_ART.king2 = (g, def, t) => {
  const c = def.c;
  g.save(); g.globalAlpha *= 0.35; circle(g, 0, -90, 95 + Math.sin(t * 3) * 6, c[1]); g.restore();
  g.translate(0, Math.sin(t * 1.4) * 5);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + t * 0.4;
    g.beginPath(); g.moveTo(Math.cos(a) * 30, -90 + Math.sin(a) * 30);
    g.quadraticCurveTo(Math.cos(a + 0.4) * 70, -90 + Math.sin(a + 0.4) * 70, Math.cos(a + 0.2 + Math.sin(t * 2 + i) * 0.3) * 96, -90 + Math.sin(a + 0.2) * 86);
    g.strokeStyle = i % 2 ? c[1] : c[2]; g.lineWidth = 5; g.lineCap = 'round'; g.stroke();
  }
  circle(g, 0, -90, 48, '#05020a', c[1], 3);
  const eyesP = [[0, -98, 12], [-24, -80, 6], [22, -76, 7], [-14, -112, 5], [18, -112, 5], [0, -70, 5]];
  eyesP.forEach(([a, b, r], i) => {
    const bl = Math.max(0.15, Math.abs(Math.sin(t * 0.7 + i * 1.7)));
    ellipse(g, a, b, r * 1.3, r * bl, '#f8f0ff'); circle(g, a + 1, b, r * 0.55 * Math.min(1, bl * 2), i ? c[1] : c[2]); circle(g, a + 1, b, r * 0.2, '#000');
  });
  // crown shards
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35 + Math.sin(t + i) * 0.04; const R = 58 + Math.sin(t * 2 + i) * 3; poly(g, [Math.cos(a) * R - 5, -90 + Math.sin(a) * R, Math.cos(a) * (R + 22), -90 + Math.sin(a) * (R + 22), Math.cos(a) * R + 5, -90 + Math.sin(a) * R], '#e8c84a', OUT, 1.5); }
};
