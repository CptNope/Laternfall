// Balance simulator — runs the game's REAL Battle code with animations skipped and an AI
// choosing the party's commands. Injected into the page by tools/balance_sim.py.
// window.SIM.fight({ party, gear, items, bosses, runs }) -> summary stats
(function () {
  // --- make the engine instant and silent ---
  window.wait = () => Promise.resolve();
  window.fadeTo = v => { Fade.v = v; Fade.target = v; return Promise.resolve(); };
  window.narrate = () => Promise.resolve(0);
  Audio_.sfx = () => { }; Audio_.play = () => { }; Audio_.stopMusic = () => { };

  const has = (m, s) => spellsOf(m).includes(s) && m.mp >= SPELLS[s].mp && !m.status.silence;
  const hpPct = m => m.hp / maxHp(m);

  // A sensible, not perfect, player: heal when hurt, revive the fallen, keep Barrier up on bosses,
  // otherwise use the strongest attack it can afford.
  function decide(b, i) {
    const P = BP(), m = P[i], live = b.liveEnemies(), boss = live.find(e => e.def.boss) || live[0];
    const dead = P.map((p, k) => k).filter(k => !alive(P[k]));
    const hurt = P.map((p, k) => k).filter(k => alive(P[k]) && hpPct(P[k]) < 0.5);
    const lowest = P.map((p, k) => k).filter(k => alive(P[k])).sort((a, c) => hpPct(P[a]) - hpPct(P[c]))[0];
    const item = (id, target) => G.inv[id] > 0 ? { type: 'item', item: id, target } : null;
    const spell = (s, target) => ({ type: 'spell', spell: s, target });
    // healer duties
    if (m.id === 'oswin') {
      if (dead.length >= 2 && has(m, 'sanctuary')) return spell('sanctuary', 'all');
      if (dead.length && has(m, 'raise')) return spell('raise', dead[0]);
      if (hurt.length >= 2) { if (has(m, 'sanctuary') && hurt.length >= 3) return spell('sanctuary', 'all'); if (has(m, 'curaga')) return spell('curaga', 'all'); if (has(m, 'cura')) return spell('cura', 'all'); }
      if (hurt.length === 1 && has(m, 'cura')) return spell(hpPct(P[hurt[0]]) < 0.3 && has(m, 'curaga') ? 'curaga' : 'cura', 'all');
      if (b.opts.boss && b.buffs.barrier <= 1 && has(m, 'barrier')) return spell('barrier', 'all');
      if (m.mp < 40 && G.inv.hiether > 0) return item('hiether', i);
    }
    // cure a silenced healer, or anyone asleep, with a Remedy
    const healer = P.findIndex(p => p.id === 'oswin' && alive(p));
    if (healer >= 0 && healer !== i && P[healer].status.silence && G.inv.remedy > 0) return item('remedy', healer);
    if (m.id === 'oswin' && m.status.silence && G.inv.remedy > 0) return item('remedy', i);
    // anyone: emergency items
    if (dead.length && !P.some(p => p.id === 'oswin' && alive(p))) { const r = item('plume', dead[0]); if (r) return r; }
    if (dead.length >= 2 && G.inv.megalixir > 0 && m.id !== 'oswin') return item('megalixir', 'all');
    if (hpPct(P[lowest]) < 0.25 && !P.some(p => p.id === 'oswin' && alive(p) && p.mp >= 9)) { const r = item('xpotion', lowest); if (r) return r; }
    if (limitReady(m)) return { type: 'limit', target: LIMITS[m.id].target === 'enemy' ? boss : 'all' };
    // buffs
    if (m.id === 'arin' && b.opts.boss && b.buffs.rally <= 0 && has(m, 'rally')) return spell('rally', 'all');
    // damage
    const order = {
      arin: ['dawnbreak', 'valor', 'sunstrike'],
      lyra: live.length > 1 ? ['supernova', 'starfall', 'flare'] : ['supernova', 'flare', 'starfall'],
      kestrel: ['thousand', 'shadowstep', 'twin'],
      selene: boss && boss.def.boss && boss.hp > 6000 && boss.hp > boss.maxhp * 0.45 ? ['gravity', 'eventide', 'requiem'] : ['eventide', 'requiem', 'nightfall'],
      oswin: ['holy']
    }[m.id] || [];
    for (const s of order) if (has(m, s)) return spell(s, SPELLS[s].target === 'enemies' ? 'all' : boss);
    if (m.mp < 30 && G.inv.hiether > 0 && m.id !== 'arin' && m.id !== 'kestrel') return item('hiether', i);
    return { type: 'attack', target: boss };
  }

  function setup(cfg) {
    G.flags = { ...(cfg.flags || {}) };
    G.party = cfg.party.map(([id, lv]) => { const mm = makeMember(id, lv); Object.assign(mm, cfg.gear[id] || {}); mm.hp = maxHp(mm); mm.mp = maxMp(mm); return mm; });
    G.inv = { ...cfg.items };
  }
  async function battle(ids, opts, stats) {
    const b = new Battle(ids, { boss: true, noVictory: true, bg: 'abyss', ...opts });
    const dm = b.damageMember.bind(b);
    b.damageMember = (i, d) => { const was = alive(BP()[i]); dm(i, d); if (was && !alive(BP()[i])) stats.kos++; };
    b.commandPhase = async function () {
      stats.rounds++;
      if (stats.rounds > 80) { BP().forEach(p => p.hp = 0); return []; } // stalemate guard
      return BP().map((p, i) => alive(p) && !p.status.sleep ? decide(this, i) : null);
    };
    const r = await b.run();
    stats.deaths += 0;
    return r;
  }
  window.SIM = {
    async fight(cfg) {
      const out = { wins: 0, runs: cfg.runs, rounds: [], minHp: [], itemsUsed: [] };
      for (let n = 0; n < cfg.runs; n++) {
        setup(cfg);
        const start = JSON.stringify(G.inv);
        const stats = { rounds: 0, deaths: 0, kos: 0 };
        let ok = true;
        for (let k = 0; k < cfg.bosses.length; k++) {
          const r = await battle(cfg.bosses[k], cfg.opts || {}, stats);
          if (r !== 'win') { ok = false; break; }
          if (cfg.healBetween) healAll();
        }
        if (ok) out.wins++;
        out.rounds.push(stats.rounds); (out.kos = out.kos || []).push(stats.kos);
        const used = {}; const s0 = JSON.parse(start); for (const k in s0) if ((G.inv[k] || 0) < s0[k]) used[k] = s0[k] - (G.inv[k] || 0);
        out.itemsUsed.push(used);
      }
      const r = out.rounds.slice().sort((a, b) => a - b);
      const winR = [];
      return { kos: (out.kos.reduce((a, b) => a + b, 0) / cfg.runs).toFixed(1), winRate: out.wins / cfg.runs, medianRounds: r[r.length >> 1], minRounds: r[0], maxRounds: r[r.length - 1],
        avgItems: Object.entries(out.itemsUsed.reduce((a, u) => { for (const k in u) a[k] = (a[k] || 0) + u[k]; return a; }, {})).map(([k, v]) => `${k}:${(v / cfg.runs).toFixed(1)}`).join(' ') };
    }
  };
})();
