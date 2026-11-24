'use strict';
// Battle background 'astral'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.astral = (g, t, { ground, stars }) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#04081c'); gr.addColorStop(0.6, '#142a5a'); gr.addColorStop(1, '#0a1430'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  stars(140, 13);
  g.save(); g.globalAlpha = 0.25; for (let i = 0; i < 3; i++) { ellipse(g, 200 + i * 140, 90 + i * 20, 160, 40, ['#6a3aaa', '#3a6aca', '#aa3a8a'][i], null, 1, 0.3 - i * 0.2); } g.restore();
  // telescope dome ribs
  g.strokeStyle = 'rgba(168,216,255,.25)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(W / 2, 270, 360, 260, 0, Math.PI + i * 0.35, Math.PI + i * 0.35 + 0.02); g.stroke(); }
  g.beginPath(); g.ellipse(W / 2, 270, 360, 260, 0, Math.PI, 0); g.stroke();
  ground('#1e2a50', '#0a1028', 265);
  g.strokeStyle = 'rgba(168,216,255,.25)'; g.lineWidth = 1;
  for (let r = 1; r < 6; r++) { g.beginPath(); g.ellipse(W / 2, 330, r * 70, r * 14, 0, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 6; i++) { const k = (t * 0.15 + hash(i, 3)) % 1; line(g, hash(i, 4) * W + k * 200, k * 200, hash(i, 4) * W + k * 200 - 30, k * 200 - 12, `rgba(255,255,255,${1 - k})`, 1.5); }
};
