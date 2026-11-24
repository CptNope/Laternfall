'use strict';
// Monster family 'imp'. Used by: snowimp, cometimp, kilnimp.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.imp = [50, 64];
MONSTER_ART.imp = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 4) * 4;
  g.translate(0, -30 + fl);
  ellipse(g, 0, 30 - fl, 12, 3, 'rgba(0,0,0,.2)');
  const f = Math.sin(t * 14);
  poly(g, [-4, -10, -24, -24 - f * 6, -20, -6], shade(c[1], -0.1), OUT, 1.2); poly(g, [4, -10, 22, -24 - f * 6, 18, -6], shade(c[1], -0.1), OUT, 1.2);
  g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(-22, 14, -18, -2); g.strokeStyle = c[1]; g.lineWidth = 2.5; g.stroke();
  poly(g, [-18, -2, -22, -6, -15, -5], c[1]);
  ellipse(g, 0, 0, 10, 12, c[0], OUT, 1.8);
  circle(g, 0, -16, 9, c[0], OUT, 1.8);
  poly(g, [-6, -22, -9, -32, -2, -24], c[1], OUT, 1); poly(g, [6, -22, 9, -32, 2, -24], c[1], OUT, 1);
  circle(g, 0, -17, 2, '#fff'); circle(g, 6, -17, 2, '#fff'); circle(g, .6, -17, 1, '#1a1020'); circle(g, 6.6, -17, 1, '#1a1020');
  g.beginPath(); g.arc(3, -12, 3, 0.2, Math.PI - 0.2); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
};
