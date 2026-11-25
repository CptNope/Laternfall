'use strict';
// The Ember Fox's drawing: a monster family registers itself, like the game's own in src/monsters/.
// Drawn at the feet (0, 0), facing right; def.c is the palette: fur, dark fur, flame.
MONSTER_SIZE.emberfox = [80, 58];
MONSTER_ART.emberfox = (g, def, t, { shadow }) => {
  const c = def.c, sway = Math.sin(t * 5) * 3, flick = Math.sin(t * 11) * 2;
  shadow();
  // a flame for a tail
  poly(g, [-22, -24, -46, -40 + sway, -40, -54 + sway + flick, -30, -44 + sway, -26, -58 + sway, -18, -34], c[0], OUT, 1.6);
  poly(g, [-24, -28, -38, -42 + sway, -30, -40 + sway, -22, -34], c[2]);
  // legs and body
  [[-14, 0], [-6, 1], [10, 0], [17, 1]].forEach(([lx], i) => rrect(g, lx - 2.5, -15, 5, 15 + (i % 2 ? sway * 0.3 : -sway * 0.3), 2, c[1], OUT, 1.1));
  ellipse(g, 0, -23, 24, 11, c[0], OUT, 2);
  ellipse(g, 4, -18, 12, 5, '#f4e2c8');
  // head: a pointed muzzle and tall ears
  ellipse(g, 22, -33, 10, 9, c[0], OUT, 2);
  poly(g, [28, -36, 44, -30, 28, -26], c[0], OUT, 1.6);
  circle(g, 43, -30, 2, '#1a1020');
  poly(g, [16, -38, 17, -54, 23, -41], c[0], OUT, 1.2); poly(g, [23, -40, 27, -55, 30, -38], c[0], OUT, 1.2);
  poly(g, [18, -40, 18.5, -50, 21.5, -41], c[2]); poly(g, [25, -40, 27, -50, 28.5, -39], c[2]);
  circle(g, 28, -34, 2.2, c[2]); circle(g, 28.6, -34, 1, '#1a1020');
};
