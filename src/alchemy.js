// =====================================================================
//  ALCHEMY — 2.5: an alchemy bench in Arin's house turns spare materials into consumables
// =====================================================================
// Corwin builds the bench (home.js, HOME_UPGRADES). Forge materials pile up after Orrin's three
// pieces, and fish after the Ice Fisher; the bench gives both a use. A recipe shows once you hold
// its first ingredient (or have brewed it before). Saved in G.flags:
//   brewed_<out>   you've brewed this     brewed_total   how many brews in all (a trophy at 10)
const ALCHEMY = [
  { out: 'ember_flask', n: 2, needs: { ember_core: 1, bomb: 2 } },
  { out: 'frost_flask', n: 2, needs: { frost_crystal: 1, bomb: 2 } },
  { out: 'dusk_flask', n: 2, needs: { dusk_silk: 1, bomb: 2 } },
  { out: 'star_bomb', n: 1, needs: { star_shard: 1, bomb: 2 } },
  { out: 'golden_draught', n: 1, needs: { sun_gold: 1, xpotion: 1 } },
  { out: 'pearl_draught', n: 1, needs: { deep_pearl: 1, hiether: 1 } },
  { out: 'elixir', n: 1, needs: { abyss_ash: 1, hipotion: 2, ether: 2 } },
  { out: 'megalixir', n: 1, needs: { deep_pearl: 1, abyss_ash: 1, elixir: 1 } },
  { out: 'hipotion', n: 3, needs: { minnow: 2, potion: 3 } },
  { out: 'hiether', n: 1, needs: { pearlfish: 1, ether: 2 } },
  { out: 'plume', n: 2, needs: { embereel: 1, hipotion: 1 } },
  { out: 'remedy', n: 3, needs: { trout: 1, antidote: 3 } }
];
const brewKnown = r => !!(G.flags['brewed_' + r.out] || G.inv[Object.keys(r.needs)[0]]);
const brewReady = r => Object.entries(r.needs).every(([m, n]) => (G.inv[m] || 0) >= n);
function drawBrew(g, r) {
  if (!r) return;
  drawWindow(g, 330, 16, 294, 300);
  if (!brewKnown(r)) {
    text(g, '???', 346, 30, { size: 17, bold: true, color: '#8792b8' });
    wrapText(g, tl('A recipe in Arin\'s mother\'s hand. It needs something you haven\'t found yet.'), 262, font(13)).forEach((l, i) => text(g, l, 346, 56 + i * 18, { size: 13, color: '#b8c4ee' }));
    return;
  }
  const it = ITEMS[r.out];
  text(g, r.n > 1 ? tl`${it.name} ×${r.n}` : it.name, 346, 30, { size: 17, bold: true, color: '#ffe9a8' });
  wrapText(g, it.desc, 262, font(13)).forEach((l, i) => text(g, l, 346, 56 + i * 18, { size: 13, color: '#d8dcf0' }));
  text(g, tl('Needs'), 346, 132, { size: 13, color: '#b8c4ee' });
  Object.entries(r.needs).forEach(([m, n], i) => {
    const have = G.inv[m] || 0;
    text(g, ITEMS[m].name, 360, 154 + i * 24, { size: 14, color: have >= n ? '#fff' : '#ff9a9a' });
    text(g, `${have} / ${n}`, 608, 154 + i * 24, { size: 14, align: 'right', color: have >= n ? '#7aff9a' : '#ff9a9a' });
  });
  text(g, tl`You have ${G.inv[r.out] || 0}`, 608, 290, { size: 12, align: 'right', color: '#b8c4ee' });
}
async function alchemyBench() {
  let idx = 0;
  while (true) {
    const sel = { v: idx };
    const panel = openPanel(g => drawBrew(g, ALCHEMY[sel.v]));
    const k = await listMenu({
      x: 16, y: 16, w: 300, rows: 10, title: tl('Alchemy bench'), index: idx, onChange: i => sel.v = i,
      items: ALCHEMY.map(r => ({ label: brewKnown(r) ? ITEMS[r.out].name : '???', right: brewKnown(r) && G.inv[r.out] ? '×' + G.inv[r.out] : '', color: brewKnown(r) && brewReady(r) ? '#fff' : '#8792b8' })),
      help: () => tl('Spare forge materials and fish, turned into something useful. No gold needed.'), helpY: H - 52
    });
    closePanel(panel);
    if (k < 0) return;
    idx = k;
    const r = ALCHEMY[k];
    if (!brewKnown(r) || !brewReady(r)) { Audio_.sfx('buzz'); continue; }
    await brew(r);
    await narrate(r.n > 1 ? tl`Brewed ${r.n} × ${ITEMS[r.out].name}!` : tl`Brewed ${ITEMS[r.out].name}!`);
  }
}
async function brew(r) {
  for (const [m, n] of Object.entries(r.needs)) addItem(m, -n);
  await fadeTo(0.5, 220, '#7aff9a');
  for (let i = 0; i < 2; i++) { Audio_.sfx('heal'); await wait(300); }
  await fadeTo(0, 300, '#7aff9a');
  addItem(r.out, r.n); Audio_.sfx('chest');
  G.flags['brewed_' + r.out] = true;
  G.flags.brewed_total = (G.flags.brewed_total || 0) + 1;
}
// the bench in Arin's house (tile V)
function drawBench(g, px, py, t) {
  rrect(g, px + 2, py + 12, 28, 14, 2, '#6a4422', OUT, 1.2);
  g.fillStyle = '#4a2a12'; g.fillRect(px + 4, py + 26, 3, 5); g.fillRect(px + 25, py + 26, 3, 5);
  // flasks: green, blue, amber, bubbling a little
  [['#7aff9a', 8], ['#7ab8ff', 16], ['#ffb04a', 24]].forEach(([c, x], i) => {
    ellipse(g, px + x, py + 9, 3.5, 4, c, OUT, 1);
    g.fillStyle = '#d8dcf0'; g.fillRect(px + x - 1, py + 2, 2, 4);
    const b = (t * 0.9 + i * 0.33) % 1;
    circle(g, px + x + Math.sin(b * 9) * 1, py + 5 - b * 7, 1, `rgba(255,255,255,${1 - b})`);
  });
}
