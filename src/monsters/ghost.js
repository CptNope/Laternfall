'use strict';
// Monster family 'ghost'. Used by: wisp, wraith, cinderwisp, lampeater, tidewraith, ghostlight, frostwraith.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.ghost = [50, 74];
MONSTER_ART.ghost = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 2.5) * 5;
  g.translate(0, fl - 10);
  g.save(); g.globalAlpha *= 0.3; circle(g, 0, -34, 34, c[0]); g.restore();
  g.globalAlpha *= 0.88;
  g.beginPath(); g.moveTo(-20, -2);
  g.bezierCurveTo(-26, -40, -14, -64, 0, -64); g.bezierCurveTo(14, -64, 26, -40, 20, -2);
  for (let i = 0; i < 4; i++) { const x0 = 20 - i * 10; g.quadraticCurveTo(x0 - 5, -10 + Math.sin(t * 6 + i) * 4, x0 - 10, -2); }
  g.closePath();
  const gr = g.createLinearGradient(0, -64, 0, 0); gr.addColorStop(0, shade(c[0], 0.3)); gr.addColorStop(1, rgba(c[1], 0.3));
  g.fillStyle = gr; g.fill(); g.strokeStyle = rgba(c[1], 0.8); g.lineWidth = 1.5; g.stroke();
  ellipse(g, -3, -42, 4, 6, '#0a0614'); ellipse(g, 9, -42, 4, 6, '#0a0614');
  ellipse(g, 3, -28, 4, 6, '#0a0614');
};
