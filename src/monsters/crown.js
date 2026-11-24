'use strict';
// Monster family 'crown': The Hollow Crown — the night-half of the first crown, looking for a head. Used by: crown.
// Drawn at the monster's feet (0, 0), facing right; def.c is its palette. See docs/MODDING.md.
MONSTER_SIZE.crown = [150, 170];
MONSTER_ART.crown = (g, def, t) => {
  const c = def.c;
  const bob = Math.sin(t * 1.3) * 6;
  g.save(); g.globalAlpha *= 0.3; circle(g, 0, -96, 86 + Math.sin(t * 2.2) * 5, c[2]); g.restore();
  ellipse(g, 0, -1, 46, 7, 'rgba(0,0,0,.4)');
  g.translate(0, bob);
  // trailing ash veil
  g.beginPath(); g.moveTo(-50, -86);
  for (let i = 0; i <= 10; i++) { const xx = -50 + i * 10; g.lineTo(xx, -30 + Math.sin(t * 3 + i * 0.9) * 10 + (i % 2) * 14); }
  g.lineTo(50, -86); g.closePath();
  const vg = g.createLinearGradient(0, -86, 0, -10); vg.addColorStop(0, rgba(c[1], 0.9)); vg.addColorStop(1, rgba(c[1], 0)); g.fillStyle = vg; g.fill();
  // the void the crown circles
  ellipse(g, 0, -100, 42, 24, '#05020a', c[2], 2.5);
  // crown band and spikes
  const pts = [-56, -96];
  for (let i = 0; i < 7; i++) { const xx = -48 + i * 16, hgt = (i % 2 ? 30 : 52) + Math.sin(t * 2 + i) * 3; pts.push(xx, -110, xx + 8, -110 - hgt, xx + 16, -110); }
  pts.push(56, -96);
  poly(g, pts, c[0], OUT, 2.2);
  rrect(g, -56, -110, 112, 18, 6, shade(c[0], -0.25), OUT, 2);
  for (let i = 0; i < 5; i++) { const xx = -40 + i * 20; circle(g, xx, -101, 4.5, i === 2 ? c[2] : '#8a2a4a', OUT, 1.2); }
  // cracks through the gold
  g.strokeStyle = 'rgba(20,10,20,.8)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(-24, -110); g.lineTo(-18, -132); g.lineTo(-22, -150); g.moveTo(30, -110); g.lineTo(26, -126); g.lineTo(34, -140); g.stroke();
  // single great eye in the void
  const bl = Math.max(0.12, Math.abs(Math.sin(t * 0.6)));
  ellipse(g, 0, -80, 18, 10 * bl, '#f8f0ff'); circle(g, 2, -80, 6 * Math.min(1, bl * 1.6), c[2]); circle(g, 2, -80, 2.4, '#000');
  // orbiting shards
  for (let i = 0; i < 6; i++) { const a = t * 0.9 + i * Math.PI / 3; const R = 70; const sx = Math.cos(a) * R, sy = -96 + Math.sin(a) * 22; poly(g, [sx, sy - 9, sx + 4, sy, sx, sy + 9, sx - 4, sy], c[0], OUT, 1.2); }
};
