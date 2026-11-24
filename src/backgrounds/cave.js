'use strict';
// Battle background 'cave'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.cave = (g, t, { ground }) => {
  g.fillStyle = '#1a1610'; g.fillRect(0, 0, W, H);
  ground('#3a3424', '#1a160e', 250);
  for (let i = 0; i < 12; i++) { const x = hash(i, 2) * W, l = 30 + hash(i, 3) * 70; poly(g, [x - 14, 0, x + 14, 0, x, l], '#2a2418'); }
  for (let i = 0; i < 8; i++) { const x = hash(i, 4) * W, y = 230 + hash(i, 5) * 40; g.strokeStyle = '#4a3a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 30, y / 2, x - 10, y); g.stroke(); }
  for (let i = 0; i < 10; i++) { const x = hash(i, 6) * W, y = 260 + hash(i, 7) * 180, p = 0.5 + 0.5 * Math.sin(t * 2 + i); g.save(); g.globalAlpha = 0.3 * p; circle(g, x, y - 6, 12, '#b6f25a'); g.restore(); circle(g, x, y - 6, 4, '#b6f25a'); line(g, x, y - 3, x, y + 4, '#e8e0c0', 2); }
};
