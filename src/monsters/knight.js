'use strict';
// Monster family 'knight'. Used by: hollowknight, dreadknight, astralknight, cinderknight, gloamknight, vane, sentinel.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.knight = [60, 92];
MONSTER_ART.knight = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const r = Math.sin(t * 3) * 1.5;
  rrect(g, -12, -22, 9, 22, 2, c[1], OUT, 1.5); rrect(g, 3, -22, 9, 22, 2, c[1], OUT, 1.5);
  rrect(g, -16, -54, 32, 34, 6, c[0], OUT, 2);
  poly(g, [-16, -54, 16, -54, 0, -36], shade(c[0], 0.15));
  // shield
  poly(g, [-26, -48, -10, -48, -10, -28, -18, -20, -26, -28], shade(c[1], 0.2), OUT, 1.8);
  circle(g, -18, -38, 3, c[2]);
  // sword
  g.save(); g.translate(18, -34); g.rotate(-0.2 + r * 0.04); g.scale(1.6, 1.6); drawWeapon(g, 'sword', 0, 0, 0, 1); g.restore();
  circle(g, 18, -34, 5, c[0], OUT, 1.2);
  // helm
  rrect(g, -10, -76, 22, 24, 8, c[0], OUT, 2);
  poly(g, [0, -78, 4, -92, 8, -78], c[2]);
  g.fillStyle = '#05030a'; g.fillRect(-4, -68, 16, 4);
  g.fillStyle = c[2]; g.fillRect(2, -67.5, 3, 3); g.fillRect(8, -67.5, 3, 3);
  g.save(); g.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3); circle(g, 6, -66, 8, c[2]); g.restore();
};
