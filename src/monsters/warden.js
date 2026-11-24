'use strict';
// Monster family 'warden'. Used by: warden, abbot.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.warden = [92, 126];
MONSTER_ART.warden = (g, def, t) => {
  const c = def.c;
  ellipse(g, 0, -1, 40, 7, 'rgba(0,0,0,.35)');
  const r = Math.sin(t * 2) * 2;
  rrect(g, -20, -30, 15, 30, 4, shade(c[0], -0.3), OUT, 2); rrect(g, 5, -30, 15, 30, 4, shade(c[0], -0.3), OUT, 2);
  rrect(g, -28, -86, 56, 60, 12, c[0], OUT, 2.5);
  // barnacles
  [[-16, -70], [10, -50], [-8, -40], [18, -76], [-20, -48]].forEach(([a, b]) => { circle(g, a, b, 3.5, c[1], OUT, 1); circle(g, a, b, 1.2, '#2a3a3a'); });
  // seaweed
  g.strokeStyle = '#2a7a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-24, -80); g.quadraticCurveTo(-34, -50 + r, -26, -28); g.stroke();
  // trident
  g.save(); g.translate(34, -60); g.rotate(-0.15 + r * 0.02);
  line(g, 0, 50, 0, -50, '#5a6a6a', 4);
  g.beginPath(); g.moveTo(-12, -42); g.lineTo(-12, -54); g.moveTo(0, -42); g.lineTo(0, -62); g.moveTo(12, -42); g.lineTo(12, -54); g.moveTo(-12, -42); g.lineTo(12, -42);
  g.strokeStyle = '#a8c0b8'; g.lineWidth = 3.5; g.stroke();
  g.restore();
  circle(g, 34, -60, 8, c[0], OUT, 2);
  rrect(g, -40, -84, 14, 40, 5, c[0], OUT, 2);
  // helm
  rrect(g, -16, -116, 34, 32, 12, shade(c[0], 0.1), OUT, 2.5);
  g.fillStyle = '#04080a'; g.fillRect(-8, -104, 24, 6);
  g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3); g.fillStyle = c[2]; g.fillRect(-4, -103, 6, 4); g.fillRect(8, -103, 6, 4); g.restore();
  poly(g, [-16, -112, -28, -124, -14, -118], c[1], OUT, 1.2); poly(g, [18, -112, 30, -124, 16, -118], c[1], OUT, 1.2);
  for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; circle(g, -10 + i * 8, -120 - k * 30, 2 + k * 2, `rgba(180,240,255,${0.6 * (1 - k)})`, null); }
};
