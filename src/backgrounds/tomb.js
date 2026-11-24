'use strict';
// Battle background 'tomb'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.tomb = (g, t, { ground }) => {
  g.fillStyle = '#2a1c0c'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const x = 30 + i * 118; rrect(g, x - 18, 30, 36, 240, 2, '#8a6a3a', OUT, 1.5); for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(40,25,10,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, 60 + k * 36, 5, 0, Math.PI * 2); g.stroke(); line(g, x - 8, 72 + k * 36, x + 8, 72 + k * 36, 'rgba(40,25,10,.5)', 1.5); } }
  ground('#a8844a', '#5a3a18', 262);
  for (let i = 0; i < 6; i++) { const x = 30 + i * 118, f = Math.sin(t * 9 + i) * 2; g.save(); g.globalAlpha = 0.3; circle(g, x, 24, 22 + f, '#ffb04a'); g.restore(); poly(g, [x - 5, 30, x + f * 0.5, 14 - f, x + 5, 30], '#ffa030'); }
  for (let i = 0; i < 10; i++) circle(g, hash(i, 4) * W, 300 + hash(i, 5) * 150, 3 + hash(i, 6) * 3, 'rgba(232,200,74,.5)');
};
