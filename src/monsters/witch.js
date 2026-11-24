'use strict';
// Monster family 'witch': Vesper. Used by: vesper, tombpriest, herald, echo, siren.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.witch = [66, 104];
MONSTER_ART.witch = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 2) * 5;
  g.translate(0, fl - 8);
  g.save(); g.globalAlpha *= 0.25 + 0.1 * Math.sin(t * 3); circle(g, 0, -44, 46, c[1]); g.restore();
  ellipse(g, 0, 8 - fl, 22, 5, 'rgba(0,0,0,.3)');
  // robe
  g.beginPath(); g.moveTo(-10, -60);
  g.quadraticCurveTo(-34, -20, -30 + Math.sin(t * 3) * 4, 0); g.lineTo(28 + Math.cos(t * 3) * 4, 0); g.quadraticCurveTo(30, -20, 10, -60); g.closePath();
  g.fillStyle = c[0]; g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke();
  g.strokeStyle = rgba(c[1], 0.6); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-4, -50); g.quadraticCurveTo(-8, -20, -14, 0); g.stroke();
  // staff with crescent
  line(g, 22, 4, 26, -82, '#2a1a3a', 3);
  g.beginPath(); g.arc(26, -88, 9, Math.PI * 0.2, Math.PI * 1.6); g.strokeStyle = c[2]; g.lineWidth = 3.5; g.stroke();
  circle(g, 26, -88, 3, c[1]);
  circle(g, 18, -44, 4, c[2]);
  // head & hood
  circle(g, 0, -68, 14, c[0], c[1], 2);
  circle(g, 2, -66, 9, '#e8dce8');
  g.beginPath(); g.arc(0, -68, 14, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(10, -66); g.quadraticCurveTo(2, -78, -8, -66); g.closePath(); g.fillStyle = c[0]; g.fill();
  ellipse(g, 0, -64, 2, 1.4, c[1]); ellipse(g, 7, -64, 2, 1.4, c[1]);
  // long hair strands red (Lyra's sister)
  g.strokeStyle = '#a03a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, -60); g.quadraticCurveTo(-14, -44, -10, -36); g.stroke();
};
