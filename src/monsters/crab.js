'use strict';
// Monster family 'crab'. Used by: sandcrab, kingcrab, scorpion, scarab, pearlguard, trenchcrab.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.crab = [72, 48];
MONSTER_ART.crab = (g, def, t) => {
  const c = def.c;
  ellipse(g, 0, -1, 32, 5, 'rgba(0,0,0,.3)');
  for (let i = 0; i < 3; i++) { line(g, -10 - i * 6, -12, -22 - i * 6, -2 + Math.sin(t * 8 + i) * 2, c[1], 3); line(g, 10 + i * 4, -12, 18 + i * 6, -2 + Math.cos(t * 8 + i) * 2, c[1], 3); }
  ellipse(g, 0, -20, 26, 15, c[0], OUT, 2.2);
  g.beginPath(); g.ellipse(0, -24, 18, 8, 0, Math.PI, 0); g.strokeStyle = shade(c[0], 0.3); g.lineWidth = 2; g.stroke();
  line(g, 6, -32, 6, -42, c[1], 2.5); line(g, 14, -32, 16, -42, c[1], 2.5);
  circle(g, 6, -44, 3.5, '#fff', OUT, 1); circle(g, 16, -44, 3.5, '#fff', OUT, 1); circle(g, 7, -44, 1.6, '#1a1020'); circle(g, 17, -44, 1.6, '#1a1020');
  const cl = Math.sin(t * 5) * 0.2;
  g.save(); g.translate(30, -26); g.rotate(cl);
  ellipse(g, 0, 0, 12, 9, c[0], OUT, 2); poly(g, [6, -4, 18, -8, 10, 0], c[0], OUT, 1.5); poly(g, [6, 4, 18, 6, 10, 0], shade(c[0], -0.1), OUT, 1.5);
  g.restore();
  line(g, 20, -24, 26, -26, c[1], 4);
};
