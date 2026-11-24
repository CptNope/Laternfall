'use strict';
// Monster family 'king'. Used by: firstking, king, orun, nereus.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.king = [140, 172];
MONSTER_ART.king = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 1.5) * 4;
  g.save(); g.globalAlpha *= 0.3; circle(g, 0, -80, 80 + Math.sin(t * 2) * 4, c[2]); g.restore();
  ellipse(g, 0, -1, 50, 8, 'rgba(0,0,0,.45)');
  g.translate(0, fl);
  // cape wings
  g.beginPath(); g.moveTo(-14, -110);
  g.quadraticCurveTo(-80, -90, -64 + Math.sin(t * 2) * 6, 0); g.lineTo(64 + Math.cos(t * 2) * 6, 0); g.quadraticCurveTo(80, -90, 14, -110); g.closePath();
  g.fillStyle = c[0]; g.fill(); g.strokeStyle = c[2]; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = rgba(c[2], 0.4); g.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 4, -100); g.quadraticCurveTo(i * 20, -50, i * 26, 0); g.stroke(); }
  // body (Orun's restored form is pale instead of void-black)
  rrect(g, -22, -110, 44, 70, 14, def.pale ? shade(c[0], 0.15) : '#1c1230', c[1], 2);
  circle(g, 0, -82, 7, c[2]);
  // head
  circle(g, 0, -126, 20, def.pale ? '#d8d0e8' : '#05020a', c[1], 2);
  if (def.pale) { line(g, -16, -138, 16, -138, '#c8c8d8', 4); g.fillStyle = '#2a2a3a'; g.fillRect(-9, -116, 18, 3); }
  ellipse(g, -7, -126, 4, 2.5, c[2]); ellipse(g, 7, -126, 4, 2.5, c[2]);
  g.save(); g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4); ellipse(g, -7, -126, 8, 5, rgba(c[2], 0.5)); ellipse(g, 7, -126, 8, 5, rgba(c[2], 0.5)); g.restore();
  // crown
  poly(g, [-20, -140, -22, -164, -12, -150, -6, -170, 0, -152, 6, -170, 12, -150, 22, -164, 20, -140], c[1], OUT, 2);
  circle(g, 0, -148, 3, c[2]);
  // orbiting orbs
  for (let i = 0; i < 3; i++) { const a = t * 1.2 + i * Math.PI * 2 / 3; circle(g, Math.cos(a) * 56, -90 + Math.sin(a) * 16, 6, '#1a0a30', c[2], 2); }
  // hand + sword
  line(g, 26, -90, 40, -60, def.pale ? shade(c[0], 0.1) : '#1c1230', 8);
  g.save(); g.translate(42, -58); g.rotate(0.3); g.scale(2.2, 2.2); drawWeapon(g, 'sword', 0, 0, 0); g.restore();
};
