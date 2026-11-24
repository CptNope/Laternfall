'use strict';
// Battle background 'abyss' (also 'crownfall'). Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.abyss = (g, t, { ground }, kind) => {
  const gr = g.createRadialGradient(W / 2, 330, 30, W / 2, 330, 520); gr.addColorStop(0, kind === 'crownfall' ? '#5a1a14' : '#3a1a14'); gr.addColorStop(0.5, '#140a0e'); gr.addColorStop(1, '#030104'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) { const x = 20 + i * 100 + hash(i, 1) * 30; poly(g, [x - 26, 0, x + 26, 0, x + 6, 60 + hash(i, 2) * 120], '#1a1216'); }
  if (kind === 'crownfall') { g.save(); g.globalAlpha = 0.85; for (let r = 0; r < 4; r++) { g.strokeStyle = `rgba(232,200,74,${0.15 + r * 0.05})`; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, 150, 120 + r * 40, 30 + r * 10, 0, 0, Math.PI * 2); g.stroke(); } g.restore(); }
  ground('#2e282c', '#0e0a0c', 262);
  g.strokeStyle = 'rgba(255,110,40,.45)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { const x0 = hash(i, 4) * W; g.beginPath(); g.moveTo(x0, 266); g.lineTo(x0 + 20 - hash(i, 5) * 40, 320 + hash(i, 6) * 60); g.lineTo(x0 + 30 - hash(i, 7) * 60, H); g.stroke(); }
  for (let i = 0; i < 18; i++) { const k = (t * 0.22 + hash(i, 3)) % 1; circle(g, hash(i, 4) * W, H - k * 340, 1.5 + hash(i, 5), `rgba(255,150,70,${1 - k})`); }
};
BATTLE_BGS.crownfall = BATTLE_BGS.abyss;
