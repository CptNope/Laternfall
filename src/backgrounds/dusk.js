'use strict';
// Battle background 'dusk'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.dusk = (g, t, { sky, ground, hills, stars }) => {
  sky('#2a1040', '#8a3a6a');
  circle(g, 520, 90, 40, '#ffd0a0'); circle(g, 534, 82, 36, '#2a1040');
  stars(40, 3, 0.7);
  hills(210, 20, '#1a0c28', 6);
  for (let i = 0; i < 10; i++) { g.save(); g.translate(i * 70 + hash(i, 1) * 30, 260); g.scale(3, 3); drawDeadTree(g, 0, 0, 1); g.restore(); }
  ground('#3b2a4c', '#1a1024', 255);
};
