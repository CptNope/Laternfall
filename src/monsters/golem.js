'use strict';
// Monster family 'golem'. Used by: icegolem, embergolem, gildedgolem, ashgolem, hearthwarden, coralgolem.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.golem = [72, 82];
MONSTER_ART.golem = (g, def, t) => {
  const c = def.c;
  ellipse(g, 0, -1, 30, 6, 'rgba(0,0,0,.3)');
  const r = Math.sin(t * 2) * 1.5;
  rrect(g, -18, -24, 14, 24, 3, c[1], OUT, 2); rrect(g, 4, -24, 14, 24, 3, c[1], OUT, 2);
  rrect(g, -24, -62, 48, 40, 8, c[0], OUT, 2.2);
  rrect(g, -34, -58, 12, 32 + r, 4, c[1], OUT, 2); rrect(g, 22, -58, 12, 32 - r, 4, c[1], OUT, 2);
  rrect(g, -12, -80, 26, 20, 5, c[0], OUT, 2);
  g.strokeStyle = shade(c[1], -0.2); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(-14, -56); g.lineTo(-6, -44); g.lineTo(-10, -32); g.moveTo(10, -60); g.lineTo(14, -48); g.stroke();
  g.save(); g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4); circle(g, 3, -71, 8, c[2]); g.restore();
  circle(g, -1, -71, 2.6, c[2]); circle(g, 8, -71, 2.6, c[2]);
  circle(g, 0, -42, 5, c[2]);
};
