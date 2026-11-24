'use strict';
// Monster family 'slime'. Used by: slime, blueslime, magmaslime, voidslime, nebulaslime, abyssooze, sewerooze.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.slime = [56, 42];
MONSTER_ART.slime = (g, def, t, { shadow, eyes }) => {
  const c = def.c;
  shadow();
  const sq = 1 + Math.sin(t * 4) * 0.06;
  g.save(); g.scale(1 / sq, sq);
  const gr = g.createLinearGradient(0, -40, 0, 0); gr.addColorStop(0, shade(c[0], 0.2)); gr.addColorStop(1, c[1]);
  g.beginPath(); g.moveTo(-26, 0); g.bezierCurveTo(-28, -22, -12, -40, 2, -40); g.bezierCurveTo(16, -40, 30, -22, 26, 0); g.closePath();
  g.fillStyle = gr; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
  ellipse(g, -10, -28, 6, 4, 'rgba(255,255,255,.55)', null, 1, -0.5);
  eyes(2, -20, 4.2);
  g.beginPath(); g.arc(9, -10, 4, 0.1, Math.PI - 0.1); g.strokeStyle = OUT; g.lineWidth = 1.5; g.stroke();
  g.restore();
};
