'use strict';
// Monster family 'eye'. Used by: nightgaze, starspawn, crownshard, deepgazer.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.eye = [56, 70];
MONSTER_ART.eye = (g, def, t) => {
  const c = def.c;
  const fl = Math.sin(t * 2) * 5;
  g.translate(0, -44 + fl);
  ellipse(g, 0, 44 - fl, 18, 4, 'rgba(0,0,0,.25)');
  for (let i = 0; i < 5; i++) {
    g.beginPath(); g.moveTo(-12 + i * 6, 16);
    g.quadraticCurveTo(-16 + i * 7 + Math.sin(t * 3 + i) * 8, 30, -10 + i * 6 + Math.sin(t * 4 + i) * 6, 42);
    g.strokeStyle = c[1]; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
  }
  circle(g, 0, 0, 24, c[1], OUT, 2);
  circle(g, 0, 0, 20, c[0]);
  const lx = Math.sin(t * 1.3) * 3 + 5;
  circle(g, lx, 0, 10, c[2]); circle(g, lx, 0, 5, '#05030a'); circle(g, lx - 3, -3, 2, '#fff');
  g.beginPath(); g.arc(0, 0, 20, Math.PI * 1.15, Math.PI * 1.85); g.strokeStyle = c[1]; g.lineWidth = 5; g.stroke();
};
