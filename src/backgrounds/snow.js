'use strict';
// Battle background 'snow'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.snow = (g, t, { sky, ground, hills }) => {
  sky('#8aa8c8', '#e8f0f8');
  hills(170, 40, '#b8c8dc', 3, 0.02); hills(220, 20, '#dce8f4', 4);
  ground('#eef4fb', '#c4d4e6', 255);
  for (let i = 0; i < 50; i++) { const x = (hash(i, 5) * W + Math.sin(t + i) * 20) % W, y = (hash(i, 6) * H + t * 30 * (0.5 + hash(i, 7))) % H; circle(g, x, y, 1.6, 'rgba(255,255,255,.9)'); }
};
