'use strict';
// Battle background 'desert'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.desert = (g, t, { sky, ground, hills }) => {
  sky('#4a9ae0', '#f8e0b0');
  circle(g, 520, 70, 34, 'rgba(255,250,220,.9)');
  hills(200, 26, '#d89a5a', 7, 0.018); hills(230, 14, '#e8b878', 8);
  ground('#e8c47a', '#c89a50', 258);
  for (let i = 0; i < 5; i++) drawCactus(g, 30 + i * 140 + hash(i, 2) * 40, 262 + hash(i, 3) * 10, 1.8);
  for (let i = 0; i < 20; i++) { const k = (t * 0.3 + hash(i, 4)) % 1; line(g, k * W, 280 + hash(i, 5) * 160, k * W + 20, 280 + hash(i, 5) * 160, 'rgba(255,240,200,.35)', 1.5); }
};
