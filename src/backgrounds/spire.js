'use strict';
// Battle background 'spire' (also 'throne'). Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.spire = (g, t, { ground, stars }, kind) => {
  const gr = g.createRadialGradient(W / 2, 180, 20, W / 2, 180, 500); gr.addColorStop(0, kind === 'throne' ? '#3a1060' : '#2a1040'); gr.addColorStop(1, '#05020a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  stars(90, 7);
  if (kind === 'throne') { g.save(); g.globalAlpha = 0.9; circle(g, W / 2, 120, 70, '#e8d8ff'); circle(g, W / 2 + 22, 108, 64, '#1a0830'); g.restore(); }
  for (let i = 0; i < 5; i++) { const x = hash(i, 11) * W, y = 60 + hash(i, 12) * 140 + Math.sin(t + i) * 6; poly(g, [x - 30, y, x + 30, y, x + 16, y + 14, x - 16, y + 14], '#2a1a3a', '#8a5aba', 1); }
  ground('#2e2440', '#120a1c', 265);
  g.strokeStyle = 'rgba(192,112,255,.3)'; g.lineWidth = 1;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(W / 2, 265); g.lineTo(i * 92 - 20, H); g.stroke(); }
};
BATTLE_BGS.throne = BATTLE_BGS.spire;
