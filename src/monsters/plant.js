'use strict';
// Monster family 'plant'. Used by: sporecap, cactoid, kelphorror.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.plant = [58, 54];
MONSTER_ART.plant = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const sw = Math.sin(t * 3) * 2;
  line(g, -10, 0, -6, -10, shade(c[1], -0.3), 3); line(g, 10, 0, 6, -10, shade(c[1], -0.3), 3);
  rrect(g, -10, -30, 20, 30, 7, c[1], OUT, 1.8);
  circle(g, -3, -18, 2.4, '#1a1020'); circle(g, 5, -18, 2.4, '#1a1020');
  g.beginPath(); g.arc(1, -10, 4, Math.PI + 0.3, -0.3); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
  g.save(); g.translate(sw, 0);
  g.beginPath(); g.moveTo(-28, -28); g.bezierCurveTo(-28, -60, 28, -60, 28, -28); g.quadraticCurveTo(0, -22, -28, -28);
  g.fillStyle = c[0]; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  [[-14, -40, 4], [2, -48, 5], [14, -36, 3.5], [-4, -34, 3]].forEach(([a, b, r]) => circle(g, a, b, r, c[1]));
  g.restore();
};
