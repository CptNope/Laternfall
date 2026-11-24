'use strict';
// ============================================================
//  CRAFTS — fishing mini-game and Orrin's forge
// ============================================================

// ---------- fishing ----------
function fishKinds() { return Object.keys(FISH).filter(id => G.flags['fish_' + id]).length; }
function rollFish(spot) {
  // The Lantern Koi only rises once every Lantern burns again
  if (G.flags.ending && Math.random() < 0.03) return 'koi';
  return weighted(FISH_SPOTS[spot]).f;
}

class FishingUI {
  constructor(fish) {
    this.fish = fish; this.diff = FISH[fish].diff;
    this.state = 'wait'; this.t = 0; this.wait = rnd(1.2, 3.4);
    this.zoneW = [0, 0.3, 0.22, 0.15][this.diff];
    this.need = this.diff + 1; this.hits = 0; this.misses = 0;
    this.pos = 0; this.vel = 0.9; this.zone = rnd(0.15, 0.85 - this.zoneW);
    this.flashT = 0; this.flashCol = null; this.msg = 'Waiting for a bite...';
  }
  done(result) { UI.close(this, result); }
  update(dt) {
    this.t += dt; this.flashT = Math.max(0, this.flashT - dt);
    if (Input.p('cancel')) { Audio_.sfx('cancel'); return this.done({ ok: false, why: 'You reel in your line.' }); }
    if (this.state === 'wait') {
      if (Input.p('ok')) { Audio_.sfx('splash'); return this.done({ ok: false, why: 'Too soon! The fish scattered.' }); }
      if (this.t >= this.wait) { this.state = 'bite'; this.t = 0; this.msg = 'A bite! Press Enter!'; Audio_.sfx('bite'); }
    } else if (this.state === 'bite') {
      if (Input.p('ok')) { this.state = 'reel'; this.t = 0; this.msg = 'Reel it in! Press Enter in the green.'; Audio_.sfx('reel'); }
      else if (this.t > 0.9) { Audio_.sfx('splash'); return this.done({ ok: false, why: 'It got away...' }); }
    } else if (this.state === 'reel') {
      this.pos += this.vel * dt;
      if (this.pos > 1) { this.pos = 2 - this.pos; this.vel = -this.vel; }
      if (this.pos < 0) { this.pos = -this.pos; this.vel = -this.vel; }
      if (Input.p('ok')) {
        if (this.pos >= this.zone && this.pos <= this.zone + this.zoneW) {
          this.hits++; Audio_.sfx('reel'); this.flashT = 0.25; this.flashCol = '#7aff9a';
          if (this.hits >= this.need) { Audio_.sfx('chest'); return this.done({ ok: true }); }
          this.vel = Math.sign(this.vel) * (Math.abs(this.vel) + 0.35);
          this.zone = rnd(0.08, 0.92 - this.zoneW);
        } else {
          this.misses++; Audio_.sfx('buzz'); this.flashT = 0.25; this.flashCol = '#ff7a7a';
          if (this.misses >= 2) { Audio_.sfx('splash'); return this.done({ ok: false, why: 'The line snapped! It got away.' }); }
        }
      }
    }
  }
  draw(g) {
    const x = 140, y = 110, w = 360, h = 230, t = performance.now() / 1000;
    drawWindow(g, x, y, w, h);
    text(g, 'Fishing', x + 16, y + 10, { size: 15, bold: true, color: '#ffe9a8' });
    // water
    const wx = x + 14, wy = y + 36, ww = w - 28, wh = 120;
    const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#2c6fc4'); gr.addColorStop(1, '#13406a');
    g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = 'rgba(200,230,255,.35)'; g.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) { const yy = wy + 14 + r * 24; g.beginPath(); for (let xx = 0; xx <= ww; xx += 12) g.lineTo(wx + xx, yy + Math.sin(xx * 0.08 + t * 2 + r) * 2); g.stroke(); }
    // bobber
    const bx = wx + ww / 2, dip = this.state === 'bite' ? 8 + Math.sin(t * 30) * 3 : this.state === 'reel' ? 10 : Math.sin(t * 3) * 2;
    const by = wy + 52 + dip;
    line(g, bx, wy - 6, bx, by - 6, 'rgba(255,255,255,.7)', 1);
    if (this.state !== 'wait') { g.save(); g.globalAlpha = 0.6; circle(g, bx, by + 4, 10 + (t * 20) % 12, null, '#d8f4ff', 1.5); g.restore(); }
    circle(g, bx, by, 6, '#fff', OUT, 1.2); g.beginPath(); g.arc(bx, by, 6, 0, Math.PI); g.fillStyle = '#d03a2a'; g.fill();
    if (this.state === 'bite') text(g, '!', bx + 14, by - 30, { size: 28, bold: true, color: '#ffd23a' });
    // reel bar
    const rx = x + 30, ry = y + 172, rw = w - 60;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(rx, ry, rw, 14);
    if (this.state === 'reel') {
      g.fillStyle = '#4ac86a'; g.fillRect(rx + this.zone * rw, ry, this.zoneW * rw, 14);
      const mx = rx + this.pos * rw;
      poly(g, [mx - 6, ry - 8, mx + 6, ry - 8, mx, ry + 2], '#fff', OUT, 1);
      line(g, mx, ry, mx, ry + 14, '#fff', 2);
    }
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.strokeRect(rx + 0.5, ry + 0.5, rw - 1, 13);
    for (let i = 0; i < this.need; i++) circle(g, x + w - 24 - i * 14, y + 18, 4.5, i < this.hits ? '#7aff9a' : 'rgba(255,255,255,.18)', '#fff', 1);
    if (this.flashT > 0) { g.save(); g.globalAlpha = this.flashT * 2; g.fillStyle = this.flashCol; g.fillRect(rx, ry, rw, 14); g.restore(); }
    text(g, this.msg, x + w / 2, y + h - 34, { size: 14, align: 'center' });
    text(g, 'Esc: stop', x + w - 14, y + h - 18, { size: 11, align: 'right', color: '#b8c4ee' });
  }
}

