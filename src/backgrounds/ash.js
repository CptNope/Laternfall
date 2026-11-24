'use strict';
// Battle background 'ash'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.ash = (g, t, { sky, ground, hills }) => {
  sky('#3a2a30', '#a8705a');
  circle(g, 470, 110, 46, 'rgba(255,170,110,.5)'); circle(g, 470, 110, 30, '#ffc890');
  hills(190, 34, '#2a2226', 9, 0.016); hills(228, 16, '#3e363a', 10);
  ground('#5a5458', '#2a2428', 258);
  for (let i = 0; i < 8; i++) { g.save(); g.translate(i * 86 + hash(i, 2) * 30, 262); g.scale(2.6, 2.6); drawDeadTree(g, 0, 0, 1); g.restore(); }
  for (let i = 0; i < 40; i++) { const k = (t * 0.12 + hash(i, 6)) % 1; circle(g, (hash(i, 7) * W + Math.sin(t + i) * 30) % W, k * H, 1.3, `rgba(220,210,200,${0.6 * (1 - k)})`); }
  for (let i = 0; i < 12; i++) { const k = (t * 0.3 + hash(i, 8)) % 1; circle(g, hash(i, 9) * W, H - k * 260, 1.6, `rgba(255,140,60,${1 - k})`); }
};
