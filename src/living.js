'use strict';
// ============================================================
//  LIVING WORLD (1.9): the clock, day and night, regional weather
//  and how weather changes battles. Loaded after platform.js.
// ============================================================

// ---------------- the clock ----------------
// One real second on the field is one minute of game time: a day lasts 24 minutes.
const DAY_MIN = 1440, CLOCK_START = 8 * 60;
function clockNow() { return G.clock === undefined ? CLOCK_START : G.clock; }
function timeOfDay() { return ((clockNow() % DAY_MIN) + DAY_MIN) % DAY_MIN; }
function dayNumber() { return Math.floor(clockNow() / DAY_MIN) + 1; }
// night runs from 20:30 to 5:30; dusk and dawn are the hour either side
function isNight() { const t = timeOfDay(); return t >= 20.5 * 60 || t < 5.5 * 60; }
function dayPhase() {
  const t = timeOfDay();
  if (t < 5.5 * 60 || t >= 20.5 * 60) return 'night';
  if (t < 7 * 60) return 'dawn';
  if (t < 19 * 60) return 'day';
  return 'dusk';
}
function fmtClockHM() { const t = Math.floor(timeOfDay()); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
let lastNight = null;
function advanceClock(dt) {
  G.clock = clockNow() + dt;
  const n = isNight();
  if (lastNight !== null && n !== lastNight && Field.map && Field.map.kind === 'town' && !Script.running) refreshEntities();   // night folk come out, day folk go home
  lastNight = n;
}
// jump the clock forward to the next given hour (resting at an inn, a tent)
function sleepUntil(hour) {
  const t = timeOfDay(); let add = hour * 60 - t; if (add <= 30) add += DAY_MIN;
  G.clock = clockNow() + add; lastNight = isNight();
}
// how dark the sky is, 0 (noon) to 1 (midnight), with a warm tint at dawn and dusk
function skyTint() {
  const t = timeOfDay() / 60;
  const dark = t < 5 ? 1 : t < 7 ? 1 - (t - 5) / 2 : t < 18.5 ? 0 : t < 21 ? (t - 18.5) / 2.5 : 1;
  const warm = t >= 5 && t < 7.5 ? 1 - Math.abs(t - 6.2) / 1.3 : t >= 17.5 && t < 21 ? 1 - Math.abs(t - 19.3) / 1.7 : 0;
  return { dark: clamp(dark, 0, 1), warm: clamp(warm, 0, 1) };
}
// where the sky can be seen: the world map and outdoor towns
function underSky(m) { return m && (m.kind === 'world' || (m.kind === 'town' && !m.underwater && !m.underground)); }

// ---------------- weather ----------------
// Each region rolls its weather every six game hours from the clock, so it needs no saving.
const WEATHER = {
  clear: { name: 'Clear', icon: '☀' },
  rain: { name: 'Rain', icon: '☂', battle: 'Rain: water and lightning hit 25% harder, fire 25% softer.', boost: ['water', 'bolt'], dampen: ['fire'] },
  snow: { name: 'Snow', icon: '❄', battle: 'Snow: ice hits 25% harder, fire 25% softer.', boost: ['ice'], dampen: ['fire'] },
  sand: { name: 'Sandstorm', icon: '≋', battle: 'Sandstorm: every physical attack misses 15% more often.', miss: 0.15 },
  fog: { name: 'Fog', icon: '☁', battle: 'Fog: physical attacks miss 10% more often.', miss: 0.1 },
  ash: { name: 'Ashfall', icon: '✶', battle: 'Ashfall: fire hits 25% harder, water 25% softer.', boost: ['fire'], dampen: ['water'] }
};
function regionWeather(reg, y) {
  const block = Math.floor(clockNow() / 360), h = hash(block, (reg || 'S').charCodeAt(0), 77);
  if (reg === 'H') return 'ash';
  if (reg === 'B' && y <= 11) return h < 0.55 ? 'snow' : 'clear';
  if (reg === 'B') return h < 0.2 ? 'rain' : 'clear';
  if (reg === 'F') return h < 0.3 ? 'sand' : 'clear';
  if (reg === 'G') return 'clear';                       // the sky valley sits above the weather
  if (reg === 'C') return h < 0.5 ? 'fog' : 'clear';
  if (reg === 'A' || reg === 'E') return h < 0.25 ? 'rain' : h < 0.35 ? 'fog' : 'clear';
  return h < 0.2 ? 'rain' : 'clear';                     // open sea
}
function worldWeatherAt(x, y) {
  const w = getMap('world'), reg = w.region[y] && w.region[y][x];
  return regionWeather(reg, y);
}
// the weather where the party is now (indoors and underground there is none)
function currentWeather() {
  const m = Field.map;
  if (!m) return 'clear';
  if (m.kind === 'world') return G.inAir ? 'clear' : worldWeatherAt(G.x, G.y);
  if (m.kind === 'town' && !m.underwater && !m.underground) { const L = locDef(m.loc); return L && locMap(m.loc) === 'world' ? worldWeatherAt(L.x, L.y) : 'clear'; }
  return 'clear';
}
function weatherMult(w, elem) {
  const W_ = WEATHER[w]; if (!W_ || !elem) return 1;
  return W_.boost && W_.boost.includes(elem) ? 1.25 : W_.dampen && W_.dampen.includes(elem) ? 0.75 : 1;
}
function weatherMiss(w) { return (WEATHER[w] && WEATHER[w].miss) || 0; }

// ---------------- drawing ----------------
function drawSky(g, m, cx, cy, t) {
  if (!underSky(m)) return;
  const { dark, warm } = skyTint();
  if (warm > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgb(255,${Math.round(255 - 60 * warm)},${Math.round(255 - 120 * warm)})`; g.fillRect(0, 0, W, H); g.restore(); }
  if (dark > 0) {
    // multiply toward moonlit blue: colours keep their hue, but the world goes properly dark
    g.save(); g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${Math.round(255 - 190 * dark)},${Math.round(255 - 175 * dark)},${Math.round(255 - 120 * dark)})`; g.fillRect(0, 0, W, H);
    g.restore();
    // lamps, braziers, lit windows and roadside lamps glow through the dark
    g.save(); g.globalCompositeOperation = 'lighter';
    const glow = (sx, sy, r, col, a) => { const lg = g.createRadialGradient(sx, sy, 2, sx, sy, r); lg.addColorStop(0, `rgba(${col},${a * dark})`); lg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = lg; g.fillRect(sx - r, sy - r, r * 2, r * 2); };
    const x0 = Math.floor(cx / TS) - 2, y0 = Math.floor(cy / TS) - 2;
    for (let y = y0; y <= y0 + VH + 4; y++) for (let x = x0; x <= x0 + VW + 4; x++) {
      const c = m.at(x, y); if (c === undefined) continue;
      const sx = x * TS - cx + 16, sy = y * TS - cy + 10;
      if (m.kind === 'town' && (c === 'l' || c === 'b')) glow(sx, sy, c === 'b' ? 110 : 80, '255,190,100', 0.45);
      if (m.kind === 'world' && isLoc(c)) glow(sx, sy, 70, '255,200,120', 0.4);
    }
    if (m.kind === 'town') for (const b of m.buildings || []) { const sx = (b.x + b.w / 2) * TS - cx, sy = (b.y + b.h - 1.3) * TS - cy; if (sx > -80 && sy > -80 && sx < W + 80 && sy < H + 80) glow(sx, sy, 60, '255,200,120', 0.3); }
    for (const e of m.entities) if (e.kind === 'roadlamp' && e.lit) glow(e.x * TS - cx + 16, e.y * TS - cy - 4, 70, '255,210,120', 0.5);
    g.restore();
    if (m.kind === 'world' || m.kind === 'town') for (let i = 0; i < 30; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 3); circle(g, hash(i, 91) * W, hash(i, 92) * H * 0.35, 1, `rgba(255,255,255,${0.35 * dark * tw})`); }
  }
}
function drawWeather(g, w, t, strength = 1) {
  if (!w || w === 'clear') return;
  g.save();
  if (w === 'rain') {
    g.fillStyle = 'rgba(30,45,75,.22)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(200,225,255,.7)'; g.lineWidth = 1.5;
    for (let i = 0; i < 130 * strength; i++) { const k = (t * 1.6 + hash(i, 11)) % 1, x = (hash(i, 12) * (W + 120) - k * 60) % (W + 60), y = k * (H + 40) - 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 14); g.stroke(); }
  } else if (w === 'snow') {
    g.fillStyle = 'rgba(225,235,255,.14)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 120 * strength; i++) { const k = (t * 0.12 + hash(i, 21)) % 1, x = (hash(i, 22) * W + Math.sin(t + i) * 18) % W, y = k * H; circle(g, x, y, 1.3 + hash(i, 23) * 2, 'rgba(255,255,255,.95)', 'rgba(120,140,180,.4)', 0.6); }
  } else if (w === 'sand') {
    g.fillStyle = 'rgba(190,120,50,.34)'; g.fillRect(0, 0, W, H);
    // rolling dust clouds, then fast streaks of grit
    for (let i = 0; i < 7; i++) { const x = ((hash(i, 34) * W + t * 140 * (0.7 + hash(i, 35))) % (W + 400)) - 200, y = hash(i, 36) * H; g.fillStyle = 'rgba(170,110,50,.22)'; g.beginPath(); g.ellipse(x, y, 190, 70, 0, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 2;
    for (let i = 0; i < 90 * strength; i++) { const k = (t * 1.1 + hash(i, 31)) % 1, x = k * (W + 100) - 50, y = hash(i, 32) * H + Math.sin(t * 3 + i) * 4; g.strokeStyle = i % 3 ? 'rgba(120,70,30,.45)' : 'rgba(255,225,170,.6)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + hash(i, 33) * 24, y + 2); g.stroke(); }
  } else if (w === 'fog') {
    for (let i = 0; i < 9; i++) { const x = ((hash(i, 41) * W + t * 10 * (1 + hash(i, 42))) % (W + 300)) - 150, y = hash(i, 43) * H; g.fillStyle = 'rgba(220,225,235,.13)'; g.beginPath(); g.ellipse(x, y, 170, 60, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(200,205,215,.12)'; g.fillRect(0, 0, W, H);
  } else if (w === 'ash') {
    for (let i = 0; i < 50 * strength; i++) { const k = (t * 0.07 + hash(i, 51)) % 1, x = (hash(i, 52) * W + Math.sin(t * 0.8 + i) * 14) % W, y = k * H; circle(g, x, y, 1.3, i % 7 ? 'rgba(160,150,150,.7)' : `rgba(255,140,60,${0.8 * (1 - k)})`); }
  }
  g.restore();
}

// ---------------- night people ----------------
// At night the wanderers go home and a few night owls come out.
function nightNpcs(id) {
  const f = G.flags;
  const L = {
    brightwater: [N(9, 13, 101, { hair: '#c8c0b0', style: 'bald', beard: true, body: '#3a3a5a', hat: 'cap' }, async () => say('Lamplighter\'s Watch', f.road_done ? 'Twelve lamps on the roads again. I walk out to the bridge each night just to look at them.' : 'Your father lit the roadside lamps every evening. Nobody\'s done it since. The roads are very dark, Arin.'), { name: 'Night watchman' })],
    halden: [N(7, 15, 102, { style: 'long', body: '#2a3a5a', accent: '#c8a050' }, async () => say('Moonlit Fisher', hasItem('fishing_rod') ? 'The fish bite differently at night. Different fish, too, some say. I say: same fish, different mood.' : 'Night fishing is the only peace and quiet in this harbour.'), { name: 'Night fisher' })],
    ironhold: [N(14, 9, 103, { ...LOOKS.guard, hat: 'cap' }, async () => say('Night Patrol', 'Mines run all night. Listen: hammers. The dwarves say the mountain sleeps better with someone tapping on it.'))],
    frostmere: [N(10, 9, 104, { style: 'spiky', body: '#3a3a6a', accent: '#e8d070' }, async () => say('Stargazer Nils', f.lantern5 ? 'There — the Fifth Flame. You can see it with your bare eyes if you squint. I squint a lot.' : 'Clearest sky in the world, Frostmere. On a cloudless night you can count every star. I got to four thousand once.'))],
    mirage: [N(8, 12, 105, { skin: '#a8724a', style: 'bun', body: '#3a2a5a', accent: '#e8c24a' }, async () => say('Night Market Vendor', 'The night market opens when the sand cools. Dates, lamps, stories. Mostly stories.'), { name: 'Night vendor' })],
    aerie: [N(12, 12, 106, { body: '#5a6a8a', hat: 'cap' }, async () => say('Windwatcher', 'At night the wind sings in the mesas. Old Aerie folk say it\'s the Aurora, calling home.'))],
    lastlight: []
  };
  return (L[id] || []).concat(cardNightNpcs(id));
}
