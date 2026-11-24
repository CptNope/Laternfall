'use strict';
// Monster family 'bat'. Used by: bat, shadebat, harpy, firebat, moonmoth.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.bat = [64, 60];
MONSTER_ART.bat = (g, def, t) => {
  const c = def.c;
  const f = Math.sin(t * 12);
  g.translate(0, -40 + Math.sin(t * 3) * 4);
  ellipse(g, 0, 40, 14, 3, 'rgba(0,0,0,.2)');
  poly(g, [-4, -4, -26, -16 - f * 10, -30, -2 - f * 4, -20, -4, -16, 4, -8, 2], c[1], OUT, 1.5);
  poly(g, [4, -4, 26, -16 - f * 10, 30, -2 - f * 4, 20, -4, 16, 4, 8, 2], c[1], OUT, 1.5);
  ellipse(g, 0, 0, 11, 10, c[0], OUT, 1.8);
  poly(g, [-8, -6, -7, -16, -2, -8], c[0], OUT, 1.2); poly(g, [8, -6, 7, -16, 2, -8], c[0], OUT, 1.2);
  circle(g, -3, -2, 2.4, '#ffdd44'); circle(g, 5, -2, 2.4, '#ffdd44');
  poly(g, [-1, 4, 1, 4, 0, 8], '#fff'); poly(g, [3, 4, 5, 4, 4, 8], '#fff');
};
