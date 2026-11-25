'use strict';
// ============================================================
//  MENUS — field menu, items, magic, equipment, status, shop, inn
// ============================================================
function drawPartyPanel(g, sel = -1) {
  const x = 16, y = 16, w = 440, five = G.party.length > 4, rowH = five ? 88 : 100;
  drawWindow(g, x, y, w, 16 + G.party.length * rowH);
  G.party.forEach((m, i) => {
    const yy = y + 10 + i * rowH;
    if (i === sel) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 8, yy, w - 16, rowH - 6); }
    const L = HEROES[m.id].look;
    g.save(); if (!alive(m)) g.globalAlpha = 0.5;
    drawChar(g, L, x + 50, yy + (five ? 70 : 78), 'down', 0, five ? 1.4 : 1.6, alive(m) ? null : 'ko');
    if (i >= 4) text(g, tl('Reserve'), x + 98 + 120, yy + 30, { size: 12, color: '#ffb86a' });
    g.restore();
    text(g, memberName(m), x + 100, yy + 6, { size: 18, bold: true, color: alive(m) ? '#fff' : '#ff8a8a' });
    text(g, HEROES[m.id].cls, x + 100, yy + 30, { size: 13, color: '#b8c4ee' });
    text(g, tl`Lv ${m.level}`, x + 220, yy + 8, { size: 15, color: '#ffe9a8' });
    if (m.status.poison) text(g, tl('Poison'), x + 290, yy + 8, { size: 13, color: '#8aff7a' });
    const oy = five ? -6 : 0;
    text(g, tl('HP'), x + 100, yy + 52 + oy, { size: 13, color: '#9adf9a' });
    text(g, `${m.hp} / ${maxHp(m)}`, x + 250, yy + 50 + oy, { size: 15, align: 'right' });
    bar(g, x + 126, yy + 70 + oy, 124, 4, m.hp / maxHp(m), '#6ae07a');
    text(g, tl('MP'), x + 270, yy + 52 + oy, { size: 13, color: '#9ab0ff' });
    text(g, `${m.mp} / ${maxMp(m)}`, x + 410, yy + 50 + oy, { size: 15, align: 'right' });
    bar(g, x + 296, yy + 70 + oy, 114, 4, m.mp / Math.max(1, maxMp(m)), '#6aa8ff');
    const nx = xpForLevel(m.level + 1) - m.xp;
    text(g, m.level >= MAX_LEVEL ? 'MAX' : tl`Next ${nx}`, x + 410, yy + 8, { size: 12, color: '#b8c4ee', align: 'right' });
  });
}
function drawInfoPanel(g) {
  const ml = mealNow();
  if (ml) { drawWindow(g, 472, 330, 152, 26); text(g, ml.name, 482, 335, { size: 11, color: '#ffd27a' }); text(g, `×${G.meal.left}`, 614, 335, { size: 11, align: 'right', color: '#b8c4ee' }); }
  drawWindow(g, 472, 360, 152, 104);
  text(g, tl('Gold'), 486, 372, { size: 13, color: '#b8c4ee' });
  text(g, `${G.gold}`, 610, 370, { size: 16, align: 'right', color: '#ffe9a8' });
  const wx = currentWeather();
  text(g, tl`Day ${dayNumber()}`, 486, 398, { size: 13, color: '#b8c4ee' });
  text(g, `${WEATHER[wx].icon} ${isNight() ? '☾' : ''}${fmtClockHM()}`, 610, 396, { size: 16, align: 'right', color: isNight() ? '#b8c8ff' : '#fff' });
  const lit = ['ember', 'tide', 'stone', 'dawn'].map((k, i) => G.flags['lantern' + (i + 1)]);
  text(g, tl('Lanterns'), 486, 424, { size: 13, color: '#b8c4ee' });
  lit.forEach((l, i) => { circle(g, 498 + i * 26, 450, 8, l ? ['#ff9a3a', '#5af0d0', '#ff6a2a', '#ffe08a'][i] : 'rgba(255,255,255,.12)', '#fff', 1.2); });
  if (G.flags.lantern5) { const x = 602, y = 450; poly(g, [x, y - 9, x + 3, y - 3, x + 9, y, x + 3, y + 3, x, y + 9, x - 3, y + 3, x - 9, y, x - 3, y - 3], '#a8d8ff', '#fff', 1); }
  if (G.flags.lantern_abyss) { const x = 602, y = 426; circle(g, x, y, 6, '#b8a8ff', '#fff', 1); circle(g, x + 3, y - 2, 5, '#0c1650'); }
}
async function pickMember(title, opt = {}) {
  const panel = openPanel(g => drawPartyPanel(g, sel.v));
  const sel = { v: opt.index || 0 };
  const items = G.party.map(m => ({ label: memberName(m), right: `${m.hp}/${maxHp(m)}`, disabled: opt.filter ? !opt.filter(m) : false }));
  const r = await listMenu({ x: 470, y: 16, w: 154, rows: 5, title, items, index: sel.v, onChange: i => sel.v = i });
  closePanel(panel);
  return r < 0 ? null : r;
}
async function openMainMenu() {
  Audio_.sfx('ok');
  const panel = openPanel(g => { drawPartyPanel(g); drawInfoPanel(g); });
  let idx = 0;
  while (true) {
    const items = [{ label: tl('Items') }, { label: tl('Magic') }, { label: tl('Equip') }, { label: tl('Status') }, { label: tl('Formation'), disabled: G.party.length < 2 }, { label: tl('Quests') }, { label: tl('Bestiary') }, { label: tl('Map') }, { label: tl('Log'), disabled: !DialogLog.length }, { label: tl('Save') }, { label: tl('Config') }, { label: tl('Close') }];
    const k = await listMenu({ x: 472, y: 16, w: 152, rows: 12, rowH: 24, items, index: idx });
    if (k < 0 || k === 11) break;
    idx = k;
    if (k === 0) await itemsMenu();
    if (k === 1) await magicMenu();
    if (k === 2) await equipMenu();
    if (k === 3) await statusMenu();
    if (k === 4) await formationMenu();
    if (k === 5) await questMenu();
    if (k === 6) await bestiaryMenu();
    if (k === 7) await worldMapView();
    if (k === 8) await dialogueLog();
    if (k === 9) await saveToSlot();
    if (k === 10) await configMenu();
  }
  closePanel(panel);
}
// ---------- dialogue log ----------
async function dialogueLog() {
  const lines = [];
  for (const e of DialogLog) {
    const ws = wrapText(ctx, e.msg, 520, font(14));
    lines.push({ name: e.name, s: ws[0], spoken: !!e.name });
    for (const w of ws.slice(1)) lines.push({ name: null, s: w, cont: true, spoken: !!e.name });
  }
  const view = 15;
  let top = Math.max(0, lines.length - view);
  await UI.push({
    update() {
      if (Input.p('up')) top = Math.max(0, top - 1);
      if (Input.p('down')) top = Math.min(Math.max(0, lines.length - view), top + 1);
      if (Input.p('ok') || Input.p('cancel')) { Audio_.sfx('cancel'); UI.close(this); }
    },
    draw(g) {
      drawWindow(g, 16, 16, 608, 448);
      text(g, tl('Log'), 32, 26, { size: 15, bold: true, color: '#ffe9a8' });
      text(g, tl('↑↓ scroll · Enter close'), 608, 28, { size: 12, align: 'right', color: '#b8c4ee' });
      lines.slice(top, top + view).forEach((l, i) => {
        const y = 56 + i * 26;
        if (l.name && !l.cont) text(g, l.name, 32, y, { size: 13, bold: true, color: '#ffe9a8' });
        text(g, l.s, 96, y, { size: 14, color: l.spoken ? '#fff' : '#c8d0f0' });
      });
    }
  });
}
// ---------- save slots ----------
function drawSlotPanel(g, slot) {
  drawWindow(g, 300, 60, 324, 260);
  const s = slotSummary(slot);
  text(g, slot === 'auto' ? tl('Auto-save') : tl`Slot ${slot}`, 316, 72, { size: 16, bold: true, color: '#ffe9a8' });
  if (!s) { text(g, tl('Empty'), 462, 180, { size: 18, align: 'center', color: '#8792b8' }); return; }
  text(g, s.when, 608, 74, { size: 12, align: 'right', color: '#b8c4ee' });
  text(g, s.place, 316, 100, { size: 16 });
  text(g, s.chapter + (s.ng ? tl`  ·  NG+${s.ng}` : '') + (s.hollow ? tl('  ·  Hollow') : ''), 316, 124, { size: 13, color: '#9ad8ff' });
  s.d.party.slice(0, 5).forEach((m, i) => { drawChar(g, HEROES[m.id].look, 340 + i * 56, 210, 'down', 0, 1.3); text(g, tl`Lv${m.level}`, 340 + i * 56, 216, { size: 12, align: 'center', color: '#ffe9a8' }); });
  text(g, tl('Time'), 316, 248, { size: 13, color: '#b8c4ee' }); text(g, s.time, 420, 248, { size: 14, align: 'right' });
  text(g, tl('Gold'), 440, 248, { size: 13, color: '#b8c4ee' }); text(g, String(s.d.gold || 0), 608, 248, { size: 14, align: 'right', color: '#ffe9a8' });
  const lit = [1, 2, 3, 4].map(n => s.d.flags['lantern' + n]);
  lit.forEach((l, i) => circle(g, 324 + i * 22, 290, 7, l ? ['#ff9a3a', '#5af0d0', '#ff6a2a', '#ffe08a'][i] : 'rgba(255,255,255,.12)', '#fff', 1));
  if (s.d.flags.lantern5) circle(g, 324 + 4 * 22, 290, 7, '#a8d8ff', '#fff', 1);
  if (s.d.flags.lantern_abyss) circle(g, 324 + 5 * 22, 290, 7, '#b8a8ff', '#fff', 1);
}
// mode 'save' lists slots 1–3; 'load' adds the auto-save. Returns a slot id or null.
async function pickSlot(mode, title, filter) {
  const slots = mode === 'load' ? ALL_SLOTS : SAVE_SLOTS;
  const label = sl => { const s = slotSummary(sl); return (sl === 'auto' ? tl('Auto') : tl('Slot ') + sl) + (s ? '' : '  —'); };
  const sel = { v: Math.max(0, slots.indexOf(mode === 'load' ? latestSlot() : G.slot)) };
  const panel = openPanel(g => drawSlotPanel(g, slots[sel.v]));
  const k = await listMenu({ x: 16, y: 60, w: 270, rows: 4, title: title || (mode === 'save' ? tl('Save to…') : tl('Load…')), index: sel.v, onChange: i => sel.v = i,
    items: slots.map(sl => { const s = slotSummary(sl); return { label: label(sl), right: s ? s.place.slice(0, 16) : '', disabled: mode === 'load' && (!s || (filter && !filter(s.d))), color: s && (!filter || filter(s.d)) ? '#fff' : '#8792b8' }; }) });
  closePanel(panel);
  return k < 0 ? null : slots[k];
}
async function saveToSlot() {
  const slot = await pickSlot('save');
  if (!slot) return false;
  if (hasSave(slot) && slot !== G.slot) { const c = await choose(null, tl`Overwrite the journey in slot ${slot}?`, [tl('Overwrite'), tl('Cancel')], 1); if (c !== 0) return false; }
  if (saveGame(slot)) { Audio_.sfx('save'); await narrate(tl`Your journey has been recorded in slot ${slot}.`); return true; }
  await narrate(tl('Saving failed — your browser blocked storage.')); return false;
}
// After an inn or a story milestone: one press saves to the current slot
async function promptSave() {
  const c = await choose(null, tl('Record your journey?'), [tl`Save to slot ${G.slot}`, tl('Choose a slot'), tl('Not now')], 2);
  if (c === 0 && saveGame(G.slot)) { Audio_.sfx('save'); await narrate(tl`Your journey has been recorded in slot ${G.slot}.`); }
  if (c === 1) await saveToSlot();
}
const ACTION_NAMES = { up: tl('Up'), down: tl('Down'), left: tl('Left'), right: tl('Right'), ok: tl('Confirm'), cancel: tl('Menu / back'), run: tl('Run / repeat turn'), mute: tl('Sound on/off') };
// 'KeyW' → 'W', 'ArrowUp' → '↑', 'ShiftLeft' → 'Shift L'
const KEY_NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: tl('Esc'), Backspace: tl('Bksp'), NumpadEnter: tl('Num Enter'), ShiftLeft: tl('Shift L'), ShiftRight: tl('Shift R') };
const keyLabel = code => KEY_NAMES[code] || code.replace(/^Key|^Digit/, '');
async function controlsMenu() {
  let idx = 0;
  while (true) {
    const acts = ['up', 'down', 'left', 'right', 'ok', 'cancel', 'run', 'mute'];
    const keysFor = a => Object.keys(KEYMAP).filter(c => KEYMAP[c] === a).map(keyLabel).join(', ') || '—';
    const items = [...acts.map(a => ({ label: ACTION_NAMES[a], right: keysFor(a) })), { label: tl('Reset to defaults') }, { label: tl('Done') }];
    const k = await listMenu({ x: 110, y: 60, w: 420, rows: items.length, title: 'Controls', items, index: idx, help: i => i < acts.length ? tl('Press Enter, then the new key. It replaces every key for this action.') : '', helpY: H - 52 });
    if (k < 0 || k === items.length - 1) return;
    idx = k;
    if (k === acts.length) { CFG.keys = null; saveCfg(); applyKeymap(); toast(tl('Controls reset')); continue; }
    const a = acts[k];
    const code = await new Promise(res => {
      KeyCapture.cb = res;
      UI.push({ update() { if (!KeyCapture.cb) UI.close(this); }, draw(g) { drawWindow(g, 170, 200, 300, 60); text(g, tl`Press a key for: ${ACTION_NAMES[a]}`, 320, 220, { size: 16, align: 'center' }); } });
    });
    const map = { ...KEYMAP };
    for (const c in map) if (map[c] === a || c === code) delete map[c];
    map[code] = a;
    // never lock the player out of confirming or going back
    if (!Object.values(map).includes('ok') || !Object.values(map).includes('cancel')) { Audio_.sfx('buzz'); toast(tl('Confirm and Back need a key')); continue; }
    CFG.keys = map; saveCfg(); applyKeymap(); Audio_.sfx('ok');
  }
}
// Languages (2.0, EN-6): picking one saves it and reloads, so every line is in the new language
async function languageMenu() {
  const langs = languages();
  const k = await listMenu({ x: 200, y: 120, w: 240, rows: Math.min(langs.length, 8), title: tl('Language'), items: langs.map(([code, name]) => ({ label: name, right: code === LANG ? '✓' : '' })), index: Math.max(0, langs.findIndex(l => l[0] === LANG)) });
  if (k < 0 || langs[k][0] === LANG) return;
  if (G.party.length && G.scene !== TitleScene) {
    const c = await choose(null, tl`Switch to ${langs[k][1]}? The game restarts: anything since your last save is lost.`, [tl('Switch'), tl('Cancel')], 1);
    if (c !== 0) return;
  }
  setLanguage(langs[k][0]);
}
async function configMenu() {
  let idx = 0;
  while (true) {
    const cycle = (key, list, d) => { CFG[key] = ((CFG[key] || 0) + (d || 1) + list.length) % list.length; saveCfg(); };
    const toggle = key => { CFG[key] = !CFG[key]; saveCfg(); };
    const rows = [
      { label: tl('Sound'), right: Audio_.muted ? tl('Off') : tl('On'), act: () => Audio_.toggleMute(), help: tl('Music and sound effects (or press M).') },
      { label: tl('Auto-dash'), right: CFG.dash ? tl('On') : tl('Off'), act: () => toggle('dash'), help: tl('Run everywhere. Hold Shift (or R) to walk instead.') },
      { label: tl('Text speed'), right: TEXT_SPEEDS[CFG.textSpeed || 0].label, act: d => cycle('textSpeed', TEXT_SPEEDS, d), help: tl('How fast dialogue appears.') },
      { label: tl('Battle speed'), right: BATTLE_SPEEDS[CFG.battleSpeed || 0].label, act: d => cycle('battleSpeed', BATTLE_SPEEDS, d), help: tl('Speeds up battle animations. Messages still wait for you.') },
      { label: tl('Auto-save'), right: CFG.autosave !== false ? tl('On') : tl('Off'), act: () => { CFG.autosave = CFG.autosave === false; saveCfg(); }, help: tl('Save to the Auto slot whenever you enter a town or dungeon.') },
      { label: tl('Large text'), right: CFG.bigText ? tl('On') : tl('Off'), act: () => toggle('bigText'), help: tl('Bigger dialogue text.') },
      { label: tl('High contrast'), right: CFG.contrast ? tl('On') : tl('Off'), act: () => toggle('contrast'), help: tl('Solid black windows with bright borders.') },
      { label: tl('Controls…'), right: '', help: tl('Change which keys do what.') },
      { label: tl('Language'), right: (languages().find(l => l[0] === LANG) || ['', 'English'])[1], help: tl('The language of the game. Changing it restarts the game.') },
      { label: tl('Encounters'), right: !G.flags.ending ? '—' : CFG.noEnc ? tl('Off') : tl('On'), disabled: !G.flags.ending, act: () => toggle('noEnc'), help: G.flags.ending ? tl('Turn random battles off for exploring. Bosses still fight.') : tl('Unlocked after you finish the story.') },
      { label: tl('Speedrun timer'), right: CFG.speedrun ? tl('On') : tl('Off'), act: () => toggle('speedrun'), help: tl('Show play time on screen, with splits at each Lantern.') },
      { label: tl('Battery saver'), right: CFG.battery ? tl('On') : tl('Off'), act: () => toggle('battery'), help: tl('Draw at 30 frames a second instead of 60. Easier on phones and laptops.') },
      { label: tl('Done'), help: '' }
    ];
    const done = rows.length - 1;
    // Enter or Left/Right changes a setting; the menu re-opens to show the new value
    const k = await listMenu({ x: 170, y: 52, w: 300, rows: Math.min(rows.length, 13), title: tl('Config'), items: rows, index: idx, help: i => rows[i].help, helpY: H - 52,
      lr(i, d) { if (rows[i].act && !rows[i].disabled) { rows[i].act(d); Audio_.sfx('cursor'); UI.close(this, -2 - i); } } });
    if (k === -1 || k === done) return;
    if (k <= -2) { idx = -2 - k; continue; }
    idx = k;
    if (rows[k].label === tl('Controls…')) { await controlsMenu(); continue; }
    if (rows[k].label === tl('Language')) { await languageMenu(); continue; }
    if (rows[k].act && !rows[k].disabled) rows[k].act(1);
  }
}
async function itemsMenu() {
  let idx = 0;
  while (true) {
    const ord = k => ({ use: 0, weapon: 1, armor: 2, acc: 3, mat: 4, fish: 5, key: 6 })[ITEMS[k].kind] ?? 7;
    const keys = Object.keys(G.inv).sort((a, b) => ord(a) - ord(b));
    if (!keys.length) { await narrate(tl('Your pack is empty.')); return; }
    const items = keys.map(k => ({ label: ITEMS[k].name, right: '×' + G.inv[k], disabled: ITEMS[k].kind !== 'use' || ITEMS[k].battleOnly, color: ITEMS[k].kind === 'key' ? '#ffe9a8' : ITEMS[k].kind === 'fish' ? '#9ad8ff' : ITEMS[k].kind === 'mat' ? '#ffc8a0' : ITEMS[k].kind !== 'use' ? '#c8d0f0' : '#fff' }));
    const k = await listMenu({ x: 140, y: 60, w: 360, rows: 10, title: tl('Items'), items, index: idx, help: i => { const it = ITEMS[keys[i]]; return ['use', 'key', 'mat', 'fish'].includes(it.kind) ? it.desc : `${it.desc}  (${equipInfo(it)})`; } });
    if (k < 0) return;
    idx = k;
    const id = keys[k], it = ITEMS[id];
    if (it.effect === 'tent') {
      if (Field.map.kind !== 'world') { await narrate(tl('You can only pitch a tent on the world map.')); continue; }
      addItem(id, -1);
      await fadeTo(1, 400); Audio_.sfx('inn'); healAll(); G.clock = clockNow() + 8 * 60; await wait(1000); await fadeTo(0, 400);
      await narrate(tl('The party rests under the stars. HP and MP restored.'));
      await campfireTalk();
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
  const who = it.who ? it.who.map(w => HEROES[w].name).join(', ') : tl('Anyone');
  const st = [it.atk ? tl`ATK+${it.atk}` : '', it.def ? tl`DEF+${it.def}` : '', it.mag ? tl`MAG+${it.mag}` : '', it.spd ? tl`SPD+${it.spd}` : ''].filter(Boolean).join(' ');
  return `${st} · ${who}`;
}
async function magicMenu() {
  const mi = await pickMember(tl('Magic'), { filter: m => spellsOf(m).length > 0 });
  if (mi === null) return;
  const m = G.party[mi];
  let idx = 0;
  while (true) {
    const sp = spellsOf(m);
    const fieldOk = s => ['heal', 'revive', 'cure', 'sanctuary'].includes(SPELLS[s].type);
    const k = await listMenu({
      x: 140, y: 60, w: 360, rows: 9, title: tl`${memberName(m)} — ${HEROES[m.id].skill}  (MP ${m.mp}/${maxMp(m)})`,
      items: sp.map(s => ({ label: SPELLS[s].name, right: SPELLS[s].mp ? tl`${spellCost(m, s)} MP` : '—', disabled: !fieldOk(s) || m.mp < spellCost(m, s) || !alive(m) })),
      index: idx, help: i => SPELLS[sp[i]].desc
    });
    if (k < 0) return;
    idx = k;
    const s = SPELLS[sp[k]], cost = spellCost(m, sp[k]);
    if (s.target === 'allies') {
      m.mp -= cost; Audio_.sfx('heal');
      for (const t of G.party) {
        if (s.type === 'sanctuary' && !alive(t)) { t.hp = Math.floor(maxHp(t) * 0.5); continue; }
        if (alive(t)) t.hp = Math.min(maxHp(t), t.hp + Math.round((s.power + stat(m, 'mag') * 1.5) * (s.scale || 1)));
        if (s.type === 'sanctuary') t.status = {};
      }
      continue;
    }
    while (m.mp >= cost) {
      const t = await pickMember(s.name);
      if (t === null) break;
      const tg = G.party[t];
      let ok = false;
      if (s.type === 'heal' && alive(tg) && tg.hp < maxHp(tg)) { tg.hp = Math.min(maxHp(tg), tg.hp + Math.round((s.power + stat(m, 'mag') * 1.5) * (s.scale || 1))); ok = true; }
      if (s.type === 'revive' && !alive(tg)) { tg.hp = Math.floor(maxHp(tg) * 0.35); ok = true; }
      if (s.type === 'cure' && alive(tg)) { cureAll(tg); ok = true; }
      if (ok) { m.mp -= cost; Audio_.sfx('heal'); } else Audio_.sfx('buzz');
    }
  }
}
async function equipMenu() {
  let mi = await pickMember(tl('Equip'));
  if (mi === null) return;
  while (true) {
    const m = G.party[mi];
    const panel = openPanel(g => drawEquipPanel(g, m, preview.v));
    const preview = { v: null };
    const slot = await listMenu({
      x: 360, y: 16, w: 264, rows: 4, title: memberName(m),
      items: [{ label: tl('Weapon'), right: ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—' }, { label: tl('Armor'), right: ITEMS[m.armor] ? ITEMS[m.armor].name : '—' }, { label: tl('Accessory'), right: ITEMS[m.acc] ? ITEMS[m.acc].name : '—' }, { label: tl('Optimise'), right: tl('weapon + armour'), rcolor: '#9ad8ff' }], size: 14,
      help: i => i === 3 ? tl('Equip the best weapon and armour you own. Accessories are left alone.') : '', helpY: H - 52
    });
    if (slot < 0) { closePanel(panel); return; }
    if (slot === 3) { closePanel(panel); const n = optimiseGear(m); Audio_.sfx(n ? 'item' : 'buzz'); toast(n ? tl`${memberName(m)}: equipped ${n} better item${n > 1 ? 's' : ''}` : tl('Already the best you have')); continue; }
    const key = ['weapon', 'armor', 'acc'][slot];
    const kind = key;
    const opts = Object.keys(G.inv).filter(k => ITEMS[k].kind === kind && canEquip(ITEMS[k], m.id));
    const list = [...opts, null];
    const setPrev = i => preview.v = { key, id: list[i] };
    setPrev(0);
    const k = await listMenu({
      x: 360, y: 156, w: 264, rows: 8, title: tl('Choose'), helpY: H - 52,
      items: list.map(id => id ? { label: ITEMS[id].name, right: '×' + G.inv[id] } : { label: tl('(Remove)') }), onChange: setPrev,
      help: i => list[i] ? ITEMS[list[i]].desc : tl('Unequip this slot.')
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
// What each hero values in gear: fighters want ATK, casters MAG, Kestrel likes speed too
const GEAR_WEIGHTS = { arin: { atk: 1, mag: 0.35 }, lyra: { mag: 1, atk: 0.15 }, oswin: { atk: 0.6, mag: 0.7 }, kestrel: { atk: 1, spd: 0.6 }, selene: { mag: 1, atk: 0.15 } };
function gearScore(m, id) {
  const it = ITEMS[id]; if (!it) return -1;
  const w = GEAR_WEIGHTS[m.id] || { atk: 1 };
  if (it.kind === 'armor') return (it.def || 0) + (it.mag || 0) * (w.mag || 0) * 0.6 + (it.spd || 0) * (w.spd || 0.3);
  return (it.atk || 0) * (w.atk || 0) + (it.mag || 0) * (w.mag || 0) + (it.spd || 0) * (w.spd || 0);
}
function optimiseGear(m) {
  let changed = 0;
  for (const key of ['weapon', 'armor']) {
    const best = Object.keys(G.inv).filter(k => ITEMS[k].kind === key && canEquip(ITEMS[k], m.id)).sort((a, b) => gearScore(m, b) - gearScore(m, a))[0];
    if (best && gearScore(m, best) > gearScore(m, m[key])) { if (m[key]) addItem(m[key], 1); m[key] = best; addItem(best, -1); changed++; }
  }
  m.hp = Math.min(m.hp, maxHp(m)); m.mp = Math.min(m.mp, maxMp(m));
  return changed;
}
function drawEquipPanel(g, m, prev) {
  drawWindow(g, 16, 16, 330, 304);
  drawChar(g, HEROES[m.id].look, 70, 110, 'down', 0, 2);
  text(g, memberName(m), 120, 30, { size: 20, bold: true });
  text(g, tl`${HEROES[m.id].cls} · Lv ${m.level}`, 120, 56, { size: 14, color: '#b8c4ee' });
  const stats = [[tl('ATK'), 'str'], [tl('DEF'), 'def'], [tl('MAG'), 'mag'], [tl('SPD'), 'spd']];
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
  text(g, tl`Weapon: ${ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—'}`, 40, 274, { size: 13, color: '#c8d0f0' });
  text(g, tl`Armor:  ${ITEMS[m.armor] ? ITEMS[m.armor].name : '—'}`, 40, 290, { size: 13, color: '#c8d0f0' });
  if (prev && prev.key === 'acc' && prev.id && ITEMS[prev.id].immune) text(g, tl('Prevents: ') + ITEMS[prev.id].immune.join(', '), 40, 120, { size: 12, color: '#9ad8ff' });
}
async function statusMenu() {
  const mi = await pickMember(tl('Status'));
  if (mi === null) return;
  const m = G.party[mi];
  const p = openPanel(g => {
    drawWindow(g, 40, 30, 560, 420);
    drawChar(g, HEROES[m.id].look, 120, 170, 'down', 0, 3);
    text(g, memberName(m), 200, 50, { size: 26, bold: true, fam: SERIF });
    text(g, tl`${HEROES[m.id].cls}  ·  Level ${m.level}`, 200, 86, { size: 15, color: '#ffe9a8' });
    text(g, tl`EXP ${m.xp}   Next ${m.level >= MAX_LEVEL ? `Ember in ${EMBER_CAP_XP - (m.capxp || 0)}` : xpForLevel(m.level + 1) - m.xp}`, 200, 110, { size: 14, color: '#b8c4ee' });
    const st = [[tl('HP'), `${m.hp} / ${maxHp(m)}`], [tl('MP'), `${m.mp} / ${maxMp(m)}`], [tl('Attack'), stat(m, 'str')], [tl('Defense'), stat(m, 'def')], [tl('Magic'), stat(m, 'mag')], [tl('Speed'), stat(m, 'spd')]];
    st.forEach(([a, b], i) => { text(g, a, 200, 150 + i * 28, { size: 16, color: '#c8d0f0' }); text(g, String(b), 400, 150 + i * 28, { size: 16, align: 'right' }); });
    text(g, tl('Weapon'), 430, 150, { size: 13, color: '#b8c4ee' }); text(g, ITEMS[m.weapon] ? ITEMS[m.weapon].name : '—', 430, 168, { size: 15 });
    text(g, tl('Armor'), 430, 200, { size: 13, color: '#b8c4ee' }); text(g, ITEMS[m.armor] ? ITEMS[m.armor].name : '—', 430, 218, { size: 15 });
    text(g, tl('Accessory'), 430, 250, { size: 13, color: '#b8c4ee' }); text(g, ITEMS[m.acc] ? ITEMS[m.acc].name : '—', 430, 268, { size: 15 });
    const sp = spellsOf(m).map(s => SPELLS[s].name).join(', ') || '—';
    text(g, HEROES[m.id].skill, 70, 330, { size: 14, color: '#ffe9a8' });
    wrapText(g, sp, 500, font(14)).forEach((l, i) => text(g, l, 70, 350 + i * 20, { size: 14 }));
    const pas = Object.keys(PASSIVES).filter(k => hasPassive(m, k)).map(k => PASSIVES[k].name);
    if (boardOpen(m)) {
      text(g, tl`Board ${(m.board || []).length}/${Object.keys(BOARD_NODES).length - 1} · ${m.embers || 0} Ember${m.embers === 1 ? '' : 's'}`, 430, 296, { size: 12, color: '#ffd27a' });
      text(g, tl('Enter: Lantern Board'), 430, 312, { size: 12, color: '#b8c4ee' });
      if (pas.length) wrapText(g, pas.join(', '), 160, font(11)).slice(0, 2).forEach((l, i) => text(g, l, 430, 328 + i * 14, { size: 11, color: '#9ad8ff' }));
    }
    wrapText(g, HEROES[m.id].bio, 500, font(14, false, SERIF)).forEach((l, i) => text(g, l, 70, 400 + i * 20, { size: 14, fam: SERIF, color: '#d8dcf0' }));
  });
  const r = await UI.push({ update() { if (Input.p('ok') && boardOpen(m)) { Audio_.sfx('ok'); UI.close(this, 'board'); } else if (Input.p('ok') || Input.p('cancel')) { Audio_.sfx('cancel'); UI.close(this); } }, draw() { } });
  closePanel(p);
  if (r === 'board') await lanternBoard(mi);
}
// ---------- shop ----------
async function openShop(listId, keeper) {
  const stock = SHOPS[listId];
  const goldPanel = openPanel(g => { drawWindow(g, 472, 330, 152, 44); text(g, `${G.gold} G`, 610, 342, { size: 17, align: 'right', color: '#ffe9a8' }); });
  await say(keeper, tl('Welcome! What can I do for you?'));
  let mode = 0;
  while (true) {
    const k = await listMenu({ x: 16, y: 16, w: 150, rows: 3, items: [{ label: tl('Buy') }, { label: tl('Sell') }, { label: tl('Leave') }], index: mode });
    if (k < 0 || k === 2) break;
    mode = k;
    if (k === 0) {
      let idx = 0;
      while (true) {
        const det = openPanel(g => drawShopDetail(g, stock[sel.v]));
        const sel = { v: idx };
        const r = await listMenu({
          x: 16, y: 70, w: 300, rows: 9, title: tl('Buy'), index: idx, onChange: i => sel.v = i,
          items: stock.map(id => ({ label: ITEMS[id].name, right: shopPrice(listId, id) + ' G', disabled: G.gold < shopPrice(listId, id) })),
          help: i => ITEMS[stock[i]].desc
        });
        closePanel(det);
        if (r < 0) break;
        idx = r;
        const it = ITEMS[stock[r]];
        G.gold -= shopPrice(listId, stock[r]); addItem(stock[r]); Audio_.sfx('item');
        toast(tl`Bought ${it.name}`);
      }
    } else {
      let idx = 0;
      while (true) {
        const keys = Object.keys(G.inv);
        if (!keys.length) { await say(keeper, tl("You've nothing to sell, friend.")); break; }
        const r = await listMenu({
          x: 16, y: 70, w: 340, rows: 9, title: tl('Sell'), index: Math.min(idx, keys.length - 1),
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
  await say(keeper, tl('Come again! Safe travels.'));
}
function drawShopDetail(g, id) {
  if (!id) return;
  const it = ITEMS[id];
  drawWindow(g, 330, 70, 294, 250);
  text(g, it.name, 346, 82, { size: 17, bold: true, color: '#ffe9a8' });
  text(g, tl`Owned: ${G.inv[id] || 0}`, 610, 84, { size: 13, align: 'right', color: '#b8c4ee' });
  if (it.kind === 'use') {
    wrapText(g, it.desc, 260, font(14)).forEach((l, i) => text(g, l, 346, 112 + i * 20, { size: 14 }));
    return;
  }
  let y = 112;
  for (const m of G.party) {
    const can = canEquip(it, m.id);
    drawChar(g, HEROES[m.id].look, 362, y + 40, 'down', 0, 1);
    if (!can) { text(g, tl`${memberName(m)}: can't equip`, 390, y + 14, { size: 14, color: '#8792b8' }); }
    else {
      const key = it.kind;
      const tmp = { ...m, [key]: id };
      const s = it.kind === 'weapon' ? (it.mag && !it.atk ? 'mag' : 'str') : it.kind === 'acc' ? (it.atk || it.all ? 'str' : it.def ? 'def' : it.mag ? 'mag' : it.spd ? 'spd' : 'def') : 'def';
      const cur = stat(m, s), nv = stat(tmp, s);
      const lab = { str: tl('ATK'), def: tl('DEF'), mag: tl('MAG'), spd: tl('SPD') }[s];
      const eq = m[key] === id;
      text(g, `${memberName(m)}: ${lab} ${cur} → `, 390, y + 14, { size: 14 });
      g.font = font(14);
      const w = g.measureText(`${memberName(m)}: ${lab} ${cur} → `).width;
      text(g, eq ? 'E' : String(nv), 390 + w, y + 14, { size: 14, bold: true, color: eq ? '#ffe9a8' : nv > cur ? '#7aff9a' : nv < cur ? '#ff8a8a' : '#fff' });
      if (it.mag && s === 'str') text(g, tl`MAG +${it.mag}`, 390, y + 32, { size: 12, color: '#b8c4ee' });
    }
    y += 50;
  }
}
// ---------- inn ----------
async function innStay(townId, price, keeper = tl('Innkeeper')) {
  const fish = hasAnyFish(), opts = fish ? [tl('Stay'), tl('Cook a meal'), tl('Stay until night'), tl('No thanks')] : [tl('Stay'), tl('Stay until night'), tl('No thanks')];
  const c = await choose(keeper, tl`Welcome, travelers! A warm bed is ${price} gold for the party. Will you rest?${fish ? ' Or I can cook up that catch of yours.' : ''}`, opts, opts.length - 1);
  if (opts[c] === tl('Cook a meal')) { if (await cookMenu(keeper)) await say(keeper, tl('Eat up! That\'ll keep you going for a few fights.')); return; }
  const tillNight = opts[c] === tl('Stay until night');
  if (c !== 0 && !tillNight) { await say(keeper, tl('Another time, then.')); return; }
  const hollow = isHollow();   // Hollow mode: the hours pass, but nobody heals
  if (hollow) await say(keeper, tl('In the Hollow? Then a chair by the fire is all I can give you, and it\'s free. The hours will pass. Your wounds won\'t.'));
  else if (G.gold < price) { await say(keeper, tl("Ah... you're a bit short on coin, I'm afraid.")); return; }
  else G.gold -= price;
  await fadeTo(1, 500);
  Audio_.stopMusic();
  Audio_.sfx('inn');
  if (!hollow) healAll();
  G.lastInn = { town: townId };
  sleepUntil(tillNight ? 21 : 7);
  await wait(1600);
  if (Field.map && Field.map.kind === 'town') refreshEntities();
  Field.playMusic();
  Audio_.play(Audio_.curName, true);
  await fadeTo(0, 500);
  await innDream();
  await say(keeper, tillNight ? tl('Good evening! The night folk are out, if that\'s your business.') : hollow ? tl('Morning. You look about as tired as you did last night.') : tl('Good morning! You look well rested.'));
  await promptSave();
}

// ---------- quest log ----------
async function questMenu() {
  const qs = questList();
  const sel = { v: 0 };
  const p = openPanel(g => {
    const obj = mainObjective();
    drawWindow(g, 16, 16, 608, 56);
    text(g, tl('Main quest'), 32, 24, { size: 12, color: '#ffe9a8' });
    text(g, obj.text, 32, 42, { size: 15 });
    const q = qs[sel.v];
    drawWindow(g, 300, 84, 324, 300);
    if (!q) { text(g, tl('No side quests yet. Talk to people!'), 316, 100, { size: 14, color: '#b8c4ee' }); return; }
    text(g, q.title, 316, 98, { size: 17, bold: true, color: '#ffe9a8' });
    text(g, q.done ? tl('Complete') : tl('In progress'), 608, 100, { size: 12, align: 'right', color: q.done ? '#7aff9a' : '#9ad8ff' });
    text(g, tl('From: ') + q.giver, 316, 124, { size: 13, color: '#b8c4ee' });
    wrapText(g, q.desc, 290, font(14)).forEach((l, i) => text(g, l, 316, 152 + i * 21, { size: 14 }));
    if (q.reward) text(g, tl('Reward: ') + q.reward, 316, 356, { size: 13, color: '#c8d0f0' });
  });
  if (!qs.length) { await UI.push({ update() { if (Input.p('ok') || Input.p('cancel')) UI.close(this); }, draw() { } }); closePanel(p); return; }
  await listMenu({ x: 16, y: 84, w: 276, rows: 10, title: tl`Side quests (${qs.filter(q => q.done).length}/${qs.length})`, items: qs.map(q => ({ label: (q.done ? '✓ ' : '• ') + q.title, color: q.done ? '#9adf9a' : '#fff' })), onChange: i => sel.v = i });
  closePanel(p);
}
// ---------- bestiary ----------
async function bestiaryMenu() {
  const ids = Object.keys(MONSTERS);
  const seen = ids.filter(id => G.seen[id]).length;
  const sel = { v: 0 };
  const t0 = performance.now();
  const p = openPanel(g => {
    const id = ids[sel.v], d = MONSTERS[id];
    drawWindow(g, 286, 16, 338, 448);
    if (!G.seen[id]) { text(g, '??????', 455, 220, { size: 22, bold: true, align: 'center', color: '#8792b8' }); text(g, tl('Not yet encountered.'), 455, 252, { size: 14, align: 'center', color: '#8792b8' }); return; }
    // preview
    g.save(); g.beginPath(); g.rect(296, 50, 318, 200); g.clip();
    const bg = g.createLinearGradient(0, 50, 0, 250); bg.addColorStop(0, '#1a2450'); bg.addColorStop(1, '#0a1028'); g.fillStyle = bg; g.fillRect(296, 50, 318, 200);
    const sc = Math.min(1.6, 170 / monsterHeight(d), 280 / monsterWidth(d));
    drawMonster(g, d, 455, 238, { t: (performance.now() - t0) / 1000, scale: sc / (d.size || 1) * (d.size || 1) });
    g.restore();
    text(g, d.name, 302, 24, { size: 17, bold: true, color: '#ffe9a8' });
    text(g, tl`Defeated: ${G.killed[id] || 0}`, 610, 26, { size: 12, align: 'right', color: '#b8c4ee' });
    const rows = [[tl('HP'), d.hp], [tl('Attack'), d.atk], [tl('Defense'), d.def], [tl('Magic'), d.mag], [tl('Speed'), d.spd], [tl('EXP'), d.xp], [tl('Gold'), d.gold]];
    rows.forEach(([a, b], i) => { const x = 304 + (i % 2) * 160, y = 262 + Math.floor(i / 2) * 22; text(g, a, x, y, { size: 13, color: '#b8c4ee' }); text(g, String(b), x + 140, y, { size: 13, align: 'right' }); });
    text(g, tl('Weak: ') + (d.weak ? d.weak.join(', ') : '—'), 304, 344, { size: 13, color: '#ffd27a' });
    text(g, tl('Resist: ') + (d.resist ? d.resist.join(', ') : '—'), 464, 344, { size: 13, color: '#b8b8c8' });
    if (d.absorb) text(g, tl('Absorbs: ') + d.absorb.join(', '), 304, 362, { size: 13, color: '#9ad8ff' });
    const ai = { weakest: tl('Hunts the wounded'), magehunter: tl('Hunts casters'), healer: tl('Heals its allies') }[d.ai];
    if (ai) text(g, ai, d.absorb ? 464 : 304, 362, { size: 13, color: '#ffb0d0' });
    text(g, tl('Steal: ') + (d.steal ? ITEMS[d.steal].name : '—') + (d.rare ? '   ★ ' + ITEMS[d.rare[0]].name : ''), 304, 380, { size: 13 });
    text(g, tl('Drops: ') + ([d.drop && ITEMS[d.drop[0]].name, d.mat && ITEMS[d.mat[0]].name].filter(Boolean).join(', ') || '—'), 304, 398, { size: 13 });
    const sk = [...new Set([...(d.acts || []), ...(d.phases || []).flatMap(ph => ph.acts)].filter(a => a.a !== 'attack').map(a => SPELLS[a.a].name))];
    wrapText(g, (d.phases ? tl('Skills (changes when hurt): ') : tl('Skills: ')) + (sk.length ? sk.join(', ') : '—'), 310, font(13)).slice(0, 3).forEach((l, i) => text(g, l, 304, 416 + i * 16, { size: 13, color: '#c8d0f0' }));
  });
  await listMenu({ x: 16, y: 16, w: 262, rows: 15, rowH: 26, title: tl`Bestiary  ${seen}/${ids.length}`, items: ids.map((id, i) => ({ label: G.seen[id] ? MONSTERS[id].name : '??????', right: G.seen[id] ? (G.killed[id] || 0) : '', color: G.seen[id] ? (MONSTERS[id].boss ? '#ffb86a' : '#fff') : '#8792b8' })), onChange: i => sel.v = i, size: 14 });
  closePanel(p);
}
// ---------- world map ----------
const MAP_COL = { '~': '#2c6fc4', r: '#3a80d0', '.': '#6dbb4f', T: '#2f7a35', '^': '#8a7f73', n: '#7cc65c', s: '#e9d49a', '=': '#c9a46a', b: '#a8763f', x: '#6a4522', '*': '#e6eef8', P: '#3a7a5a', M: '#b8c4d4', q: '#3b2a4c', d: '#24182f' };
async function worldMapView() {
  const m = getMap('world');
  const sc = Math.min(600 / m.w, 384 / m.h), ow = m.w * sc, oh = m.h * sc, ox = (W - ow) / 2, oy = (H - oh) / 2 + 12;
  // where is the party? (on the sea floor, the marker shows the spot above you)
  const { x: px, y: py } = worldPos();
  const obj = mainObjective();
  const canDeep = !!G.flags.seen_deep;
  let deep = canDeep && onSeaFloor();
  await UI.push({
    update() {
      if (canDeep && Input.p('run')) { deep = !deep; Audio_.sfx('cursor'); }
      else if (Input.p('ok') || Input.p('cancel')) { Audio_.sfx('cancel'); UI.close(this); }
    },
    draw(g) {
      if (deep) { drawDeepMap(g, ox, oy, ow, oh, sc); return; }
      const t = performance.now() / 1000;
      g.fillStyle = 'rgba(4,6,20,.92)'; g.fillRect(0, 0, W, H);
      drawWindow(g, ox - 10, oy - 34, ow + 20, oh + 58);
      text(g, tl('World Map'), ox, oy - 26, { size: 15, bold: true, color: '#ffe9a8' });
      text(g, obj.text, ox + ow, oy - 25, { size: 12, align: 'right', color: '#c8d0f0' });
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const c = m.at(x, y);
        let col = MAP_COL[c] || '#6dbb4f';
        if (c === '^' && m.region[y][x] === 'C') col = '#4a3a5a';
        if (m.region[y][x] === 'H' && c !== '~') col = { '^': '#2e282c', d: '#3e363a', s: '#8a8078', '=': '#a09080' }[c] || '#5a5458';
        g.fillStyle = col; g.fillRect(ox + x * sc, oy + y * sc, sc + 0.5, sc + 0.5);
      }
      for (const k in WORLD_LOC) {
        const L = WORLD_LOC[k], x = ox + L.x * sc + sc / 2, y = oy + L.y * sc + sc / 2;
        const known = G.flags['visit_' + k] || (ISLE_LOCS.includes(k) && G.flags.isle);
        if (k === 'F' && !known && !G.flags.airship) continue;
        if (ISLE_LOCS.includes(k) && !G.flags.isle) continue;
        circle(g, x, y, 4.5, L.town ? '#fff4c8' : '#e88a6a', OUT, 1.5);
        if (known) { g.font = font(11, true); const tw = g.measureText(L.name).width; const right = x + 7 + tw > ox + ow - 4; text(g, L.name, right ? x - 7 : x + 7, y - 7, { size: 11, bold: true, align: right ? 'right' : 'left' }); }
      }
      if (G.flags.q_road && !G.flags.road_done) ROAD_LAMPS.forEach(([lx, ly], i) => { if (m.at(lx, ly) === '~') return; const x = ox + lx * sc + 3, y = oy + ly * sc + 3; circle(g, x, y, 2.6, G.flags['lamp_' + i] ? '#ffd23a' : '#5a5a6a', '#fff', 1); });
      if (m.whirl && G.flags.bounty && !G.flags.leviathan) { const x = ox + m.whirl.x * sc + 3, y = oy + m.whirl.y * sc + 3; circle(g, x, y, 5 + Math.sin(t * 4), null, '#fff', 1.5); text(g, tl('Leviathan'), x + 8, y - 6, { size: 11, color: '#bfe8ff' }); }
      if (obj.loc && WORLD_LOC[obj.loc]) { const L = WORLD_LOC[obj.loc]; const x = ox + L.x * sc + 3.5, y = oy + L.y * sc - 8 + Math.sin(t * 4) * 2; poly(g, [x - 5, y - 6, x + 5, y - 6, x, y + 2], '#ffd23a', OUT, 1); }
      if (G.airship && G.flags.airship) { const x = ox + G.airship.x * sc + 3, y = oy + G.airship.y * sc + 3; ellipse(g, x, y - 2, 5, 3, '#c8443a', '#fff', 1); }
      if (G.ship && G.flags.ship && !G.onShip) { const x = ox + G.ship.x * sc + 3, y = oy + G.ship.y * sc + 3; poly(g, [x - 4, y + 2, x + 4, y + 2, x + 2, y + 4, x - 2, y + 4], '#7a4a22'); poly(g, [x, y - 5, x + 4, y + 1, x, y + 1], '#fff'); }
      if (G.flags.q_drowned) for (const d of DIVE_SPOTS) { const x = ox + d.x * sc + 3, y = oy + d.y * sc + 3; circle(g, x, y, 4 + Math.sin(t * 3) * 0.8, '#06182a', '#5af0d0', 1.5); }
      for (const k in m.digs || {}) if (m.digs[k] && hasItem('tmap' + k) && !G.flags['dug_' + k]) { const x = ox + m.digs[k].x * sc + 3, y = oy + m.digs[k].y * sc + 3; line(g, x - 3.5, y - 3.5, x + 3.5, y + 3.5, '#ff3a6a', 2.5); line(g, x - 3.5, y + 3.5, x + 3.5, y - 3.5, '#ff3a6a', 2.5); }
      if (Math.sin(t * 8) > -0.3) { circle(g, ox + px * sc + 3.5, oy + py * sc + 3.5, 4, '#ff3a3a', '#fff', 1.5); }
      text(g, tl`Red: you   ▼ objective${G.flags.q_drowned ? '   ◎ black water' : ''}${mapsFound() ? '   ✕ dig' : ''}${canDeep ? '   Shift: sea floor' : ''}   Enter/Esc to close`, W / 2, oy + oh + 5, { size: 11, align: 'center', color: '#b8c4ee' });
    }
  });
}

// ---------- formation ----------
async function formationMenu() {
  let first = null;
  const panel = openPanel(g => drawPartyPanel(g, sel.v));
  const sel = { v: 0 };
  while (true) {
    const items = G.party.map((m, i) => ({ label: memberName(m) + (i === first ? '  ✦' : ''), right: i < 4 ? tl('Active') : tl('Reserve'), rcolor: i < 4 ? '#9adf9a' : '#ffb86a' }));
    const r = await listMenu({ x: 470, y: 16, w: 154, rows: 5, title: first === null ? tl('Swap who?') : tl('With whom?'), items, index: sel.v, onChange: i => sel.v = i, help: () => tl('The first four fight. Reserve members earn half EXP.'), helpY: H - 52 });
    if (r < 0) { if (first !== null) { first = null; continue; } break; }
    if (first === null) { first = r; continue; }
    if (first !== r) { const t = G.party[first]; G.party[first] = G.party[r]; G.party[r] = t; Audio_.sfx('item'); }
    first = null;
  }
  closePanel(panel);
}
