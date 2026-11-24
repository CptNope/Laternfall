'use strict';
// Monster family 'serpent'. Used by: rootcrawler, tideserpent, seaserpent, leviathan, sandworm, cindersnake, deepone.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.serpent = [64, 64];
MONSTER_ART.serpent = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    pts.push([-26 + k * 40, -6 - k * 44 + Math.sin(k * 7 + t * 4) * 8 * (1 - k * 0.4)]);
  }
  for (let i = 0; i < pts.length; i++) {
    const r = 10 - i * 0.25;
    circle(g, pts[i][0], pts[i][1], r + 1.5, OUT);
  }
  for (let i = 0; i < pts.length; i++) {
    const r = 10 - i * 0.25;
    circle(g, pts[i][0], pts[i][1], r, i % 2 ? c[0] : shade(c[0], -0.1));
    circle(g, pts[i][0] + 2, pts[i][1] + 4, r * 0.45, shade(c[0], 0.35));
  }
  const [hx, hy] = pts[pts.length - 1];
  poly(g, [hx - 4, hy - 10, hx - 10, hy - 22, hx + 2, hy - 12], c[1], OUT, 1.2);
  ellipse(g, hx + 6, hy - 2, 14, 9, c[0], OUT, 2);
  circle(g, hx + 8, hy - 6, 3, '#ffdd44'); line(g, hx + 9, hy - 8, hx + 9, hy - 4, '#1a1020', 1.5);
  line(g, hx + 18, hy + 2, hx + 26, hy + 3, '#e83a4a', 1.5);
};