async function goFishing(spot) {
  if (!FISH_SPOTS[spot]) return;
  Audio_.sfx('splash');
  while (true) {
    const fish = rollFish(spot);
    const r = await UI.push(new FishingUI(fish));
    if (r.ok) {
      const first = !G.flags['fish_' + fish];
      G.flags['fish_' + fish] = (G.flags['fish_' + fish] || 0) + 1;
      addItem(fish);
      await narrate(`Caught a ${ITEMS[fish].name}!${first ? '  ★ New!' : ''}  (${fishKinds()}/${Object.keys(FISH).length} kinds)`);
      if (fish === 'koi') await say(LY, 'It\'s glowing! Arin, it\'s actually glowing! Old Bram is never going to believe this.');
    } else await narrate(r.why);
    if (r.why === 'You reel in your line.') return;
    const c = await choose(null, 'Cast again?', ['Cast', 'Stop'], 1);
    if (c !== 0) return;
  }
}

// ---------- Orrin's forge ----------
function recipeReady(r) { return G.gold >= r.gold && Object.entries(r.mats).every(([m, n]) => (G.inv[m] || 0) >= n); }
function drawRecipe(g, r) {
  if (!r) return;
  const it = ITEMS[r.out];
  drawWindow(g, 330, 16, 294, 300);
  text(g, it.name, 346, 30, { size: 17, bold: true, color: '#ffe9a8' });
  wrapText(g, it.desc, 262, font(13)).forEach((l, i) => text(g, l, 346, 56 + i * 18, { size: 13, color: '#d8dcf0' }));
  text(g, it.kind === 'acc' ? 'Accessory' : equipInfo(it), 346, 102, { size: 13, color: '#9ad8ff' });
  text(g, 'Needs', 346, 132, { size: 13, color: '#b8c4ee' });
  Object.entries(r.mats).forEach(([m, n], i) => {
    const have = G.inv[m] || 0;
    text(g, ITEMS[m].name, 360, 154 + i * 24, { size: 14, color: have >= n ? '#fff' : '#ff9a9a' });
    text(g, `${have} / ${n}`, 608, 154 + i * 24, { size: 14, align: 'right', color: have >= n ? '#7aff9a' : '#ff9a9a' });
  });
  text(g, 'Gold', 360, 264, { size: 14, color: G.gold >= r.gold ? '#fff' : '#ff9a9a' });
  text(g, `${r.gold} G`, 608, 264, { size: 14, align: 'right', color: G.gold >= r.gold ? '#ffe9a8' : '#ff9a9a' });
  text(g, `You have ${G.gold} G`, 608, 290, { size: 12, align: 'right', color: '#b8c4ee' });
}
async function forgeMenu() {
  let idx = 0;
  while (true) {
    const sel = { v: idx };
    const panel = openPanel(g => drawRecipe(g, RECIPES[sel.v]));
    const k = await listMenu({
      x: 16, y: 16, w: 300, rows: 9, title: 'Orrin\'s Forge', index: idx, onChange: i => sel.v = i,
      items: RECIPES.map(r => ({ label: ITEMS[r.out].name, right: G.inv[r.out] ? '×' + G.inv[r.out] : '', color: recipeReady(r) ? '#fff' : '#8792b8' })),
      help: () => 'Monsters drop materials. Check the bestiary to see who drops what.', helpY: H - 52
    });
    closePanel(panel);
    if (k < 0) return;
    idx = k;
    const r = RECIPES[k];
    if (!recipeReady(r)) { Audio_.sfx('buzz'); await say('Orrin', 'Not enough to work with, lad. Bring me the rest and I\'ll get the fire going.'); continue; }
    const c = await choose('Orrin', `Forge the ${ITEMS[r.out].name} for ${r.gold} gold and the materials?`, ['Forge it', 'Not yet'], 1);
    if (c !== 0) continue;
    G.gold -= r.gold;
    for (const [m, n] of Object.entries(r.mats)) addItem(m, -n);
    await fadeTo(0.7, 250, '#ff8a2a');
    for (let i = 0; i < 3; i++) { Audio_.sfx('forge'); await wait(380); }
    await fadeTo(0, 400, '#ff8a2a');
    addItem(r.out); Audio_.sfx('chest');
    G.flags.forged = (G.flags.forged || 0) + 1;
    await narrate(`Orrin forged the ${ITEMS[r.out].name}!`);
    if (G.flags.forged >= 3 && !G.flags.forge_done) {
      G.flags.forge_done = true;
      await sayAll([['Orrin', 'Three pieces, and not a crack in any of them. My grandfather would\'ve wept. Loudly. He was a loud man.'], ['Orrin', 'Here. My own seal, pressed in Stonebrand iron. Every smith in Ironhold will know you\'re family now.']]);
      addItem('orrin_seal'); Audio_.sfx('chest');
      await narrate('Received Orrin\'s Seal! (Accessory: ATK +6, DEF +18, prevents all ailments)');
    }
  }
}
