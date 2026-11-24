'use strict';
// Monster family 'beast'. Used by: wolf, frostwolf, chimera, sphinx, ashhound, nightmare, nightjackal.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.beast = [84, 54];
MONSTER_ART.beast = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const r = Math.sin(t * 6) * 2;
  // tail
  g.beginPath(); g.moveTo(-24, -26); g.quadraticCurveTo(-40, -36 + r, -36, -46); g.strokeStyle = c[1]; g.lineWidth = 6; g.lineCap = 'round'; g.stroke();
  // legs
  [[-16, 0], [-8, 1], [10, 0], [18, 1]].forEach(([lx], i) => rrect(g, lx - 3, -16, 6, 16 + (i % 2 ? r * 0.5 : -r * 0.5), 2, i < 2 ? c[1] : shade(c[1], -0.1), OUT, 1.2));
  ellipse(g, 0, -24, 26, 13, c[0], OUT, 2);
  ellipse(g, -2, -30, 18, 5, shade(c[0], 0.2));
  if (def.size > 1.2) { ellipse(g, 18, -34, 14, 14, shade(c[1], 0.1), OUT, 1.5); } // mane
  // head
  ellipse(g, 24, -34, 11, 10, c[0], OUT, 2);
  poly(g, [30, -38, 44, -32, 42, -26, 30, -26], c[0], OUT, 1.6);
  circle(g, 43, -31, 2, '#1a1020');
  poly(g, [17, -40, 19, -52, 25, -42], c[1], OUT, 1.2); poly(g, [24, -42, 28, -53, 31, -40], c[1], OUT, 1.2);
  circle(g, 30, -36, 2.2, '#ffdd44'); circle(g, 30.6, -36, 1, '#1a1020');
  poly(g, [34, -26, 36, -22, 38, -26], '#fff');
};
