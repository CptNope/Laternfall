'use strict';
// Battle background 'forest'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.forest = (g, t, { sky, ground }) => {
  sky('#3a7ab8', '#a8d0e8');
  for (let i = 0; i < 14; i++) drawTreeRound(g, i * 50 + hash(i, 1) * 20, 250, 3.2, '#2f6a35', '#1f4a28', '#3f8a45');
  ground('#4f8a3a', '#2f5a28', 245);
};
