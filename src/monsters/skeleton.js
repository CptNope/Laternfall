'use strict';
// Monster family 'skeleton'. Used by: drowned, revenant, mummy, courtier, gravewight.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.skeleton = [46, 66];
MONSTER_ART.skeleton = (g, def, t, { shadow }) => {
  const c = def.c;
  shadow();
  const r = Math.sin(t * 4) * 1.5;
  line(g, -6, 0, -5, -18, c[0], 3.5); line(g, 6, 0, 5, -18, c[0], 3.5);
  ellipse(g, 0, -19, 9, 4, c[0], OUT, 1.2);
  line(g, 0, -20, 0, -44, c[0], 3);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, -26 - i * 5, 10 - i, 3, 0, Math.PI * 1.1, Math.PI * 1.9 + Math.PI); g.strokeStyle = c[0]; g.lineWidth = 2.5; g.stroke(); }
  line(g, -10, -42, -14, -26 + r, c[0], 3); line(g, 10, -42, 16, -30 - r, c[0], 3);
  drawWeapon(g, 'sword', 16, -30 - r, 0.5, 1);
  // skull
  circle(g, 2, -54, 11, c[0], OUT, 2);
  rrect(g, -2, -48, 12, 7, 2, c[0], OUT, 1.2);
  circle(g, -2, -55, 3.2, '#140a10'); circle(g, 7, -55, 3.2, '#140a10');
  circle(g, -2, -55, 1.2, c[1]); circle(g, 7, -55, 1.2, c[1]);
  for (let i = 0; i < 3; i++) line(g, 1 + i * 3, -48, 1 + i * 3, -42, OUT, 1);
  if (def.c[1] === '#2f5a55') { g.strokeStyle = '#3a8a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -60); g.quadraticCurveTo(-12, -40, -6, -30); g.stroke(); }
};
