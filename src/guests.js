// =====================================================================
//  GUESTS — 2.4: friends who fight beside you for one quest
// =====================================================================
// Brann sails with you while the Leviathan bounty is open (at sea only: he's the captain). Wren
// comes along from the moment the Observatory opens until the Astral Wyrm is quiet, and Warden
// Ione from the moment she gives you the lamp until the crown is broken: those two walk behind
// you on every map, fight in every battle, and are missing from their towns meanwhile. A guest isn't a party member: they
// take no menu, gear or EXP, enemies can't target them (they keep to the back), and they act on
// their own once a round. Their strength follows the party's, so they matter at any level.
// Whether a guest is with you is worked out from story flags, so old saves mid-quest get them too.
const GUESTS = {
  brann: {
    name: tl('Brann'), look: () => LOOKS.sailor,
    // at sea while the bounty is open (and in the Leviathan fight)
    here: f => f.bounty && !f.leviathan && G.onShip,
    moves: [
      { w: 5, name: tl('Harpoon'), kind: 'phys', mult: 1.25, fx: 'hit' },
      { w: 2, name: tl('Broadside'), kind: 'phys', all: true, mult: 0.6, fx: 'hit' },   // cannon, not water: the Leviathan drinks water
      { w: 2, name: tl('Ship\'s Grog'), kind: 'heal', share: 0.2, fx: 'heal' }
    ]
  },
  wren: {
    name: tl('Wren'), look: () => ({ skin: '#e8c8a8', hair: '#c8c8d8', style: 'long', body: '#2a3a6a', accent: '#e8d070', robe: true, beard: true, weapon: 'staff' }),
    // from the Observatory's opening until the Astral Wyrm is quiet
    here: f => f.obsOpen && !f.boss_observatory,
    moves: [
      { w: 4, name: tl('Starlight'), kind: 'mag', power: 80, elem: 'holy', fx: 'holy' },
      { w: 2, name: tl('Falling Stars'), kind: 'mag', all: true, power: 50, elem: 'holy', fx: 'flare' },
      { w: 2, name: tl('Slow Orbit'), kind: 'slow', turns: 3, fx: 'sleep', once: true }
    ]
  },
  ione: {
    name: tl('Warden Ione'), look: () => ({ skin: '#e8c8a8', hair: '#d8d8e0', style: 'bun', body: '#5a3a3a', accent: '#ff8a4a', robe: true, weapon: 'mace' }),
    // from the lamp until the crown is broken
    here: f => f.q_crown && !f.boss_abyss,
    moves: [
      { w: 4, name: tl('Ember of Orun'), kind: 'mag', power: 80, elem: 'fire', fx: 'fire' },
      { w: 2, name: tl('Ashen Hymn'), kind: 'heal', all: true, share: 0.1, fx: 'heal' },
      { w: 2, name: tl('Ward'), kind: 'barrier', turns: 3, fx: 'buff', once: true }
    ]
  }
};
const GUEST_SEAT = { x: 606, y: 210 };
const GUEST_POWER = 0.5;   // a guest hits like half of the party's average member (tuned with the balance sim)
// which guest (if any) fights in a battle started now; opts.guest forces one, opts.noGuest none
function guestFor(opts = {}) {
  if (opts.noGuest || !G.flags) return null;
  if (opts.guest) return GUESTS[opts.guest] ? opts.guest : null;
  for (const id in GUESTS) if (GUESTS[id].here(G.flags)) return id;
  return null;
}
// the guest's stats, from the live party's averages
function guestStats(b) {
  const P = b.liveParty().length ? b.liveParty() : BP(), avg = s => P.reduce((t, m) => t + stat(m, s), 0) / P.length;
  return { str: avg('str') * GUEST_POWER, mag: avg('mag') * GUEST_POWER, spd: avg('spd') };
}
function pickGuestMove(b, G_) {
  const hurt = b.liveParty().some(m => m.hp < maxHp(m) * 0.5);
  // Ward and Slow Orbit once a fight: a guest helps, but the fight stays yours
  const used = b.guestUsed || (b.guestUsed = {});
  const ok = G_.moves.filter(mv => (mv.kind !== 'heal' || hurt) && (!mv.once || !used[mv.name]) && (mv.kind !== 'slow' || b.liveEnemies().some(e => !e.status.slow)));
  let r = Math.random() * ok.reduce((t, mv) => t + mv.w, 0);
  for (const mv of ok) if ((r -= mv.w) < 0) return mv;
  return ok[0];
}
// one action, once a round, in speed order with everyone else
async function guestAct(b) {
  const id = b.guest, G_ = GUESTS[id], s = guestStats(b), mv = pickGuestMove(b, G_);
  const foes = b.liveEnemies(); if (!foes.length) return;
  b.guestPose = { t: b.t };
  if (mv.once) (b.guestUsed || (b.guestUsed = {}))[mv.name] = true;
  b.msg = tl`${G_.name}: ${mv.name}`; await wait(450);
  if (mv.kind === 'phys' || mv.kind === 'mag') {
    const ts = mv.all ? foes : [foes.reduce((a, e) => e.hp < a.hp ? e : a)];   // single hits go for the weakest
    await b.playFx(mv.fx, ts.map(e => b.enemyCenter(e)));
    for (const e of ts) {
      if (!e.alive) continue;
      const d = mv.kind === 'phys' ? b.physDamage(s.str, e.def.def, mv.mult)
        : Math.max(1, Math.round((mv.power + s.mag) * rnd(0.95, 1.05) * b.elemMult(e.def, mv.elem) * (mv.all ? 0.7 : 1) - e.def.mag * 0.4));
      b.damageEnemy(e, d, '#fff', false, mv.elem || null);
    }
  } else if (mv.kind === 'heal') {
    const P = b.liveParty(), ts = mv.all ? P : [P.reduce((a, m) => m.hp / maxHp(m) < a.hp / maxHp(a) ? m : a)];
    await b.playFx('heal', ts.map(m => b.memberCenter(BP().indexOf(m))));
    for (const m of ts) { const h = Math.min(maxHp(m) - m.hp, Math.round(maxHp(m) * mv.share)); m.hp += h; const c = b.memberCenter(BP().indexOf(m)); b.num(c.x, c.y, h, '#7aff9a'); }
  } else if (mv.kind === 'barrier') {
    await b.playFx('buff', BP().map((m, i) => b.memberCenter(i)));
    b.buffs.barrier = Math.max(b.buffs.barrier || 0, mv.turns);
  } else if (mv.kind === 'slow') {
    const e = foes.find(e => !e.status.slow) || foes[0];
    await b.playFx('sleep', [b.enemyCenter(e)]);
    e.status.slow = mv.turns; const c = b.enemyCenter(e); b.num(c.x, c.y, tl('Slow'), '#c8b8ff');
  }
  b.guestActs = (b.guestActs || 0) + 1;
  await wait(350); b.msg = null;
}
function drawBattleGuest(g, b) {
  if (!b.guest) return;
  const G_ = GUESTS[b.guest], p = b.guestPose, k = p ? (b.t - p.t) / 0.6 : 1;
  const x = GUEST_SEAT.x + (1 - b.intro) * 200 - (k < 1 ? Math.sin(k * Math.PI) * 14 : 0);
  drawChar(g, G_.look(), x, GUEST_SEAT.y, 'left', 0, 1.42, k < 1 ? 'cast' : null, b.t);
  text(g, G_.name, x, GUEST_SEAT.y + 6, { size: 11, bold: true, align: 'center', color: '#ffe9a8' });
}
// on the field the guest walks right behind the party (and ahead of Mittens)
function guestFollower(map) {
  for (const id in GUESTS) {
    if (id === 'brann' || !GUESTS[id].here(G.flags)) continue;   // Brann is at the wheel of the ship
    const G_ = GUESTS[id];
    return { kind: 'npc', x: G.x, y: G.y, dir: 'down', look: G_.look(), follow: true, guest: id, name: G_.name,
      talk: async () => say(G_.name, GUEST_LINES[id]()) };
  }
  return null;
}
const GUEST_LINES = {
  wren: () => G.mapId.startsWith('observatory') ? tl('Forty years I\'ve looked at this place through a telescope. Don\'t mind me, I\'ll just be over here weeping a little.') : tl('The Observatory is on the island west of Frostmere. I\'ve been waiting forty years; I can wait while you shop.'),
  ione: () => G.mapId.startsWith('abyss') ? tl('Keep the lamp high. The mist remembers every light it has eaten.') : tl('The Abyss lies east, inside the crater. Four floors down, to where the crown fell.')
};
// joining and leaving: a toast so the player knows who is with them
function guestJoins(id) { toast(tl`${GUESTS[id].name} joins you for this quest`); }
function guestLeaves(id) { toast(tl`${GUESTS[id].name} has left the party`); }
