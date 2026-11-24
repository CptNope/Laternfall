'use strict';
// Battle background 'arena'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.arena = (g, t, { sky, ground }) => {
  sky('#3a7ad0', '#c8e0ff');
  g.fillStyle = '#b8a890'; g.beginPath(); g.ellipse(W / 2, 240, 420, 120, 0, Math.PI, 0); g.fill();
  for (let r = 0; r < 4; r++) { g.fillStyle = r % 2 ? '#a89880' : '#c8b8a0'; g.beginPath(); g.ellipse(W / 2, 240, 400 - r * 30, 110 - r * 22, 0, Math.PI, 0); g.fill(); }
  for (let i = 0; i < 60; i++) circle(g, W / 2 + Math.cos(Math.PI + i / 60 * Math.PI) * (360 - (i % 3) * 30), 240 + Math.sin(Math.PI + i / 60 * Math.PI) * (100 - (i % 3) * 20), 4, ['#c04a4a', '#4a6ac0', '#e8c24a', '#5aa05a'][i % 4]);
  for (let i = 0; i < 7; i++) { const x = 40 + i * 94; line(g, x, 110, x, 70, '#5a4a3a', 2); poly(g, [x, 70, x + 18 + Math.sin(t * 4 + i) * 3, 76, x, 82], ['#c04a4a', '#4a6ac0', '#e8c24a'][i % 3]); }
  ground('#d8b880', '#a8844a', 240);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, 330, 260, 60, 0, 0, Math.PI * 2); g.stroke();
};
