'use strict';
// Battle background 'shrine'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.shrine = (g, t, { ground }) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e2a40'); gr.addColorStop(1, '#1f5070'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const x = 40 + i * 112; rrect(g, x - 16, 40, 32, 230, 3, '#3a6a8a', OUT, 1.5); rrect(g, x - 22, 34, 44, 12, 3, '#4a7a9a', OUT, 1.5); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x - 10, 46, 5, 220); }
  ground('#2a5a7a', '#14304a', 262);
  for (let i = 0; i < 8; i++) { const y = 290 + i * 24; g.strokeStyle = `rgba(90,240,208,${0.12 + 0.08 * Math.sin(t * 2 + i)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + t * 2 + i) * 3); g.stroke(); }
  for (let i = 0; i < 12; i++) { const k = (t * 0.2 + hash(i, 8)) % 1; circle(g, hash(i, 9) * W, 270 - k * 260, 2 + hash(i, 10) * 3, `rgba(180,240,255,${0.5 * (1 - k)})`, 'rgba(255,255,255,.3)', 1); }
};
