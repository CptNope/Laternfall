'use strict';
// Monster family 'wyrm'. Used by: voiddrake, wyrm.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.wyrm = [180, 150];
MONSTER_ART.wyrm = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 2) * 3, wf = Math.sin(t * 3.2);
  ellipse(g, 0, -1, 62, 9, 'rgba(0,0,0,.35)');
  if (def.boss) { g.save(); g.globalAlpha *= 0.22 + 0.08 * Math.sin(t * 2); circle(g, 0, -70, 100, c[2]); g.restore(); }
  // far wing
  poly(g, [0, -62, -30 + wf * 6, -150 - wf * 14, -55, -120, -78 + wf * 4, -90 - wf * 6, -60, -70, -20, -52], shade(c[1], 0.1), OUT, 1.5);
  // tail
  g.beginPath(); g.moveTo(-36, -34); g.bezierCurveTo(-70, -20, -92, -4 + fl, -100, -26 + fl); g.lineWidth = 14; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
  g.lineWidth = 11; g.strokeStyle = c[0]; g.stroke();
  poly(g, [-100, -26 + fl, -114, -40 + fl, -106, -18 + fl], c[2], OUT, 1.2);
  // hind leg
  rrect(g, -30, -30, 18, 30, 6, shade(c[0], -0.2), OUT, 1.5);
  // body
  ellipse(g, 0, -44, 48, 28, c[0], OUT, 2.2);
  ellipse(g, 6, -34, 34, 13, shade(c[0], 0.3));
  for (let i = 0; i < 5; i++) poly(g, [-30 + i * 14, -68 + Math.abs(i - 2) * 2, -24 + i * 14, -80 + Math.abs(i - 2) * 2, -18 + i * 14, -68 + Math.abs(i - 2) * 2], c[1], OUT, 1);
  [[-20, -50], [-2, -58], [14, -48], [-10, -40], [24, -56]].forEach(([a, b], i) => { const p = 0.5 + 0.5 * Math.sin(t * 3 + i); circle(g, a, b, 2.4 + p, rgba(c[2], 0.5 + p * 0.5)); });
  // front leg
  rrect(g, 18, -30, 16, 30, 6, c[0], OUT, 1.5);
  poly(g, [18, 0, 36, 0, 40, 4, 14, 4], c[1]);
  // neck
  g.beginPath(); g.moveTo(26, -58); g.bezierCurveTo(48, -70, 44 + fl, -96, 62 + fl, -110);
  g.lineWidth = 22; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 18; g.strokeStyle = c[0]; g.stroke();
  // head
  g.save(); g.translate(66 + fl, -114);
  poly(g, [-14, -10, 10, -12, 34, -2, 36, 4, 10, 8, -12, 8], c[0], OUT, 2);
  poly(g, [6, 6, 32, 6, 28, 12, 6, 12], shade(c[0], -0.25), OUT, 1.5);
  poly(g, [-8, -10, -26, -28, -2, -14], c[1], OUT, 1.5); poly(g, [2, -12, -10, -34, 8, -14], c[1], OUT, 1.5);
  g.save(); g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 4); circle(g, 8, -3, 6, rgba(c[2], 0.5)); g.restore();
  circle(g, 8, -3, 2.6, c[2]); line(g, 8, -5, 8, -1, '#05030a', 1.2);
  poly(g, [30, 6, 32, 10, 34, 6], '#fff');
  g.restore();
  // near wing
  poly(g, [6, -64, -10 + wf * 8, -168 - wf * 16, -40 + wf * 4, -132 - wf * 8, -54, -104, -44, -78, -6, -56], c[1], OUT, 2);
  g.strokeStyle = rgba(c[2], 0.5); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(6, -64); g.lineTo(-10 + wf * 8, -168 - wf * 16); g.moveTo(6, -64); g.lineTo(-40 + wf * 4, -132 - wf * 8); g.moveTo(6, -64); g.lineTo(-54, -104); g.stroke();
};
