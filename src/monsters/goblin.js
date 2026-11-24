'use strict';
// Monster family 'goblin'. Used by: goblin, hobgoblin, bandit, cutpurse.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.goblin = [60, 60];
MONSTER_ART.goblin = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const r = Math.sin(t * 5) * 2;
  rrect(g, -9, -16, 6, 16, 2, shade(c[1], -0.2), OUT, 1.2); rrect(g, 3, -16, 6, 16, 2, shade(c[1], -0.2), OUT, 1.2);
  rrect(g, -12, -36, 24, 22, 7, c[1], OUT, 1.8);
  g.fillStyle = shade(c[1], 0.25); g.fillRect(-12, -22, 24, 3);
  // club
  g.save(); g.translate(14, -26); g.rotate(-0.6 + r * 0.05);
  line(g, 0, 0, 0, -22, '#7a4a22', 5); ellipse(g, 0, -26, 6, 9, '#8a5a2a', OUT, 1.5);
  g.restore();
  circle(g, 14, -26, 4, c[0], OUT, 1.2);
  // head
  circle(g, 0, -46, 13, c[0], OUT, 2);
  poly(g, [-11, -50, -28, -58, -12, -42], c[0], OUT, 1.6); poly(g, [11, -50, 28, -58, 12, -42], c[0], OUT, 1.6);
  ellipse(g, 9, -44, 4, 3, shade(c[0], -0.15));
  circle(g, 2, -49, 3, '#ffee55', OUT, 1); circle(g, 10, -50, 3, '#ffee55', OUT, 1); circle(g, 3, -49, 1.3, '#1a1020'); circle(g, 11, -50, 1.3, '#1a1020');
  g.beginPath(); g.moveTo(0, -39); g.lineTo(10, -40); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
  poly(g, [3, -40, 4.5, -37, 6, -40], '#fff');
};
