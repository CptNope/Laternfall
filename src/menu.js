'use strict';
// ============================================================
//  MENUS — field menu, items, magic, equipment, status, shop, inn
// ============================================================
function drawPartyPanel(g, sel = -1) {
  const x = 16, y = 16, w = 440, rowH = 100;
  drawWindow(g, x, y, w, 16 + G.party.length * rowH);
  G.party.forEach((m, i) => {
    const yy = y + 10 + i * rowH;
    if (i === sel) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 8, yy, w - 16, rowH - 6); }
    const L = HEROES[m.id].look;
    g.save(); if (!alive(m)) g.globalAlpha = 0.5;
    drawChar(g, L, x + 50, yy + 78, 'down', 0, 1.6, alive(m) ? null : 'ko');
    g.restore();
    text(g, memberName(m), x + 100, yy + 6, { size: 18, bold: true, color: alive(m) ? '#fff' : '#ff8a8a' });
    text(g, HEROES[m.id].cls, x + 100, yy + 30, { size: 13, color: '#b8c4ee' });
    text(g, `Lv ${m.level}`, x + 220, yy + 8, { size: 15, color: '#ffe9a8' });
    if (m.status.poison) text(g, 'Poison', x + 290, yy + 8, { size: 13, color: '#8aff7a' });
    text(g, 'HP', x + 100, yy + 52, { size: 13, color: '#9adf9a' });
    text(g, `${m.hp} / ${maxHp(m)}`, x + 250, yy + 50, { size: 15, align: 'right' });
    bar(g, x + 126, yy + 70, 124, 4, m.hp / maxHp(m), '#6ae07a');
    text(g, 'MP', x + 270, yy + 52, { size: 13, color: '#9ab0ff' });
    text(g, `${m.mp} / ${maxMp(m)}`, x + 410, yy + 50, { size: 15, align: 'right' });
    bar(g, x + 296, yy + 70, 114, 4, m.mp / Math.max(1, maxMp(m)), '#6aa8ff');
    const nx = xpForLevel(m.level + 1) - m.xp;
    text(g, m.level >= MAX_LEVEL ? 'MAX' : `Next ${nx}`, x + 410, yy + 8, { size: 12, color: '#b8c4ee', align: 'right' });
  });
}
function drawInfoPanel(g) {
  drawWindow(g, 472, 360, 152, 104);
  text(g, 'Gold', 486, 372, { size: 13, color: '#b8c4ee' });
  text(g, `${G.gold}`, 610, 370, { size: 16, align: 'right', color: '#ffe9a8' });
  text(g, 'Time', 486, 398, { size: 13, color: '#b8c4ee' });
  text(g, fmtTime(G.playTime), 610, 396, { size: 16, align: 'right' });
  const lit = ['ember', 'tide', 'stone', 'dawn'].map((k, i) => G.flags['lantern' + (i + 1)]);
  text(g, 'Lanterns', 486, 424, { size: 13, color: '#b8c4ee' });
  lit.forEach((l, i) => { circle(g, 500 + i * 30, 450, 8, l ? ['#ff9a3a', '#5af0d0', '#ff6a2a', '#ffe08a'][i] : 'rgba(255,255,255,.12)', '#fff', 1.2); });
}
async function pickMember(title, opt = {}) {
  const panel = openPanel(g => drawPartyPanel(g, sel.v));
  const sel = { v: opt.index || 0 };
  const items = G.party.map(m => ({ label: memberName(m), right: `${m.hp}/${maxHp(m)}`, disabled: opt.filter ? !opt.filter(m) : false }));
  const r = await listMenu({ x: 470, y: 16, w: 154, rows: 4, title, items, index: sel.v, onChange: i => sel.v = i });
  closePanel(panel);
  return r < 0 ? null : r;
}
async function openMainMenu() {
  Audio_.sfx('ok');
  const panel = openPanel(g => { drawPartyPanel(g); drawInfoPanel(g); });
  let idx = 0;
  while (true) {
    const items = [{ label: 'Items' }, { label: 'Magic' }, { label: 'Equip' }, { label: 'Status' }, { label: 'Save' }, { label: Audio_.muted ? 'Sound: Off' : 'Sound: On' }, { label: 'Close' }];
    const k = await listMenu({ x: 472, y: 16, w: 152, rows: 7, items, index: idx });
    if (k < 0 || k === 6) break;
    idx = k;
    if (k === 0) await itemsMenu();
    if (k === 1) await magicMenu();
    if (k === 2) await equipMenu();
    if (k === 3) await statusMenu();
    if (k === 4) {
      const c = await choose(null, 'Record your journey? This will overwrite your previous save.', ['Save', 'Cancel'], 1);
      if (c === 0) { if (saveGame()) { Audio_.sfx('save'); await narrate('Your journey has been recorded.'); } else await narrate('Saving failed — your browser blocked storage.'); }
    }
    if (k === 5) Audio_.toggleMute();
  }
  closePanel(panel);
}
async function itemsMenu() {
  let idx = 0;
  while (true) {
    const keys = Object.keys(G.inv).sort((a, b) => (ITEMS[a].kind === 'use' ? 0 : 1) - (ITEMS[b].kind === 'use' ? 0 : 1));
    if (!keys.length) { await narrate('Your pack is empty.'); return; }
    const items = keys.map(k => ({ label: ITEMS[k].name, right: '×' + G.inv[k], disabled: ITEMS[k].kind !== 'use' || ITEMS[k].battleOnly, color: ITEMS[k].kind !== 'use' ? '#c8d0f0' : '#fff' }));
    const k = await listMenu({ x: 140, y: 60, w: 360, rows: 10, title: 'Items', items, index: idx, help: i => { const it = ITEMS[keys[i]]; return it.kind === 'use' ? it.desc : `${it.desc}  (${equipInfo(it)})`; } });
    if (k < 0) return;
    idx = k;
    const id = keys[k], it = ITEMS[id];
    if (it.effect === 'tent') {
      if (Field.map.kind !== 'world') { await narrate('You can only pitch a tent on the world map.'); continue; }
      addItem(id, -1);
      await fadeTo(1, 400); Audio_.sfx('inn'); healAll(); await wait(1000); await fadeTo(0, 400);
      await narrate('The party rests under the stars. HP and MP restored.');
      continue;
    }
    if (it.target === 'allies') { addItem(id, -1); G.party.forEach(m => applyItemEffect(id, m)); Audio_.sfx('heal'); continue; }
    while (hasItem(id)) {
      const t = await pickMember(it.name);
      if (t === null) break;
      if (applyItemEffect(id, G.party[t])) { addItem(id, -1); Audio_.sfx('heal'); }
      else Audio_.sfx('buzz');
    }
  }
}
function equipInfo(it) {
  const who = it.who.map(w => HEROES[w].name).join(', ');
  const st = [it.atk ? `ATK+${it.atk}` : '', it.def ? `DEF+${it.def}` : '', it.mag ? `MAG+${it.mag}` : '', it.spd ? `SPD+${it.spd}` : ''].filter(Boolean).join(' ');
  return `${st} · ${who}`;
}
async function magicMenu() {
  const mi = await pickMember('Magic', { filter: m => spellsOf(m).length > 0 });
  if (mi === null) return;
  const m = G.party[mi];
  let idx = 0;
  while (true) {
    const sp = spellsOf(m);
    const fieldOk = s => ['heal', 'revive', 'cure'].includes(SPELLS[s].type);
    const k = await listMenu({
      x: 140, y: 60, w: 360, rows: 9, title: `${memberName(m)} — ${HEROES[m.id].skill}  (MP ${m.mp}/${maxMp(m)})`,
      items: sp.map(s => ({ label: SPELLS[s].name, right: SPELLS[s].mp ? SPELLS[s].mp + ' MP' : '—', disabled: !fieldOk(s) || m.mp < SPELLS[s].mp || !alive(m) })),
      index: idx, help: i => SPELLS[sp[i]].desc
    });
    if (k < 0) return;
    idx = k;
    const s = SPELLS[sp[k]];
    if (s.target === 'allies') {
      m.mp -= s.mp; Audio_.sfx('heal');
      for (const t of G.party) if (alive(t)) t.hp = Math.min(maxHp(t), t.hp + Math.round((s.power + stat(m, 'mag') * 1.5) * (s.scale || 1)));
      continue;
    }
    while (m.mp >= s.mp) {
      const t = await pickMember(s.name);
      if (t === null) break;
      const tg = G.party[t];
      let ok = false;
      if (s.type === 'heal' && alive(tg) && tg.hp < maxHp(tg)) { tg.hp = Math.min(maxHp(tg), tg.hp + Math.round((s.power + stat(m, 'mag') * 1.5) * (s.scale || 1))); ok = true; }
      if (s.type === 'revive' && !alive(tg)) { tg.hp = Math.floor(maxHp(tg) * 0.35); ok = true; }
      if (s.type === 'cure' && alive(tg)) { tg.status.poison = false; ok = true; }
      if (ok) { m.mp -= s.mp; Audio_.sfx('heal'); } else Audio_.sfx('buzz');
    }
  }
}
async function equipMenu() {
  let mi = await pickMember('Equip');
  if (mi === null) return;
  while (true) {
    const m = G.party[mi];
    const panel = openPanel(g => drawEquipPanel(g, m, preview.v));
    const preview = { v: null };
    const slot = await listMenu({
      x: 360, y: 16, w: 264, rows: 2, title: memberName(m),
      items: [{ label: 'Weapon', right: ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—' }, { label: 'Armor', right: ITEMS[m.armor] ? ITEMS[m.armor].name : '—' }], size: 14
    });
    if (slot < 0) { closePanel(panel); return; }
    const key = slot === 0 ? 'weapon' : 'armor';
    const kind = slot === 0 ? 'weapon' : 'armor';
    const opts = Object.keys(G.inv).filter(k => ITEMS[k].kind === kind && ITEMS[k].who.includes(m.id));
    const list = [...opts, null];
    const setPrev = i => preview.v = { key, id: list[i] };
    setPrev(0);
    const k = await listMenu({
      x: 360, y: 130, w: 264, rows: 8, title: 'Choose',
      items: list.map(id => id ? { label: ITEMS[id].name, right: '×' + G.inv[id] } : { label: '(Remove)' }), onChange: setPrev,
      help: i => list[i] ? ITEMS[list[i]].desc : 'Unequip this slot.'
    });
    closePanel(panel);
    if (k >= 0) {
      const id = list[k];
      if (m[key]) addItem(m[key], 1);
      m[key] = id;
      if (id) addItem(id, -1);
      Audio_.sfx('item');
      m.hp = Math.min(m.hp, maxHp(m)); m.mp = Math.min(m.mp, maxMp(m));
    }
  }
}
function drawEquipPanel(g, m, prev) {
  drawWindow(g, 16, 16, 330, 300);
  drawChar(g, HEROES[m.id].look, 70, 110, 'down', 0, 2);
  text(g, memberName(m), 120, 30, { size: 20, bold: true });
  text(g, `${HEROES[m.id].cls} · Lv ${m.level}`, 120, 56, { size: 14, color: '#b8c4ee' });
  const stats = [['ATK', 'str'], ['DEF', 'def'], ['MAG', 'mag'], ['SPD', 'spd']];
  let after = null;
  if (prev) { const tmp = { ...m, [prev.key]: prev.id }; after = tmp; }
  stats.forEach(([lab, s], i) => {
    const y = 140 + i * 32;
    const cur = stat(m, s);
    text(g, lab, 40, y, { size: 16, color: '#ffe9a8' });
    text(g, String(cur), 150, y, { size: 17, align: 'right' });
    if (after) {
      const nv = stat(after, s);
      text(g, '→', 175, y, { size: 16, color: '#b8c4ee' });
      text(g, String(nv), 240, y, { size: 17, align: 'right', color: nv > cur ? '#7aff9a' : nv < cur ? '#ff8a8a' : '#fff' });
    }
  });
  text(g, `Weapon: ${ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—'}`, 40, 274, { size: 13, color: '#c8d0f0' });
  text(g, `Armor:  ${ITEMS[m.armor] ? ITEMS[m.armor].name : '—'}`, 40, 292, { size: 13, color: '#c8d0f0' });
}
async function statusMenu() {
  const mi = await pickMember('Status');
  if (mi === null) return;
  const m = G.party[mi];
  const p = openPanel(g => {
    drawWindow(g, 40, 30, 560, 420);
    drawChar(g, HEROES[m.id].look, 120, 170, 'down', 0, 3);
    text(g, memberName(m), 200, 50, { size: 26, bold: true, fam: SERIF });
    text(g, `${HEROES[m.id].cls}  ·  Level ${m.level}`, 200, 86, { size: 15, color: '#ffe9a8' });
    text(g, `EXP ${m.xp}   Next ${m.level >= MAX_LEVEL ? '—' : xpForLevel(m.level + 1) - m.xp}`, 200, 110, { size: 14, color: '#b8c4ee' });
    const st = [['HP', `${m.hp} / ${maxHp(m)}`], ['MP', `${m.mp} / ${maxMp(m)}`], ['Attack', stat(m, 'str')], ['Defense', stat(m, 'def')], ['Magic', stat(m, 'mag')], ['Speed', stat(m, 'spd')]];
    st.forEach(([a, b], i) => { text(g, a, 200, 150 + i * 28, { size: 16, color: '#c8d0f0' }); text(g, String(b), 400, 150 + i * 28, { size: 16, align: 'right' }); });
    text(g, 'Weapon', 430, 150, { size: 13, color: '#b8c4ee' }); text(g, ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—', 430, 168, { size: 15 });
    text(g, 'Armor', 430, 200, { size: 13, color: '#b8c4ee' }); text(g, ITEMS[m.armor] ? ITEMS[m.armor].name : '—', 430, 218, { size: 15 });
    const sp = spellsOf(m).map(s => SPELLS[s].name).join(', ') || '—';
    text(g, HEROES[m.id].skill, 70, 330, { size: 14, color: '#ffe9a8' });
    wrapText(g, sp, 500, font(14)).forEach((l, i) => text(g, l, 70, 350 + i * 20, { size: 14 }));
    wrapText(g, HEROES[m.id].bio, 500, font(14, false, SERIF)).forEach((l, i) => text(g, l, 70, 400 + i * 20, { size: 14, fam: SERIF, color: '#d8dcf0' }));
  });
  await UI.push({ update() { if (Input.p('ok') || Input.p('cancel')) { Audio_.sfx('cancel'); UI.close(this); } }, draw() { } });
  closePanel(p);
}
// ---------- shop ----------
async function openShop(listId, keeper) {
  const stock = SHOPS[listId];
  const goldPanel = openPanel(g => { drawWindow(g, 472, 330, 152, 44); text(g, `${G.gold} G`, 610, 342, { size: 17, align: 'right', color: '#ffe9a8' }); });
  await say(keeper, 'Welcome! What can I do for you?');
  let mode = 0;
  while (true) {
    const k = await listMenu({ x: 16, y: 16, w: 150, rows: 3, items: [{ label: 'Buy' }, { label: 'Sell' }, { label: 'Leave' }], index: mode });
    if (k < 0 || k === 2) break;
    mode = k;
    if (k === 0) {
      let idx = 0;
      while (true) {
        const det = openPanel(g => drawShopDetail(g, stock[sel.v]));
        const sel = { v: idx };
        const r = await listMenu({
          x: 16, y: 70, w: 300, rows: 9, title: 'Buy', index: idx, onChange: i => sel.v = i,
          items: stock.map(id => ({ label: ITEMS[id].name, right: ITEMS[id].price + ' G', disabled: G.gold < ITEMS[id].price })),
          help: i => ITEMS[stock[i]].desc
        });
        closePanel(det);
        if (r < 0) break;
        idx = r;
        const it = ITEMS[stock[r]];
        G.gold -= it.price; addItem(stock[r]); Audio_.sfx('item');
        toast(`Bought ${it.name}`);
      }
    } else {
      let idx = 0;
      while (true) {
        const keys = Object.keys(G.inv);
        if (!keys.length) { await say(keeper, "You've nothing to sell, friend."); break; }
        const r = await listMenu({
          x: 16, y: 70, w: 340, rows: 9, title: 'Sell', index: Math.min(idx, keys.length - 1),
          items: keys.map(id => ({ label: `${ITEMS[id].name} ×${G.inv[id]}`, right: ITEMS[id].price ? Math.floor(ITEMS[id].price / 2) + ' G' : '—', disabled: !ITEMS[id].price }))
        });
        if (r < 0) break;
        idx = r;
        const id = keys[r];
        G.gold += Math.floor(ITEMS[id].price / 2); addItem(id, -1); Audio_.sfx('item');
      }
    }
  }
  closePanel(goldPanel);
  await say(keeper, 'Come again! Safe travels.');
}
function drawShopDetail(g, id) {
  if (!id) return;
  const it = ITEMS[id];
  drawWindow(g, 330, 70, 294, 250);
  text(g, it.name, 346, 82, { size: 17, bold: true, color: '#ffe9a8' });
  text(g, `Owned: ${G.inv[id] || 0}`, 610, 84, { size: 13, align: 'right', color: '#b8c4ee' });
  if (it.kind === 'use') {
    wrapText(g, it.desc, 260, font(14)).forEach((l, i) => text(g, l, 346, 112 + i * 20, { size: 14 }));
    return;
  }
  let y = 112;
  for (const m of G.party) {
    const can = it.who.includes(m.id);
    drawChar(g, HEROES[m.id].look, 362, y + 40, 'down', 0, 1);
    if (!can) { text(g, `${memberName(m)}: can't equip`, 390, y + 14, { size: 14, color: '#8792b8' }); }
    else {
      const key = it.kind;
      const tmp = { ...m, [key]: id };
      const s = it.kind === 'weapon' ? (it.mag && !it.atk ? 'mag' : 'str') : 'def';
      const cur = stat(m, s), nv = stat(tmp, s);
      const lab = { str: 'ATK', def: 'DEF', mag: 'MAG' }[s];
      const eq = m[key] === id;
      text(g, `${memberName(m)}: ${lab} ${cur} → `, 390, y + 14, { size: 14 });
      g.font = font(14);
      const w = g.measureText(`${memberName(m)}: ${lab} ${cur} → `).width;
      text(g, eq ? 'E' : String(nv), 390 + w, y + 14, { size: 14, bold: true, color: eq ? '#ffe9a8' : nv > cur ? '#7aff9a' : nv < cur ? '#ff8a8a' : '#fff' });
      if (it.mag && s === 'str') text(g, `MAG +${it.mag}`, 390, y + 32, { size: 12, color: '#b8c4ee' });
    }
    y += 50;
  }
}
// ---------- inn ----------
async function innStay(townId, price, keeper = 'Innkeeper') {
  const c = await choose(keeper, `Welcome, travelers! A warm bed is ${price} gold for the party. Will you rest?`, ['Stay', 'No thanks'], 1);
  if (c !== 0) { await say(keeper, 'Another time, then.'); return; }
  if (G.gold < price) { await say(keeper, "Ah... you're a bit short on coin, I'm afraid."); return; }
  G.gold -= price;
  await fadeTo(1, 500);
  Audio_.stopMusic();
  Audio_.sfx('inn');
  healAll();
  G.lastInn = { town: townId };
  await wait(1600);
  Field.playMusic();
  Audio_.play(Audio_.curName, true);
  await fadeTo(0, 500);
  await say(keeper, 'Good morning! You look well rested.');
  const s = await choose(null, 'Record your journey?', ['Save', 'Not now'], 1);
  if (s === 0 && saveGame()) { Audio_.sfx('save'); await narrate('Your journey has been recorded.'); }
}
