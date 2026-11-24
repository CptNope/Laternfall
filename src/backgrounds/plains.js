'use strict';
// Battle background 'plains' (also 'beach'). Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.plains = (g, t, { sky, ground, hills }, kind) => {
  sky('#5aa0e8', '#cfe8ff');
  for (let i = 0; i < 4; i++) { const cx = ((hash(i, 3) * W + t * 8 * (i + 1)) % (W + 160)) - 80, cy = 40 + hash(i, 4) * 90; ellipse(g, cx, cy, 44, 14, 'rgba(255,255,255,.85)'); ellipse(g, cx + 20, cy - 8, 26, 12, 'rgba(255,255,255,.9)'); }
  hills(200, 18, '#7aa8c8', 1); hills(232, 14, kind === 'beach' ? '#e9d49a' : '#5f9a4a', 2);
  ground(kind === 'beach' ? '#e9d49a' : '#6dbb4f', kind === 'beach' ? '#c8b070' : '#4f8a3a', 262);
  for (let i = 0; i < 30; i++) { const x = hash(i, 9) * W, y = 280 + hash(i, 10) * 190; g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 3, y - 4); g.lineTo(x, y); g.lineTo(x + 3, y - 4); g.stroke(); }
};
BATTLE_BGS.beach = BATTLE_BGS.plains;
