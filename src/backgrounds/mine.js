'use strict';
// Battle background 'mine'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.mine = (g, t, { ground, hills }) => {
  g.fillStyle = '#1a0e08'; g.fillRect(0, 0, W, H);
  hills(120, 40, '#2a1810', 5, 0.03);
  const lg = g.createLinearGradient(0, 200, 0, H); lg.addColorStop(0, 'rgba(255,100,20,0)'); lg.addColorStop(1, 'rgba(255,100,20,.35)'); g.fillStyle = lg; g.fillRect(0, 200, W, H);
  ground('#4a2e1e', '#2a160c', 262);
  for (let i = 0; i < 4; i++) { const x = 60 + i * 170; g.fillStyle = '#5a3a1a'; g.fillRect(x, 60, 14, 210); g.fillRect(x - 10, 56, 120, 12); }
  line(g, 0, 300, W, 300, '#6a6a70', 3); line(g, 0, 318, W, 318, '#6a6a70', 3);
  for (let i = 0; i < 20; i++) g.fillStyle = '#3a2a1a', g.fillRect(i * 34, 296, 8, 26);
  for (let i = 0; i < 14; i++) { const k = (t * 0.4 + hash(i, 3)) % 1; circle(g, hash(i, 4) * W, H - k * 300, 1.6, `rgba(255,160,60,${1 - k})`); }
};
