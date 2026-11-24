'use strict';
// ============================================================
//  BATTLE — classic turn-based, side view
// ============================================================
const BATTLE_GROUND = 300;
const BG_SHIFT = 84; // raise the horizon so everyone stands on the ground
let BATTLE_PARTY = null;
function BP() { return BATTLE_PARTY || G.party; }
class Battle {
  constructor(ids, opts) {
    BATTLE_PARTY = G.party.slice(0, 4);
    this.opts = opts; this.bg = opts.bg || 'plains'; this.t = 0;
    this.fx = []; this.nums = []; this.msg = null; this.active = -1; this.flash = null; this.shake = 0;
    const counts = {};
    ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const seen = {};
    this.enemies = ids.map(id => {
      const d = ngScale(MONSTERS[id]);
      seen[id] = (seen[id] || 0) + 1;
      const name = counts[id] > 1 ? `${d.name} ${String.fromCharCode(64 + seen[id])}` : d.name;
      return { id, def: d, name, bs: d.boss ? (d.fam === 'king' || d.fam === 'king2' || d.fam === 'crown' ? 1 : 1.15) : 1.35, hp: d.hp, maxhp: d.hp, alive: true, flash: 0, shake: 0, alpha: 1, dying: 0, status: {}, lunge: 0, stolen: false };
    });
    this.layout();
    ids.forEach(id => G.seen[id] = 1);
    this.pa = BP().map(() => ({ dx: 0, pose: null, flash: 0, shake: 0, defend: false, jump: 0 }));
    this.buffs = { rally: 0, barrier: 0 };
    this.reraised = new Set();
    this.intro = 0;
  }
  layout() {
    const es = this.enemies, n = es.length;
    const widths = es.map(e => monsterWidth(e.def) * e.bs + 10);
    const total = widths.reduce((a, b) => a + b, 0);
    const avail = 360;
    const k = Math.min(1, avail / total);
    let x = 215 - (total * k) / 2;
    es.forEach((e, i) => {
      e.x = x + widths[i] * k / 2;
      e.y = BATTLE_GROUND + (n > 1 ? (i % 2 ? 18 : -10) : 6) + (e.def.boss ? 10 : 0);
      x += widths[i] * k;
    });
  }
  partyXY(i) { const n = BP().length; const gap = n >= 4 ? 40 : 48; const y0 = n >= 4 ? 214 : 228; return { x: 466 + i * 26, y: y0 + i * gap }; }
  enemyCenter(e) { return { x: e.x, y: e.y - monsterHeight(e.def) * e.bs * 0.5 }; }
  memberCenter(i) { const p = this.partyXY(i); return { x: p.x + this.pa[i].dx, y: p.y - 28 }; }
  liveEnemies() { return this.enemies.filter(e => e.alive); }
  liveParty() { return BP().filter(alive); }
  tick(dt) {
    this.t += dt; this.intro = Math.min(1, this.intro + dt * 2.5);
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt); e.shake = Math.max(0, e.shake - dt);
      if (!e.alive && e.dying < 1) e.dying = Math.min(1, e.dying + dt * 1.6);
    }
    for (const p of this.pa) { p.flash = Math.max(0, p.flash - dt); p.shake = Math.max(0, p.shake - dt); }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; if (f.update) f.update(dt); if (f.t >= f.life) this.fx.splice(i, 1); }
    for (let i = this.nums.length - 1; i >= 0; i--) { this.nums[i].t += dt; if (this.nums[i].t > 1.3) this.nums.splice(i, 1); }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    this.shake = Math.max(0, this.shake - dt);
  }
  update() { }
  // ---------------- drawing ----------------
  draw(g) {
    g.save();
    if (this.shake > 0) g.translate(rnd(-4, 4) * this.shake * 3, rnd(-3, 3) * this.shake * 3);
    g.fillStyle = '#0a0812'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(0, -BG_SHIFT); drawBattleBG(g, this.bg, this.t); g.restore();
    // enemies
    const sorted = this.enemies.map((e, i) => ({ e, i })).sort((a, b) => a.e.y - b.e.y);
    for (const { e } of sorted) {
      if (!e.alive && e.dying >= 1) continue;
      const sx = e.x - (1 - this.intro) * 300 + (e.shake > 0 ? Math.sin(this.t * 60) * 4 : 0) + e.lunge;
      const blink = e.flash > 0 && Math.floor(e.flash * 30) % 2 === 0;
      g.save();
      if (!e.alive) { g.globalAlpha = 1 - e.dying; }
      if (blink) g.globalAlpha *= 0.25;
      drawMonster(g, e.def, sx, e.y, { t: this.t + e.x, scale: e.bs });
      if (!e.alive) { // dissolve tint
        g.globalCompositeOperation = 'source-atop';
      }
      g.restore();
      if (e.status.sleep && e.alive) { const c = this.enemyCenter(e); text(g, 'z', c.x + 20 + Math.sin(this.t * 3) * 4, c.y - 40 - (this.t * 14 % 14), { size: 18, bold: true, color: '#c8b8ff' }); }
      if (e.status.silence && e.alive) { const c = this.enemyCenter(e); text(g, '…', c.x - 24, c.y - 40, { size: 18, bold: true, color: '#c8b8ff' }); }
      if (e.status.poison && e.alive) { const c = this.enemyCenter(e); circle(g, c.x + 18 + Math.sin(this.t * 4) * 3, c.y - 20 - (this.t * 20 % 20), 3, 'rgba(140,255,120,.8)'); }
    }
    // party
    BP().forEach((m, i) => {
      const p = this.partyXY(i), a = this.pa[i];
      const L = HEROES[m.id].look;
      let pose = a.pose;
      if (!alive(m)) pose = 'ko';
      const weak = alive(m) && m.hp / maxHp(m) < 0.25 && !pose;
      const x = p.x + a.dx + (1 - this.intro) * 200 + (a.shake > 0 ? Math.sin(this.t * 60) * 3 : 0);
      const y = p.y - (a.jump ? Math.abs(Math.sin(this.t * 8 + i)) * 12 : 0) + (weak ? 4 : 0);
      g.save();
      if (a.flash > 0 && Math.floor(a.flash * 30) % 2 === 0) g.globalAlpha = 0.35;
      if (pose !== 'ko') {
        // weapon behind/in front
        const wk = L.weapon;
        let ang = -0.5;
        if (pose === 'attack') ang = -2.2 + clamp(a.swing || 0, 0, 1) * 2.6;
        if (pose === 'cast') ang = -0.1;
        if (pose === 'victory') ang = 0.5;
        drawWeapon(g, wk, x - 13, y - 20 - (pose === 'cast' ? 7 : 0), ang, 1.3);
      }
      drawChar(g, L, x, y, 'left', 0, 1.42, pose === 'victory' ? 'cast' : pose, this.t);
      g.restore();
      if (m.status.poison && alive(m)) circle(g, x - 10, y - 70 - (this.t * 20 % 16), 3, 'rgba(140,255,120,.85)');
      if (m.status.sleep && alive(m)) text(g, 'z', x - 20 + Math.sin(this.t * 3) * 3, y - 74 - (this.t * 14 % 14), { size: 17, bold: true, color: '#c8b8ff' });
      if (a.defend && alive(m)) { g.save(); g.globalAlpha = 0.35 + 0.1 * Math.sin(this.t * 6); ellipse(g, x - 6, y - 30, 26, 38, null, '#9ad8ff', 3); g.restore(); }
    });
    if (this.buffs.rally > 0 || this.buffs.barrier > 0) {
      let bx = 440;
      if (this.buffs.rally > 0) { text(g, `▲ATK ${this.buffs.rally}`, bx, 10, { size: 13, bold: true, color: '#ffb86a' }); bx += 76; }
      if (this.buffs.barrier > 0) text(g, `◆DEF ${this.buffs.barrier}`, bx, 10, { size: 13, bold: true, color: '#9ad8ff' });
    }
    // fx
    for (const f of this.fx) f.draw(g, f.t / f.life);
    // numbers
    for (const n of this.nums) {
      const b = n.t < 0.35 ? -Math.sin(n.t / 0.35 * Math.PI) * 18 : 0;
      g.save(); g.globalAlpha = clamp((1.3 - n.t) * 3, 0, 1);
      g.font = font(n.big ? 26 : 22, true);
      g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.85)';
      g.strokeText(n.text, n.x, n.y + b); g.fillStyle = n.col; g.fillText(n.text, n.x, n.y + b);
      g.restore();
    }
    g.restore();
    if (this.flash) { g.save(); g.globalAlpha = clamp(this.flash.t / this.flash.max, 0, 1) * this.flash.a; g.fillStyle = this.flash.col; g.fillRect(0, 0, W, H); g.restore(); }
    // UI: enemies list + party status
    drawWindow(g, 8, 344, 200, 128);
    const names = [];
    if (this.active < 0) for (const e of this.enemies) if (e.alive) names.push(e.name);
    names.slice(0, 5).forEach((n, i) => text(g, n, 22, 354 + i * 23, { size: 15 }));
    drawWindow(g, 214, 344, 418, 128);
    BP().forEach((m, i) => {
      const y = 352 + i * 29;
      const col = !alive(m) ? '#ff7a7a' : m.hp / maxHp(m) < 0.25 ? '#ffd27a' : '#fff';
      if (i === this.active) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(222, y - 2, 402, 27); }
      text(g, memberName(m), 230, y + 3, { size: 15, bold: true, color: col });
      const tags = [m.status.poison && ['PSN', '#8aff7a'], m.status.sleep && ['SLP', '#c8b8ff'], m.status.silence && ['SIL', '#ffb0d0'], m.status.regen && ['RGN', '#9ad8ff']].filter(Boolean);
      tags.slice(0, 2).forEach(([tg, c], k) => text(g, tg, 302 + k * 24, y + 5, { size: 10, bold: true, color: c }));
      text(g, `${m.hp}`, 420, y + 3, { size: 15, color: col, align: 'right' });
      text(g, `/${maxHp(m)}`, 470, y + 5, { size: 12, color: '#b8c4ee', align: 'right' });
      bar(g, 350, y + 20, 120, 3, m.hp / maxHp(m), '#6ae07a');
      text(g, 'MP', 484, y + 5, { size: 11, color: '#9ab0ff' });
      text(g, `${m.mp}`, 540, y + 3, { size: 15, align: 'right' });
      bar(g, 506, y + 20, 34, 3, m.mp / Math.max(1, maxMp(m)), '#6aa8ff');
      text(g, `Lv${m.level}`, 618, y + 5, { size: 12, color: '#ffe9a8', align: 'right' });
    });
    if (this.active >= 0 && this.prevCmds && !this.prevCmds.some(c => c && c.type === 'run')) text(g, 'Shift / R / X: repeat last turn', 12, 312, { size: 12, color: 'rgba(220,228,255,.85)' });
    if (this.msg) {
      g.font = font(17, true);
      const w = Math.max(220, g.measureText(this.msg).width + 50);
      drawWindow(g, (W - w) / 2, 12, w, 40);
      text(g, this.msg, W / 2, 22, { size: 17, bold: true, align: 'center' });
    }
  }
  // ---------------- fx helpers ----------------
  num(x, y, v, col = '#fff', big = false) { this.nums.push({ x, y, text: String(v), col, t: 0, big }); }
  screenFlash(col, a = 0.5, t = 0.25) { this.flash = { col, a, t, max: t }; }
  addFx(life, draw, update) { const f = { t: 0, life, draw, update }; this.fx.push(f); return f; }
  particles(x, y, n, opt) {
    const ps = [];
    for (let i = 0; i < n; i++) ps.push({ x: x + rnd(-opt.spread, opt.spread), y: y + rnd(-opt.spread * 0.6, opt.spread * 0.6), vx: rnd(-opt.vx, opt.vx), vy: rnd(opt.vy0, opt.vy1), s: rnd(opt.s0, opt.s1), c: pick(opt.cols), d: rnd(0, 0.3) });
    this.addFx(opt.life, (g, k) => {
      for (const p of ps) {
        const kk = clamp((k * opt.life - p.d) / (opt.life - p.d), 0, 1); if (kk <= 0) continue;
        g.save(); g.globalAlpha = 1 - kk;
        if (opt.shape === 'shard') { g.translate(p.x, p.y); g.rotate(p.vx); poly(g, [0, -p.s * 1.6, p.s * 0.6, 0, 0, p.s * 1.6, -p.s * 0.6, 0], p.c, 'rgba(255,255,255,.8)', 1); }
        else if (opt.shape === 'plus') { line(g, p.x - p.s, p.y, p.x + p.s, p.y, p.c, 2); line(g, p.x, p.y - p.s, p.x, p.y + p.s, p.c, 2); }
        else if (opt.shape === 'arrow') { poly(g, [p.x, p.y - p.s, p.x + p.s * 0.8, p.y, p.x - p.s * 0.8, p.y], p.c); }
        else if (opt.shape === 'ring') { circle(g, p.x, p.y, p.s * (0.5 + kk), null, p.c, 1.5); }
        else circle(g, p.x, p.y, p.s * (1 - kk * 0.5), p.c);
        g.restore();
      }
    }, dt => { for (const p of ps) { p.x += p.vx * dt; p.y += p.vy * dt; if (opt.grav) p.vy += opt.grav * dt; } });
  }
  async playFx(kind, targets) {
    // targets: array of {x,y}
    const self = this;
    switch (kind) {
      case 'slash': case 'hit': {
        Audio_.sfx(kind === 'slash' ? 'slash' : 'hit');
        for (const p of targets) {
          this.addFx(0.28, (g, k) => {
            g.save(); g.globalAlpha = 1 - k;
            for (let j = 0; j < 3; j++) {
              g.beginPath(); g.arc(p.x - 10 + j * 6, p.y - 10 + j * 6, 24, -2.4 + k * 1.2, -0.9 + k * 1.2);
              g.strokeStyle = j === 1 ? '#fff' : '#ffe9a8'; g.lineWidth = 3 - j * 0.6; g.stroke();
            }
            g.restore();
          });
          this.particles(p.x, p.y, 8, { spread: 6, vx: 160, vy0: -160, vy1: 80, s0: 1.5, s1: 3, cols: ['#fff', '#ffe08a'], life: 0.35 });
        }
        await wait(220); break;
      }
      case 'fire': {
        Audio_.sfx('fire');
        for (const p of targets) {
          this.particles(p.x, p.y + 20, 36, { spread: 22, vx: 30, vy0: -160, vy1: -60, s0: 3, s1: 8, cols: ['#ff6a1a', '#ffb02a', '#ffe08a', '#ff3a0a'], life: 0.75 });
          this.addFx(0.6, (g, k) => { g.save(); g.globalAlpha = 0.5 * (1 - k); circle(g, p.x, p.y, 30 + k * 20, '#ff8a2a'); g.restore(); });
        }
        this.screenFlash('#ff6a1a', 0.25, 0.3); await wait(650); break;
      }
      case 'ice': {
        Audio_.sfx('ice');
        for (const p of targets) {
          const shards = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * Math.PI * 2, r: 50 }));
          this.addFx(0.6, (g, k) => {
            for (const s of shards) {
              const r = s.r * (1 - Math.min(1, k * 1.6));
              g.save(); g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1; g.translate(p.x + Math.cos(s.a) * r, p.y + Math.sin(s.a) * r); g.rotate(s.a + Math.PI / 2);
              poly(g, [0, -12, 4, 0, 0, 12, -4, 0], '#bfefff', '#fff', 1); g.restore();
            }
            if (k > 0.55) { g.save(); g.globalAlpha = (1 - k) * 2; poly(g, [p.x, p.y - 34, p.x + 18, p.y, p.x, p.y + 30, p.x - 18, p.y], 'rgba(170,230,255,.6)', '#fff', 2); g.restore(); }
          });
        }
        this.screenFlash('#aee8ff', 0.25, 0.3); await wait(650); break;
      }
      case 'bolt': {
        Audio_.sfx('bolt');
        for (const p of targets) {
          const pts = []; let x = p.x + rnd(-20, 20);
          for (let y = -10; y < p.y; y += 22) { pts.push([x, y]); x += rnd(-16, 16); }
          pts.push([p.x, p.y]);
          this.addFx(0.4, (g, k) => {
            if (Math.floor(k * 12) % 2) return;
            g.save(); g.lineJoin = 'round';
            g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b));
            g.strokeStyle = 'rgba(255,240,120,.5)'; g.lineWidth = 10; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
            g.restore();
          });
          this.particles(p.x, p.y, 14, { spread: 6, vx: 200, vy0: -200, vy1: 100, s0: 1.5, s1: 3, cols: ['#fff6a0', '#fff'], life: 0.4 });
        }
        this.screenFlash('#fffbe0', 0.6, 0.2); this.shake = 0.15; await wait(500); break;
      }
      case 'holy': {
        Audio_.sfx('holy');
        for (const p of targets) {
          this.addFx(0.8, (g, k) => {
            g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.8;
            const gr = g.createLinearGradient(p.x - 24, 0, p.x + 24, 0); gr.addColorStop(0, 'rgba(255,250,200,0)'); gr.addColorStop(0.5, '#fffbe0'); gr.addColorStop(1, 'rgba(255,250,200,0)');
            g.fillStyle = gr; g.fillRect(p.x - 24, 0, 48, p.y + 30); g.restore();
          });
          this.particles(p.x, p.y, 20, { spread: 20, vx: 20, vy0: -120, vy1: -40, s0: 2, s1: 4, cols: ['#fff', '#ffe9a8'], life: 0.8, shape: 'plus' });
        }
        this.screenFlash('#ffffff', 0.4, 0.3); await wait(750); break;
      }
      case 'dark': {
        Audio_.sfx('dark');
        for (const p of targets) {
          const orbs = Array.from({ length: 8 }, (_, i) => i / 8 * Math.PI * 2);
          this.addFx(0.75, (g, k) => {
            for (const a of orbs) {
              const r = 60 * (1 - k), aa = a + k * 6;
              g.save(); g.globalAlpha = 0.85; circle(g, p.x + Math.cos(aa) * r, p.y + Math.sin(aa) * r * 0.7, 6 * (1 - k * 0.5), '#6a2aaa', '#c070ff', 1.5); g.restore();
            }
            if (k > 0.6) { g.save(); g.globalAlpha = (1 - k) * 2.5; circle(g, p.x, p.y, 34 * (k - 0.4), 'rgba(40,0,70,.7)', '#c070ff', 2); g.restore(); }
          });
        }
        this.screenFlash('#20003a', 0.4, 0.4); await wait(700); break;
      }
      case 'water': {
        Audio_.sfx('water');
        this.addFx(0.9, (g, k) => {
          const x = lerp(W + 60, 380, k);
          g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.85;
          g.beginPath(); g.moveTo(x - 30, H - 140);
          for (let y = H - 140; y > 100; y -= 20) g.lineTo(x + Math.sin(y * 0.05 + k * 10) * 18, y);
          g.lineTo(W, 100); g.lineTo(W, H - 140); g.closePath();
          g.fillStyle = 'rgba(60,160,230,.7)'; g.fill(); g.strokeStyle = '#d8f4ff'; g.lineWidth = 3; g.stroke();
          g.restore();
        });
        for (const p of targets) this.particles(p.x, p.y, 10, { spread: 16, vx: 120, vy0: -180, vy1: -40, s0: 2, s1: 4, cols: ['#bfefff', '#fff', '#4aa8e8'], life: 0.7, grav: 400 });
        await wait(800); break;
      }
      case 'heal': {
        Audio_.sfx('heal');
        for (const p of targets) {
          this.particles(p.x, p.y + 20, 18, { spread: 18, vx: 10, vy0: -90, vy1: -30, s0: 2, s1: 4, cols: ['#9affb0', '#fff', '#d0ffd8'], life: 0.8, shape: 'plus' });
          this.addFx(0.6, (g, k) => { g.save(); g.globalAlpha = 0.5 * (1 - k); circle(g, p.x, p.y, 20 + k * 20, null, '#9affb0', 3); g.restore(); });
        }
        await wait(600); break;
      }
      case 'buff': {
        Audio_.sfx('buff');
        for (const p of targets) this.particles(p.x, p.y + 20, 10, { spread: 16, vx: 4, vy0: -110, vy1: -60, s0: 5, s1: 7, cols: ['#ffb86a', '#9ad8ff', '#fff'], life: 0.8, shape: 'arrow' });
        await wait(600); break;
      }
      case 'poison': {
        Audio_.sfx('poison');
        for (const p of targets) this.particles(p.x, p.y + 10, 18, { spread: 24, vx: 20, vy0: -70, vy1: -20, s0: 3, s1: 7, cols: ['#8aff7a', '#6ac04a', '#c8ff9a'], life: 0.8, shape: 'ring' });
        await wait(600); break;
      }
      case 'sleep': {
        Audio_.sfx('heal');
        for (const p of targets) {
          this.addFx(0.8, (g, k) => {
            for (let i = 0; i < 4; i++) {
              const kk = clamp(k * 1.4 - i * 0.12, 0, 1); if (kk <= 0) continue;
              g.save(); g.globalAlpha = 1 - kk;
              text(g, 'Z', p.x - 10 + i * 9 + Math.sin(kk * 6 + i) * 6, p.y - kk * 50, { size: 14 + i * 3, bold: true, color: '#d8c8ff' });
              g.restore();
            }
            g.save(); g.globalAlpha = 0.35 * (1 - k); circle(g, p.x, p.y, 28, '#8a7aff'); g.restore();
          });
        }
        await wait(650); break;
      }
      case 'sand': {
        Audio_.sfx('water');
        this.addFx(0.9, (g, k) => {
          g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.55; g.fillStyle = '#d8a860'; g.fillRect(0, 0, W, H); g.restore();
          for (let i = 0; i < 40; i++) { const y = hash(i, 3) * 340, x = ((hash(i, 4) * W + k * 900 + i * 13) % (W + 100)) - 50; line(g, x, y, x + 26, y + 3, 'rgba(255,230,180,.8)', 2); }
        });
        await wait(850); break;
      }
      case 'flare': {
        Audio_.sfx('boom');
        for (const p of targets) {
          this.addFx(0.9, (g, k) => {
            g.save(); g.globalAlpha = 1 - k;
            circle(g, p.x, p.y, 10 + k * 90, 'rgba(255,200,120,.35)', '#fff', 4);
            circle(g, p.x, p.y, 5 + k * 50, 'rgba(255,255,255,.6)');
            g.restore();
          });
          this.particles(p.x, p.y, 30, { spread: 6, vx: 260, vy0: -260, vy1: 260, s0: 2, s1: 5, cols: ['#fff', '#ffd27a', '#ff8a4a'], life: 0.8 });
        }
        this.screenFlash('#ffffff', 0.85, 0.5); this.shake = 0.3; await wait(850); break;
      }
      default: await wait(150);
    }
  }
  // ---------------- math ----------------
  weakMult(def, elem) { return elem && def.weak && def.weak.includes(elem) ? 1.6 : 1; }
  physDamage(atk, def, mult = 1) { return Math.max(1, Math.round((atk - def / 2) * mult * rnd(0.88, 1.12))); }
  memberAtk(i) { const m = BP()[i]; return stat(m, 'str') * (this.buffs.rally > 0 ? 1.35 : 1); }
  memberDef(i) { const m = BP()[i]; return stat(m, 'def') * (this.buffs.barrier > 0 ? 1.4 : 1); }
  // ---------------- flow ----------------
  async run() {
    Audio_.sfx('encounter');
    await fadeTo(1, 160);
    G.scene = this;
    Audio_.play(this.opts.music || (this.opts.boss ? 'boss' : 'battle'), true);
    await fadeTo(0, 200);
    await wait(350);
    const first = this.enemies[0];
    this.msg = this.opts.boss ? `${first.name} stands in your way!` : (this.enemies.length > 1 ? 'Monsters appear!' : `${first.name} appears!`);
    if (!this.opts.boss && Math.random() < 0.08) { this.msg = 'Ambushed... no, you got the jump on them!'; this.preempt = true; }
    await wait(900); this.msg = null;
    let result = null;
    while (!result) {
      let cmds = null;
      cmds = await this.commandPhase();
      this.active = -1;
      let party = cmds;
      if (cmds.run) {
        this.msg = 'Attempting to flee...'; await wait(500);
        const can = !this.opts.boss && this.opts.canRun !== false;
        const ps = this.liveParty().reduce((a, m) => a + stat(m, 'spd'), 0) / Math.max(1, this.liveParty().length);
        const es = this.liveEnemies().reduce((a, e) => a + e.def.spd, 0) / Math.max(1, this.liveEnemies().length);
        if (can && Math.random() < clamp(0.6 + (ps - es) * 0.03, 0.3, 0.95)) {
          Audio_.sfx('run');
          for (let k = 0; k < 12; k++) { this.pa.forEach(p => p.dx += 12); await wait(30); }
          this.msg = null; result = 'run'; break;
        }
        this.msg = can ? "Couldn't escape!" : 'There is no escape!'; Audio_.sfx('buzz'); await wait(800); this.msg = null;
        party = [];
      }
      // build order
      const order = [];
      party.forEach((c, i) => { if (c && c.type !== 'partner') order.push({ side: 'p', i, c, spd: stat(BP()[i], 'spd') * rnd(0.8, 1.2) + (c.type === 'defend' ? 999 : 0) }); });
      // late bosses may act more than once per round (def.actions)
      if (!this.preempt) this.enemies.forEach((e, i) => { if (e.alive) for (let a = 0; a < (e.def.actions || 1); a++) order.push({ side: 'e', i, spd: e.def.spd * rnd(0.8, 1.2) - a * 6 }); });
      this.preempt = false;
      order.sort((a, b) => b.spd - a.spd);
      this.pa.forEach(p => p.defend = false);
      party.forEach((c, i) => { if (c && c.type === 'defend') this.pa[i].defend = true; });
      for (const o of order) {
        if (this.liveEnemies().length === 0 || this.liveParty().length === 0) break;
        if (o.side === 'p') {
          if (!alive(BP()[o.i])) continue;
          const r = await this.partyAct(o.i, o.c);
          if (r === 'escape') { result = 'run'; break; }
        } else {
          if (!this.enemies[o.i].alive) continue;
          await this.enemyAct(this.enemies[o.i]);
        }
        await wait(160);
      }
      if (result) break;
      // end of round
      for (let i = 0; i < BP().length; i++) {
        const m = BP()[i];
        if (alive(m) && m.status.poison) { const d = Math.max(1, Math.floor(maxHp(m) * 0.06)); m.hp = Math.max(1, m.hp - d); const c = this.memberCenter(i); this.num(c.x, c.y, d, '#8aff7a'); }
      }
      for (let i = 0; i < BP().length; i++) {
        const m = BP()[i]; if (!alive(m)) continue;
        const a = accOf(m);
        if (m.status.regen > 0 || (a && a.regen)) { const h = Math.min(maxHp(m) - m.hp, Math.max(1, Math.floor(maxHp(m) * (m.status.regen > 0 ? 0.08 : 0.05)))); if (h > 0) { m.hp += h; const c = this.memberCenter(i); this.num(c.x + 14, c.y + 10, h, '#7aff9a'); } }
        for (const st of ['sleep', 'silence', 'regen']) if (m.status[st] > 0) m.status[st]--;
      }
      for (const e of this.enemies) for (const st of ['sleep', 'silence']) if (e.status[st] > 0) e.status[st]--;
      for (const e of this.enemies) if (e.alive && e.status.poison) { const d = Math.max(1, Math.floor(Math.min(e.maxhp * 0.05, 250))); e.hp -= d; const c = this.enemyCenter(e); this.num(c.x, c.y, d, '#8aff7a'); if (e.hp <= 0) this.kill(e); }
      if (this.buffs.rally > 0) this.buffs.rally--;
      if (this.buffs.barrier > 0) this.buffs.barrier--;
      if (this.liveEnemies().length === 0) result = 'win';
      else if (this.liveParty().length === 0) result = 'lose';
      await wait(200);
    }
    this.pa.forEach(p => p.defend = false);
    if (result === 'win' && !this.opts.noVictory) await this.victory();
    if (result === 'win' && this.opts.noVictory) await wait(900);
    if (result === 'lose') { this.msg = null; await wait(600); }
    for (const m of BP()) m.status = {};
    return result;
  }
  async commandPhase() {
    const cmds = [];
    let i = 0;
    const n = BP().length;
    while (i < n) {
      const m = BP()[i];
      if (!alive(m) || m.status.sleep) { cmds[i] = null; i++; continue; }
      if (cmds[i] && cmds[i].type === 'partner') { i++; continue; }
      this.active = i;
      this.pa[i].dx = -14;
      const c = await this.chooseCommand(m, i);
      this.pa[i].dx = 0;
      if (c === 'repeat') {
        // re-use last round's commands for everyone who can still act
        const P = BP();
        return this.prevCmds.map((pc, j) => pc && alive(P[j]) && !P[j].status.sleep ? { ...pc } : null);
      }
      if (c === 'back') {
        let j = i - 1; while (j >= 0 && (!alive(BP()[j]) || BP()[j].status.sleep)) j--;
        if (j >= 0 && cmds[j] && cmds[j].type === 'partner') j = cmds[j].from;
        if (j >= 0) { for (let k = 0; k < cmds.length; k++) if (cmds[k] && cmds[k].type === 'partner' && cmds[k].from === j) cmds[k] = null; i = j; }
        continue;
      }
      if (c.type === 'run') return { run: true };
      for (let k = 0; k < cmds.length; k++) if (cmds[k] && cmds[k].type === 'partner' && cmds[k].from === i) cmds[k] = null;
      cmds[i] = c;
      if (c.type === 'combo') {
        const cb = COMBOS.find(x => x.id === c.combo);
        for (const id of cb.members) { const j = BP().findIndex(p => p.id === id); if (j !== i) cmds[j] = { type: 'partner', from: i }; }
      }
      i++;
    }
    this.prevCmds = cmds.slice();
    return cmds;
  }
  async chooseCommand(m, idx) {
    const d = HEROES[m.id];
    while (true) {
      const spells = spellsOf(m);
      const usable = Object.keys(G.inv).filter(k => ITEMS[k].kind === 'use' && ITEMS[k].field !== 'world');
      const items = [
        { label: 'Attack' },
        { label: m.status.silence ? d.skill + ' (silenced)' : d.skill, disabled: !spells.length || !!m.status.silence },
        { label: 'Combo', disabled: !this.combosFor(m).length },
        { label: 'Item', disabled: !usable.length },
        { label: 'Defend' },
        { label: 'Run', disabled: !!this.opts.boss }
      ];
      const canRepeat = this.prevCmds && !this.prevCmds.some(c => c && c.type === 'run');
      const k = await listMenu({ x: 8, y: 330, w: 200, rows: 6, rowH: 21, items, index: this.lastCmd ? this.lastCmd[idx] || 0 : 0, size: 15, hotkeys: canRepeat ? { run: -10 } : null });
      if (k === -10) return 'repeat';
      this.lastCmd = this.lastCmd || {}; if (k >= 0) this.lastCmd[idx] = k;
      if (k < 0) return 'back';
      if (k === 0) { const tg = await this.pickTarget('enemy'); if (tg !== null && tg !== undefined) return { type: 'attack', target: tg }; continue; }
      if (k === 1) {
        const sp = await listMenu({
          x: 8, y: 150, w: 290, rows: 7, rowH: 24, title: d.skill,
          items: spells.map(s => ({ label: SPELLS[s].name, right: SPELLS[s].mp ? SPELLS[s].mp + ' MP' : '—', disabled: m.mp < SPELLS[s].mp })),
          help: i => SPELLS[spells[i]].desc
        });
        if (sp < 0) continue;
        const s = SPELLS[spells[sp]];
        const tg = await this.pickTarget(s.target, s.type === 'revive');
        if (tg !== null && tg !== undefined) return { type: 'spell', spell: spells[sp], target: tg };
        continue;
      }
      if (k === 2) {
        const cs = this.combosFor(m);
        const ci = await listMenu({
          x: 8, y: 150, w: 330, rows: 7, rowH: 24, title: 'Combo Techs',
          items: cs.map(c => ({ label: c.name, right: c.members.map(id => HEROES[id].name[0]).join('+') })),
          help: i => `${cs[i].desc}  (MP: ${cs[i].members.map((id, j) => HEROES[id].name + ' ' + cs[i].mp[j]).join(', ')})`
        });
        if (ci < 0) continue;
        const c = cs[ci];
        const tg = c.target === 'enemy' ? await this.pickTarget('enemy') : 'all';
        if (tg !== null && tg !== undefined) return { type: 'combo', combo: c.id, target: tg };
        continue;
      }
      if (k === 3) {
        const it = await listMenu({
          x: 8, y: 150, w: 290, rows: 7, rowH: 24, title: 'Items',
          items: usable.map(u => ({ label: ITEMS[u].name, right: '×' + G.inv[u] })),
          help: i => ITEMS[usable[i]].desc
        });
        if (it < 0) continue;
        const item = ITEMS[usable[it]];
        const tg = await this.pickTarget(item.target, item.effect === 'revive');
        if (tg !== null && tg !== undefined) return { type: 'item', item: usable[it], target: tg };
        continue;
      }
      if (k === 4) return { type: 'defend' };
      if (k === 5) return { type: 'run' };
    }
  }
  pickTarget(kind, dead = false) {
    const self = this;
    if (kind === 'self') return Promise.resolve('self');
    const comp = {
      kind, idx: 0,
      list() {
        if (kind === 'enemy' || kind === 'enemies') return self.enemies.filter(e => e.alive);
        return BP().map((m, i) => i).filter(i => dead ? true : alive(BP()[i]));
      },
      update() {
        const L = this.list();
        if (kind === 'enemy' || kind === 'ally') {
          if (Input.p('up') || Input.p('left')) { this.idx = (this.idx + L.length - 1) % L.length; Audio_.sfx('cursor'); }
          if (Input.p('down') || Input.p('right')) { this.idx = (this.idx + 1) % L.length; Audio_.sfx('cursor'); }
        }
        if (Input.p('ok')) { Audio_.sfx('ok'); UI.close(this, (kind === 'enemies' || kind === 'allies') ? 'all' : L[this.idx]); }
        else if (Input.p('cancel')) { Audio_.sfx('cancel'); UI.close(this, null); }
      },
      draw(g) {
        const L = this.list();
        const pts = [];
        const sel = (kind === 'enemy' || kind === 'ally') ? [L[this.idx]] : L;
        for (const s of sel) {
          if (typeof s === 'number') { const c = self.memberCenter(s); pts.push({ x: c.x - 34, y: c.y - 6, name: memberName(BP()[s]), left: true }); }
          else if (s) { const c = self.enemyCenter(s); pts.push({ x: c.x + monsterWidth(s.def) * s.bs * 0.45, y: c.y, name: s.name }); }
        }
        const tt = performance.now() / 1000;
        for (const p of pts) {
          g.save(); g.translate(p.x + Math.sin(tt * 8) * 3, p.y);
          if (!p.left) g.scale(-1, 1);
          poly(g, [-14, -8, 0, 0, -14, 8, -11, 0], '#fff', '#223', 1.5);
          g.restore();
        }
        const label = kind === 'enemies' ? 'All enemies' : kind === 'allies' ? 'All allies' : (pts[0] && pts[0].name) || '';
        g.font = font(16, true);
        const w = g.measureText(label).width + 40;
        drawWindow(g, (W - w) / 2, 12, w, 38);
        text(g, label, W / 2, 22, { size: 16, bold: true, align: 'center' });
      }
    };
    if (kind === 'ally') {
      // default to the most hurt ally
      const L = comp.list();
      let best = 0, bv = 2;
      L.forEach((i, j) => { const m = BP()[i]; const v = dead && !alive(m) ? -1 : m.hp / maxHp(m); if (v < bv) { bv = v; best = j; } });
      comp.idx = best;
    }
    return UI.push(comp);
  }
  resolveTargets(side, target) {
    // side: 'enemy' | 'ally'
    if (side === 'enemy') {
      if (target === 'all') return this.liveEnemies();
      if (target && target.alive) return [target];
      const L = this.liveEnemies(); return L.length ? [pick(L)] : [];
    } else {
      if (target === 'all') return BP().map((m, i) => i).filter(i => alive(BP()[i]));
      if (typeof target === 'number') return [target];
      return [];
    }
  }
  async stepForward(i, fn) {
    const a = this.pa[i];
    for (let k = 0; k < 6; k++) { a.dx -= 6; await wait(16); }
    await fn();
    for (let k = 0; k < 6; k++) { a.dx += 6; await wait(16); }
    a.dx = 0; a.pose = null;
  }
  damageEnemy(e, dmg, col = '#fff', crit = false) {
    e.hp -= dmg; e.flash = 0.4; e.shake = 0.3; if (e.status.sleep) e.status.sleep = 0;
    const c = this.enemyCenter(e);
    this.num(c.x + rnd(-8, 8), c.y, dmg, crit ? '#ffd23a' : col, crit);
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) { e.hp = 0; e.alive = false; e.dying = 0; e.status = {}; G.killed[e.id] = (G.killed[e.id] || 0) + 1; Audio_.sfx('ko'); }
  damageMember(i, dmg) {
    const m = BP()[i];
    m.hp = Math.max(0, m.hp - dmg);
    if (m.status.sleep && Math.random() < 0.6) m.status.sleep = 0;
    this.pa[i].flash = 0.4; this.pa[i].shake = 0.3;
    const c = this.memberCenter(i);
    this.num(c.x, c.y, dmg, '#fff');
    if (m.hp <= 0) {
      m.status = {}; Audio_.sfx('ko');
      const a = accOf(m);
      if (a && a.reraise && !this.reraised.has(m.id)) { this.reraised.add(m.id); m.hp = Math.floor(maxHp(m) * 0.3); setTimeout(() => this.num(c.x, c.y - 20, 'Phoenix!', '#ffb86a', true), 300); Audio_.sfx('holy'); }
    }
  }
  healMember(i, n) {
    const m = BP()[i];
    if (!alive(m)) return;
    const before = m.hp; m.hp = Math.min(maxHp(m), m.hp + n);
    const c = this.memberCenter(i); this.num(c.x, c.y, m.hp - before, '#7aff9a');
  }
  combosFor(m) {
    const P = BP();
    return COMBOS.filter(c => c.members.includes(m.id) && (!c.flag || G.flags[c.flag]) && c.members.every((id, j) => {
      const p = P.find(x => x.id === id);
      return p && alive(p) && !p.status.sleep && !p.status.silence && p.mp >= c.mp[j];
    }));
  }
  async doCombo(i, c) {
    const cb = COMBOS.find(x => x.id === c.combo), P = BP();
    const idx = cb.members.map(id => P.findIndex(p => p.id === id));
    if (idx.some(j => j < 0 || !alive(P[j]) || P[j].status.sleep || P[j].status.silence || P[j].mp < cb.mp[cb.members.indexOf(P[j].id)])) {
      this.msg = 'The combo falls apart!'; Audio_.sfx('buzz'); await wait(800); this.msg = null; return;
    }
    idx.forEach((j, k) => P[j].mp -= cb.mp[k]);
    this.msg = cb.name;
    idx.forEach(j => { this.pa[j].pose = 'cast'; this.pa[j].dx = -20; });
    this.screenFlash('#ffffff', 0.35, 0.3);
    Audio_.sfx('levelup');
    await wait(500);
    const sumAtk = idx.reduce((a, j) => a + this.memberAtk(j), 0), sumMag = idx.reduce((a, j) => a + stat(P[j], 'mag'), 0);
    const ts = this.resolveTargets('enemy', c.target);
    if (cb.type === 'phys') {
      const tg = ts[0];
      if (tg) for (let h = 0; h < (cb.hits || 1) && tg.alive; h++) {
        await this.playFx(cb.fx, [this.enemyCenter(tg)]);
        this.damageEnemy(tg, this.physDamage(sumAtk * 0.75, tg.def.def, cb.power * this.weakMult(tg.def, cb.elem)), '#ffd27a', true);
        await wait(120);
      }
    } else {
      await this.playFx(cb.fx, ts.map(e => this.enemyCenter(e)));
      for (const e of ts) this.damageEnemy(e, Math.max(1, Math.round((cb.power + sumMag * 0.75) * rnd(0.92, 1.08) * this.weakMult(e.def, cb.elem) - e.def.mag * 0.4)), '#ffd27a', true);
    }
    if (cb.heal) { const L = P.map((p, k) => k).filter(k => alive(P[k])); await this.playFx('heal', L.map(k => this.memberCenter(k))); for (const k of L) this.healMember(k, Math.round(maxHp(P[k]) * cb.heal)); }
    idx.forEach(j => { this.pa[j].pose = null; this.pa[j].dx = 0; });
    await wait(250); this.msg = null;
  }
  async partyAct(i, c) {
    const m = BP()[i], a = this.pa[i];
    if (m.status.sleep) { const p = this.memberCenter(i); this.num(p.x, p.y, 'Asleep', '#c8b8ff'); await wait(300); return; }
    if (c.type === 'defend') return;
    if (c.type === 'combo') return this.doCombo(i, c);
    if (c.type === 'attack') {
      const tg = this.resolveTargets('enemy', c.target)[0];
      if (!tg) return;
      this.msg = null;
      await this.stepForward(i, async () => {
        a.pose = 'attack'; a.swing = 0;
        for (let k = 0; k < 6; k++) { a.swing = k / 5; await wait(16); }
        const p = this.enemyCenter(tg);
        await this.playFx('slash', [p]);
        if (Math.random() < 0.03) { this.num(p.x, p.y, 'Miss', '#cfd8ff'); Audio_.sfx('miss'); return; }
        const crit = Math.random() < 0.06 + stat(m, 'spd') * 0.001;
        const dmg = this.physDamage(this.memberAtk(i), tg.def.def, crit ? 1.7 : 1);
        if (crit) { Audio_.sfx('crit'); this.shake = 0.15; }
        this.damageEnemy(tg, dmg, '#fff', crit);
        await wait(250);
      });
      return;
    }
    if (c.type === 'item') {
      if (!hasItem(c.item)) { this.msg = 'Out of that item!'; await wait(600); this.msg = null; return; }
      const it = ITEMS[c.item];
      addItem(c.item, -1);
      this.msg = it.name;
      a.pose = 'cast'; await wait(250);
      if (it.effect === 'bomb') {
        const ts = this.liveEnemies(), el = it.elem || 'fire';
        await this.playFx(it.fx || 'fire', ts.map(e => this.enemyCenter(e)));
        for (const e of ts) this.damageEnemy(e, Math.round(it.amount * this.weakMult(e.def, el) * rnd(0.9, 1.1)));
      } else {
        const ts = it.target === 'allies' ? BP().map((_, k) => k) : [c.target];
        await this.playFx(it.effect === 'revive' ? 'holy' : 'heal', ts.map(k => this.memberCenter(k)));
        for (const k of ts) applyItemEffect(c.item, BP()[k], this, k);
      }
      a.pose = null; await wait(300); this.msg = null;
      return;
    }
    if (c.type === 'spell') {
      const s = SPELLS[c.spell];
      if (m.status.silence) { this.msg = `${memberName(m)} is silenced!`; Audio_.sfx('buzz'); await wait(700); this.msg = null; return; }
      if (m.mp < s.mp) { this.msg = 'Not enough MP!'; Audio_.sfx('buzz'); await wait(700); this.msg = null; return; }
      m.mp -= s.mp;
      this.msg = s.name;
      if (s.type === 'phys') {
        const tg = this.resolveTargets('enemy', c.target)[0];
        if (!tg) { this.msg = null; return; }
        await this.stepForward(i, async () => {
          const hits = s.hits || 1;
          for (let h = 0; h < hits && tg.alive; h++) {
            a.pose = 'attack'; a.swing = 0;
            for (let k = 0; k < 5; k++) { a.swing = k / 4; await wait(14); }
            const p = this.enemyCenter(tg);
            await this.playFx(s.fx === 'holy' ? 'holy' : s.fx === 'poison' ? 'slash' : 'slash', [p]);
            const mult = s.power * this.weakMult(tg.def, s.elem);
            const dmg = this.physDamage(this.memberAtk(i) * (s.elem === 'holy' ? 1 + stat(m, 'mag') / 200 : 1), tg.def.def, mult);
            this.damageEnemy(tg, dmg);
            if (s.mug && h === 0 && !tg.stolen && tg.def.steal && Math.random() < clamp(0.5 + (stat(m, 'spd') - tg.def.spd) * 0.02, 0.25, 0.9)) { tg.stolen = true; addItem(tg.def.steal); Audio_.sfx('item'); this.num(p.x, p.y - 30, ITEMS[tg.def.steal].name, '#ffe9a8'); }
            if (s.poison && tg.alive && !tg.def.boss) { tg.status.poison = true; await this.playFx('poison', [p]); }
            else if (s.poison && tg.alive && tg.def.boss && Math.random() < 0.4) { tg.status.poison = true; await this.playFx('poison', [p]); }
            a.pose = null; await wait(120);
          }
        });
        this.msg = null; return;
      }
      if (s.type === 'steal') {
        const tg = this.resolveTargets('enemy', c.target)[0];
        if (!tg) { this.msg = null; return; }
        await this.stepForward(i, async () => {
          for (let k = 0; k < 8; k++) { a.dx -= 10; await wait(14); }
          if (tg.stolen || !tg.def.steal) { this.msg = 'Nothing to steal!'; }
          else if (Math.random() < clamp(0.55 + (stat(m, 'spd') - tg.def.spd) * 0.02, 0.25, 0.92)) {
            tg.stolen = true; addItem(tg.def.steal); Audio_.sfx('item'); this.msg = `Stole ${ITEMS[tg.def.steal].name}!`;
          } else { this.msg = "Couldn't steal!"; Audio_.sfx('miss'); }
          await wait(700);
          for (let k = 0; k < 8; k++) { a.dx += 10; await wait(14); }
        });
        this.msg = null; return;
      }
      if (s.type === 'escape') {
        a.pose = 'cast'; await wait(300);
        if (this.opts.boss || this.opts.canRun === false) { this.msg = 'There is no escape!'; Audio_.sfx('buzz'); await wait(700); this.msg = null; a.pose = null; return; }
        this.addFx(0.8, (g, k) => { g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.9; g.fillStyle = '#d8d8e0'; g.fillRect(380, 100, 260, 300); g.restore(); });
        Audio_.sfx('run'); await wait(800);
        return 'escape';
      }
      a.pose = 'cast';
      this.addFx(0.4, (g, k) => { const p = this.memberCenter(i); g.save(); g.globalAlpha = 1 - k; circle(g, p.x, p.y + 30, 10 + k * 26, null, s.type === 'heal' || s.type === 'revive' ? '#9affb0' : '#ffe9a8', 2.5); g.restore(); });
      await wait(380);
      if (s.type === 'dmg') {
        const ts = this.resolveTargets('enemy', c.target);
        await this.playFx(s.fx, ts.map(e => this.enemyCenter(e)));
        let total = 0;
        for (const e of ts) {
          const dmg = Math.max(1, Math.round((s.power + stat(m, 'mag')) * rnd(0.92, 1.08) * this.weakMult(e.def, s.elem) - e.def.mag * 0.4));
          total += Math.min(dmg, Math.max(0, e.hp));
          this.damageEnemy(e, dmg, this.weakMult(e.def, s.elem) > 1 ? '#ffd27a' : '#fff');
        }
        if (s.drain) this.healMember(i, total);
      } else if (s.type === 'gravity') {
        const ts = this.resolveTargets('enemy', c.target);
        await this.playFx('dark', ts.map(e => this.enemyCenter(e)));
        for (const e of ts) this.damageEnemy(e, Math.max(1, Math.min(9999, Math.floor(e.hp * (e.def.boss ? 0.08 : 0.25)))), '#d8b8ff');
      } else if (s.type === 'heal') {
        const ts = this.resolveTargets('ally', c.target);
        await this.playFx('heal', ts.map(k => this.memberCenter(k)));
        for (const k of ts) this.healMember(k, Math.round((s.power + stat(m, 'mag') * 1.5) * (s.scale || 1) * rnd(0.95, 1.05)));
      } else if (s.type === 'sanctuary') {
        const ts = BP().map((_, k) => k);
        await this.playFx('holy', ts.map(k => this.memberCenter(k)));
        for (const k of ts) {
          const t = BP()[k], p = this.memberCenter(k);
          if (!alive(t)) { t.hp = Math.floor(maxHp(t) * 0.5); this.num(p.x, p.y, 'Revived', '#7aff9a'); }
          else this.healMember(k, Math.round((s.power + stat(m, 'mag') * 1.5) * s.scale * rnd(0.95, 1.05)));
          t.status.poison = false; t.status.sleep = 0; t.status.silence = 0;
        }
      } else if (s.type === 'revive') {
        const k = c.target;
        await this.playFx('holy', [this.memberCenter(k)]);
        const t = BP()[k];
        if (!alive(t)) { t.hp = Math.floor(maxHp(t) * 0.35); const p = this.memberCenter(k); this.num(p.x, p.y, 'Revived', '#7aff9a'); }
        else { const p = this.memberCenter(k); this.num(p.x, p.y, 'No effect', '#cfd8ff'); }
      } else if (s.type === 'cure') {
        const k = c.target;
        await this.playFx('heal', [this.memberCenter(k)]);
        BP()[k].status.poison = false; BP()[k].status.sleep = 0; BP()[k].status.silence = 0;
      } else if (s.type === 'regen') {
        const k = c.target;
        await this.playFx('heal', [this.memberCenter(k)]);
        if (alive(BP()[k])) { BP()[k].status.regen = 5; const p = this.memberCenter(k); this.num(p.x, p.y, 'Regen', '#9ad8ff'); }
      } else if (s.type === 'status') {
        const ts = this.resolveTargets('enemy', c.target);
        await this.playFx(s.fx, ts.map(e => this.enemyCenter(e)));
        for (const e of ts) {
          const p = this.enemyCenter(e);
          if (e.def.boss) this.num(p.x, p.y, 'Immune', '#cfd8ff');
          else if (Math.random() < s.chance) { e.status[s.status] = s.status === 'sleep' ? 3 : 4; this.num(p.x, p.y, s.status === 'sleep' ? 'Sleep' : 'Silence', '#c8b8ff'); }
          else this.num(p.x, p.y, 'Miss', '#cfd8ff');
        }
      } else if (s.type === 'buff') {
        const ts = this.resolveTargets('ally', 'all');
        await this.playFx('buff', ts.map(k => this.memberCenter(k)));
        this.buffs[s.buff] = 4;
      }
      a.pose = null; await wait(250); this.msg = null;
    }
  }
  async enemyAct(e) {
    if (e.status.sleep) { const c = this.enemyCenter(e); this.num(c.x, c.y, 'Zzz', '#c8b8ff'); await wait(350); return; }
    const acts = e.def.acts || [{ w: 1, a: 'attack' }];
    let act = weighted(acts).a;
    if (e.status.silence && act !== 'attack' && SPELLS[act] && SPELLS[act].type !== 'phys') act = 'attack';
    const live = this.liveParty();
    if (!live.length) return;
    const targetIdx = () => { const L = BP().map((m, i) => i).filter(i => alive(BP()[i])); return pick(L); };
    if (act === 'attack') {
      const i = targetIdx();
      for (let k = 0; k < 5; k++) { e.lunge += 7; await wait(16); }
      const p = this.memberCenter(i);
      await this.playFx('hit', [p]);
      const ms = stat(BP()[i], 'spd');
      if (Math.random() < clamp(0.03 + (ms - e.def.spd) * 0.004, 0.02, 0.12)) { this.num(p.x, p.y, 'Miss', '#cfd8ff'); Audio_.sfx('miss'); }
      else {
        let dmg = this.physDamage(e.def.atk, this.memberDef(i), this.pa[i].defend ? 0.5 : 1);
        this.damageMember(i, dmg);
      }
      for (let k = 0; k < 5; k++) { e.lunge -= 7; await wait(16); }
      e.lunge = 0;
      return;
    }
    const s = SPELLS[act];
    this.msg = s.name;
    e.flash = 0.25;
    await wait(400);
    if (s.type === 'heal') {
      await this.playFx('heal', [this.enemyCenter(e)]);
      const n = Math.round(s.power + e.def.mag * 1.5); e.hp = Math.min(e.maxhp, e.hp + n);
      const c = this.enemyCenter(e); this.num(c.x, c.y, n, '#7aff9a');
      this.msg = null; return;
    }
    const ts = s.target === 'allies' ? BP().map((m, i) => i).filter(i => alive(BP()[i])) : [targetIdx()];
    if (s.type === 'status') {
      await this.playFx(s.fx, ts.map(i => this.memberCenter(i)));
      for (const i of ts) {
        const m = BP()[i], p = this.memberCenter(i);
        if (immune(m, s.status)) this.num(p.x, p.y, 'Immune', '#cfd8ff');
        else if (Math.random() < s.chance) { m.status[s.status] = s.status === 'sleep' ? 2 : 3; this.num(p.x, p.y, s.status === 'sleep' ? 'Sleep' : 'Silence', '#c8b8ff'); }
        else this.num(p.x, p.y, 'Miss', '#cfd8ff');
      }
      await wait(250); this.msg = null; return;
    }
    if (s.type === 'phys') {
      for (let k = 0; k < 5; k++) { e.lunge += 8; await wait(16); }
      await this.playFx(s.fx === 'slash' ? 'slash' : 'hit', ts.map(i => this.memberCenter(i)));
      this.shake = 0.12;
      for (const i of ts) {
        const dmg = this.physDamage(e.def.atk, this.memberDef(i), s.power * (this.pa[i].defend ? 0.5 : 1));
        this.damageMember(i, dmg);
        if (s.poison && alive(BP()[i]) && !immune(BP()[i], 'poison') && Math.random() < s.poison) BP()[i].status.poison = true;
      }
      for (let k = 0; k < 5; k++) { e.lunge -= 8; await wait(16); }
      e.lunge = 0;
    } else {
      await this.playFx(s.fx, ts.map(i => this.memberCenter(i)));
      let total = 0;
      for (const i of ts) {
        const m = BP()[i];
        let dmg = (s.power + e.def.mag) * rnd(0.9, 1.1) - stat(m, 'mag') * 0.4;
        if (this.buffs.barrier > 0) dmg *= 0.6;
        if (this.pa[i].defend) dmg *= 0.6;
        dmg = Math.max(1, Math.round(dmg));
        this.damageMember(i, dmg); total += dmg;
        if (s.poison && alive(m) && !immune(m, 'poison') && Math.random() < s.poison) m.status.poison = true;
      }
      if (s.drain) { e.hp = Math.min(e.maxhp, e.hp + total); const c = this.enemyCenter(e); this.num(c.x, c.y, total, '#7aff9a'); }
    }
    await wait(250);
    this.msg = null;
  }
  async victory() {
    this.msg = null;
    await wait(500);
    Audio_.play('victory', true);
    this.pa.forEach((p, i) => { if (alive(BP()[i])) { p.pose = 'victory'; p.jump = 1; } });
    let xp = 0, gold = 0; const drops = [];
    for (const e of this.enemies) {
      xp += e.def.xp; gold += e.def.gold;
      if (e.def.drop && Math.random() < e.def.drop[1]) drops.push(e.def.drop[0]);
      if (e.def.mat && Math.random() < e.def.mat[1]) drops.push(e.def.mat[0]);
    }
    if (BP().some(m => alive(m) && accOf(m) && accOf(m).goldx)) gold = Math.round(gold * 1.5);
    G.gold += gold;
    const msgs = [];
    for (const m of BP()) if (alive(m)) { const a = accOf(m); msgs.push(...gainXp(m, Math.round(xp * (a && a.xp ? a.xp : 1)))); }
    for (const m of G.party.slice(4)) msgs.push(...gainXp(m, Math.round(xp * 0.5)));
    if (xp || gold) await narrate(`Victory! Gained ${xp} EXP and ${gold} gold.`);
    else await wait(2200);
    for (const d of drops) { addItem(d); Audio_.sfx('item'); await narrate(`Found ${ITEMS[d].name}!`); }
    for (const s of msgs) { Audio_.sfx(s.includes('learned') ? 'item' : 'levelup'); await narrate(s); }
    this.pa.forEach(p => { p.jump = 0; });
  }
}
async function startBattle(ids, opts = {}) {
  const prev = G.scene;
  const b = new Battle(ids, opts);
  const r = await b.run();
  if ((r !== 'lose' || opts.arena) && !opts.keepScene) {
    await fadeTo(1, 220);
    G.scene = prev;
    if (prev && prev.playMusic) prev.playMusic();
    await fadeTo(0, 260);
  }
  return r;
}
function applyItemEffect(id, m, battle, idx) {
  const it = ITEMS[id];
  const show = (v, col) => { if (battle) { const c = battle.memberCenter(idx); battle.num(c.x, c.y, v, col); } };
  switch (it.effect) {
    case 'hp': if (alive(m)) { const b = m.hp; m.hp = Math.min(maxHp(m), m.hp + it.amount); show(m.hp - b, '#7aff9a'); return true; } return false;
    case 'mp': if (alive(m)) { const b = m.mp; m.mp = Math.min(maxMp(m), m.mp + it.amount); show(m.mp - b, '#7ab8ff'); return true; } return false;
    case 'cure': if (alive(m)) { m.status.poison = false; show('Cured', '#7aff9a'); return true; } return false;
    case 'remedy': if (alive(m)) { m.status.poison = false; m.status.sleep = 0; m.status.silence = 0; show('Cured', '#7aff9a'); return true; } return false;
    case 'revive': if (!alive(m)) { m.hp = Math.floor(maxHp(m) * 0.3); show('Revived', '#7aff9a'); return true; } return false;
    case 'elixir': if (alive(m)) { m.hp = maxHp(m); m.mp = maxMp(m); show('Full', '#7aff9a'); return true; } return false;
    case 'megalixir': if (alive(m)) { m.hp = maxHp(m); m.mp = maxMp(m); show('Full', '#7aff9a'); } return true;
  }
  return false;
}

function ngScale(d) {
  const ng = (G.flags && G.flags.ngplus) || 0;
  if (!ng) return d;
  const k = ng;
  return { ...d, hp: Math.round(d.hp * (1 + 0.6 * k)), atk: Math.round(d.atk * (1 + 0.22 * k)), mag: Math.round(d.mag * (1 + 0.22 * k)), def: Math.round(d.def * (1 + 0.12 * k)), xp: Math.round(d.xp * (1 + 0.5 * k)), gold: Math.round(d.gold * (1 + 0.5 * k)) };
}
