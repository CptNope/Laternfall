'use strict';
// Battle background 'sea'. Draws the whole 640×480 scene behind the battle.
BATTLE_BGS.sea = (g, t, { sky }) => {
  sky('#3a6ab0', '#b8d8f0');
  g.fillStyle = '#2c6fc4'; g.fillRect(0, 230, W, H - 230);
  for (let r = 0; r < 12; r++) for (let i = 0; i < 10; i++) {
    const y = 240 + r * 20, x = (i * 80 + r * 30 + t * 20 * (r % 2 ? 1 : -1)) % (W + 80) - 40;
    g.strokeStyle = `rgba(200,230,255,${0.2 + r * 0.03})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 15, y - 6, x + 30, y); g.stroke();
  }
};
