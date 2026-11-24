'use strict';
// Monster family 'gloomcap'. Used by: gloomcap.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.gloomcap = [96, 96];
MONSTER_ART.gloomcap = (g, def, t) => {
  const c = def.c;
  ellipse(g, 0, -1, 40, 7, 'rgba(0,0,0,.35)');
  const sw = Math.sin(t * 2) * 3;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-14 + i * 7, -4); g.quadraticCurveTo(-24 + i * 12, 2, -30 + i * 15, 0); g.strokeStyle = '#4a3a2a'; g.lineWidth = 3; g.stroke(); }
  rrect(g, -15, -48, 30, 48, 10, c[1], OUT, 2);
  // angry face
  poly(g, [-10, -32, -2, -28, -10, -26], '#1a1020'); poly(g, [10, -32, 2, -28, 10, -26], '#1a1020');
  circle(g, -6, -28, 1.5, c[2]); circle(g, 6, -28, 1.5, c[2]);
  g.beginPath(); g.moveTo(-8, -14); g.quadraticCurveTo(0, -20, 8, -14); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  g.save(); g.translate(sw, 0);
  g.beginPath(); g.moveTo(-46, -44); g.bezierCurveTo(-46, -96, 46, -96, 46, -44); g.quadraticCurveTo(0, -34, -46, -44);
  const gr = g.createLinearGradient(0, -96, 0, -40); gr.addColorStop(0, shade(c[0], 0.2)); gr.addColorStop(1, shade(c[0], -0.3));
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
  [[-26, -60, 6], [-6, -76, 7], [16, -66, 6], [30, -52, 4], [-36, -50, 4], [4, -56, 4]].forEach(([a, b, r], i) => {
    const p = 0.5 + 0.5 * Math.sin(t * 3 + i);
    g.save(); g.globalAlpha *= 0.4 * p; circle(g, a, b, r * 2, c[2]); g.restore();
    circle(g, a, b, r, c[2]);
  });
  g.restore();
  for (let i = 0; i < 6; i++) { const k = (t * 0.3 + i / 6) % 1; circle(g, -40 + i * 16 + Math.sin(t + i) * 6, -20 - k * 90, 2, rgba('#b6f25a', 1 - k)); }
};
