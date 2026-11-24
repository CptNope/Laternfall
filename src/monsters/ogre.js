'use strict';
// Monster family 'ogre'. Used by: ogre, enforcer.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.ogre = [72, 88];
MONSTER_ART.ogre = (g, def, t) => {
  const c = def.c;
  ellipse(g, 0, -1, 32, 6, 'rgba(0,0,0,.3)');
  rrect(g, -18, -24, 13, 24, 4, c[1], OUT, 1.8); rrect(g, 5, -24, 13, 24, 4, c[1], OUT, 1.8);
  ellipse(g, 0, -46, 28, 26, c[0], OUT, 2.2);
  ellipse(g, 0, -34, 22, 10, shade(c[1], 0.2), OUT, 1.5);
  g.save(); g.translate(26, -46); g.rotate(-0.7 + Math.sin(t * 3) * 0.08);
  line(g, 0, 0, 0, -28, '#6a3a1a', 7); ellipse(g, 0, -34, 8, 12, '#7a4a22', OUT, 1.5);
  g.restore();
  circle(g, 26, -46, 7, c[0], OUT, 1.5);
  circle(g, 4, -76, 11, c[0], OUT, 2);
  circle(g, 2, -78, 2.5, '#ffee55'); circle(g, 9, -78, 2.5, '#ffee55');
  poly(g, [3, -70, 5, -66, 7, -70], '#fff'); poly(g, [9, -70, 11, -66, 12, -70], '#fff');
};
