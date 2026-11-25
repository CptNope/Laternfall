'use strict';
// ============================================================
//  DATA — heroes, spells, items, monsters, encounters, shops
// ============================================================
const HEROES = {
  arin: {
    name: tl('Arin'), cls: tl('Lamplighter'), skill: tl('Valor'),
    base: { hp: 62, mp: 10, str: 12, def: 8, mag: 5, spd: 8 },
    grow: { hp: 14, mp: 1.8, str: 2.4, def: 1.8, mag: 0.9, spd: 1.0 },
    spells: [['cure', 3], ['sunstrike', 6], ['rally', 11], ['valor', 18], ['dawnbreak', 42]],
    look: { skin: '#f1c9a0', hair: '#7a3e1d', style: 'spiky', body: '#2e5fb8', accent: '#e8c24a', cape: '#b8322e', weapon: 'sword' },
    start: { weapon: 'bronze_sword', armor: 'leather' },
    bio: tl('A young lamplighter of Brightwater. Steady hand, stubborn heart.')
  },
  lyra: {
    name: tl('Lyra'), cls: tl('Flamecaller'), skill: tl('Magic'),
    base: { hp: 42, mp: 22, str: 6, def: 5, mag: 13, spd: 9 },
    grow: { hp: 9.5, mp: 4, str: 1.0, def: 1.1, mag: 2.6, spd: 1.1 },
    spells: [['fire', 1], ['ice', 2], ['bolt', 4], ['sleep', 6], ['fira', 9], ['blizzara', 11], ['thundara', 13], ['flare', 20], ['starfall', 24], ['supernova', 44]],
    look: { skin: '#f6d6b8', hair: '#c9472f', style: 'long', body: '#7b3fa8', accent: '#f0d36a', hat: 'witch', weapon: 'staff' },
    start: { weapon: 'oak_staff', armor: 'cloth_robe' },
    bio: tl('Arin\'s oldest friend. Talks to fire like it is a stubborn cat.')
  },
  oswin: {
    name: tl('Oswin'), cls: tl('Tide Priest'), skill: tl('Prayer'),
    base: { hp: 50, mp: 20, str: 9, def: 8, mag: 11, spd: 7 },
    grow: { hp: 11.5, mp: 3.4, str: 1.5, def: 1.6, mag: 2.2, spd: 0.9 },
    spells: [['cure', 1], ['purify', 1], ['cura', 7], ['raise', 9], ['barrier', 12], ['holy', 15], ['renew', 16], ['curaga', 19], ['haste', 24], ['sanctuary', 42]],
    look: { skin: '#e2b48c', hair: '#d8d8d8', style: 'bald', body: '#e9ecf2', accent: '#3a8fd0', beard: true, weapon: 'mace' },
    start: { weapon: 'iron_mace', armor: 'silk_robe' },
    bio: tl('An old priest of the sea who dreams of things before they happen.')
  },
  kestrel: {
    name: tl('Kestrel'), cls: tl('Rogue'), skill: tl('Tricks'),
    base: { hp: 52, mp: 12, str: 11, def: 6, mag: 6, spd: 14 },
    grow: { hp: 12, mp: 1.8, str: 2.3, def: 1.3, mag: 1.0, spd: 1.6 },
    spells: [['steal', 1], ['twin', 1], ['smoke', 1], ['venom', 14], ['flash', 18], ['shadowstep', 20], ['mug', 26], ['thousand', 42]],
    look: { skin: '#c98e62', hair: '#1f1b2e', style: 'pony', body: '#2f6b4a', accent: '#c7c7c7', hood: true, weapon: 'dagger' },
    start: { weapon: 'steel_dagger', armor: 'thief_vest' },
    bio: tl('A quick-fingered thief from the Ironhold undercity. Owes nobody.')
  },
  selene: {
    name: tl('Selene'), cls: tl('Duskmage'), skill: tl('Dusk'),
    base: { hp: 46, mp: 24, str: 7, def: 6, mag: 14, spd: 11 },
    grow: { hp: 10.5, mp: 4, str: 1.1, def: 1.2, mag: 2.75, spd: 1.3 },
    spells: [['shade', 1], ['drain', 1], ['gravity', 1], ['slow', 1], ['nightfall', 1], ['requiem', 28], ['stop', 30], ['eventide', 44]],
    look: { skin: '#f6d6b8', hair: '#a03a2a', style: 'long', body: '#3a2a5a', accent: '#c04aa8', robe: true, weapon: 'staff' },
    start: { weapon: 'crescent_rod', armor: 'sage_robe' },
    bio: tl('Lyra\'s elder sister. Seven years in the dark taught her its spells — and how to turn them back on it.')
  }
};

// type: dmg (magic), phys (physical skill), heal, revive, buff, cure, steal, escape
const SPELLS = {
  cure: { name: tl('Cure'), mp: 4, type: 'heal', power: 22, target: 'ally', fx: 'heal', desc: tl('Restore HP to one ally.') },
  cura: { name: tl('Cura'), mp: 9, type: 'heal', power: 26, scale: 0.75, target: 'allies', fx: 'heal', desc: tl('Restore HP to all allies.') },
  curaga: { name: tl('Curaga'), mp: 18, type: 'heal', power: 60, scale: 1.3, target: 'allies', fx: 'heal', desc: tl('Greatly restore all allies.') },
  purify: { name: tl('Purify'), mp: 2, type: 'cure', target: 'ally', fx: 'heal', desc: tl('Cure every ailment: poison, sleep, silence, blind, slow, berserk and stop.') },
  stop: { name: tl('Stop'), mp: 14, type: 'status', status: 'stop', chance: 0.6, target: 'enemy', fx: 'dark', desc: tl('Freeze one foe in time for 2 rounds. Bosses are immune.') },
  haste: { name: tl('Haste'), mp: 10, type: 'haste', target: 'ally', fx: 'buff', desc: tl('One ally acts much sooner for 4 rounds.') },
  slow: { name: tl('Slow'), mp: 8, type: 'status', status: 'slow', chance: 0.7, target: 'enemy', fx: 'dark', desc: tl('One foe acts later for 4 rounds. Works on bosses half as often.') },
  flash: { name: tl('Flash Powder'), mp: 6, type: 'status', status: 'blind', chance: 0.65, target: 'enemies', fx: 'holy', desc: tl('Blind all foes: their attacks miss half the time. Bosses resist.') },
  renew: { name: tl('Renew'), mp: 10, type: 'regen', target: 'ally', fx: 'heal', desc: tl('Slowly restore an ally\'s HP each round.') },
  sleep: { name: tl('Sleep'), mp: 4, type: 'status', status: 'sleep', chance: 0.75, target: 'enemy', fx: 'sleep', desc: tl('Put one foe to sleep. Bosses resist.') },
  raise: { name: tl('Raise'), mp: 14, type: 'revive', target: 'ally', fx: 'holy', desc: tl('Revive a fallen ally.') },
  barrier: { name: tl('Barrier'), mp: 10, type: 'buff', buff: 'barrier', target: 'allies', fx: 'buff', desc: tl('Raise party defense for a time.') },
  rally: { name: tl('Rally'), mp: 8, type: 'buff', buff: 'rally', target: 'allies', fx: 'buff', desc: tl('Raise party attack for a time.') },
  holy: { name: tl('Holy'), mp: 16, type: 'dmg', elem: 'holy', power: 70, target: 'enemy', fx: 'holy', desc: tl('Searing holy light on one foe.') },
  sunstrike: { name: tl('Sunstrike'), mp: 5, type: 'phys', elem: 'holy', power: 1.6, target: 'enemy', fx: 'holy', desc: tl('A blade of sunlight. Strong vs. undead.') },
  valor: { name: tl('Lionheart'), mp: 14, type: 'phys', elem: 'holy', power: 2.8, target: 'enemy', fx: 'holy', desc: tl('Arin\'s finest stroke.') },
  fire: { name: tl('Fire'), mp: 4, type: 'dmg', elem: 'fire', power: 10, target: 'enemy', fx: 'fire', desc: tl('Flames on one foe.') },
  ice: { name: tl('Ice'), mp: 4, type: 'dmg', elem: 'ice', power: 10, target: 'enemy', fx: 'ice', desc: tl('Frost on one foe.') },
  bolt: { name: tl('Bolt'), mp: 5, type: 'dmg', elem: 'bolt', power: 12, target: 'enemy', fx: 'bolt', desc: tl('Lightning on one foe.') },
  fira: { name: tl('Fira'), mp: 10, type: 'dmg', elem: 'fire', power: 26, target: 'enemies', fx: 'fire', desc: tl('Flames on all foes.') },
  blizzara: { name: tl('Blizzara'), mp: 10, type: 'dmg', elem: 'ice', power: 26, target: 'enemies', fx: 'ice', desc: tl('Frost on all foes.') },
  thundara: { name: tl('Thundara'), mp: 12, type: 'dmg', elem: 'bolt', power: 30, target: 'enemies', fx: 'bolt', desc: tl('Lightning on all foes.') },
  flare: { name: tl('Flare'), mp: 24, type: 'dmg', elem: 'none', power: 120, target: 'enemy', fx: 'flare', desc: tl('A star\'s heart, unleashed.') },
  starfall: { name: tl('Starfall'), mp: 36, type: 'dmg', elem: 'none', power: 85, target: 'enemies', fx: 'flare', desc: tl('Call down the sky.') },
  shade: { name: tl('Shade'), mp: 6, type: 'dmg', elem: 'dark', power: 30, target: 'enemy', fx: 'dark', desc: tl('A lance of shadow.') },
  drain: { name: tl('Drain'), mp: 9, type: 'dmg', elem: 'dark', power: 26, drain: true, target: 'enemy', fx: 'dark', desc: tl('Steal HP from a foe.') },
  gravity: { name: tl('Gravity'), mp: 12, type: 'gravity', target: 'enemy', fx: 'dark', desc: tl('Crush a foe for a quarter of its HP (less on bosses).') },
  nightfall: { name: tl('Nightfall'), mp: 16, type: 'dmg', elem: 'dark', power: 42, target: 'enemies', fx: 'dark', desc: tl('Darkness falls on all foes.') },
  requiem: { name: tl('Requiem'), mp: 34, type: 'dmg', elem: 'dark', power: 105, target: 'enemies', fx: 'dark', desc: tl('The last song of the night.') },
  steal: { name: tl('Steal'), mp: 0, type: 'steal', target: 'enemy', fx: 'none', desc: tl('Lift an item from a foe.') },
  twin: { name: tl('Twin Strike'), mp: 4, type: 'phys', hits: 2, power: 0.8, target: 'enemy', fx: 'slash', desc: tl('Two quick cuts.') },
  smoke: { name: tl('Smoke Bomb'), mp: 3, type: 'escape', target: 'self', fx: 'none', desc: tl('Guaranteed escape (not from bosses).') },
  venom: { name: tl('Venom Edge'), mp: 7, type: 'phys', power: 1.3, poison: true, target: 'enemy', fx: 'poison', desc: tl('Strike and poison.') },
  shadowstep: { name: tl('Shadowstep'), mp: 15, type: 'phys', hits: 3, power: 0.9, target: 'enemy', fx: 'slash', desc: tl('Three strikes from nowhere.') },
  mug: { name: tl('Mug'), mp: 6, type: 'phys', power: 1.2, mug: true, target: 'enemy', fx: 'slash', desc: tl('Strike, and pocket something on the way out.') },
  thousand: { name: tl('Thousand Cuts'), mp: 24, type: 'phys', hits: 5, power: 0.85, target: 'enemy', fx: 'slash', desc: tl('Five strikes faster than thought.') },
  dawnbreak: { name: tl('Dawnbreak'), mp: 28, type: 'phys', elem: 'holy', power: 3.8, target: 'enemy', fx: 'holy', desc: tl('The sunrise, swung. A lamplighter\'s last lesson.') },
  supernova: { name: tl('Supernova'), mp: 52, type: 'dmg', elem: 'none', power: 165, target: 'enemies', fx: 'flare', desc: tl('Lyra stops holding back.') },
  sanctuary: { name: tl('Sanctuary'), mp: 40, type: 'sanctuary', power: 80, scale: 1.2, target: 'allies', fx: 'holy', desc: tl('Revive the fallen and restore the whole party.') },
  eventide: { name: tl('Eventide'), mp: 46, type: 'dmg', elem: 'dark', power: 150, drain: true, target: 'enemies', fx: 'dark', desc: tl('Night falls gently on all foes, and takes a little back.') },
  // enemy abilities
  e_spores: { name: tl('Spore Cloud'), type: 'dmg', elem: 'none', power: 6, target: 'allies', fx: 'poison', poison: 0.5 },
  e_bite: { name: tl('Venom Bite'), type: 'phys', power: 1.1, target: 'ally', fx: 'slash', poison: 0.6 },
  e_slam: { name: tl('Slam'), type: 'phys', power: 1.5, target: 'ally', fx: 'hit' },
  e_cleave: { name: tl('Cleave'), type: 'phys', power: 0.9, target: 'allies', fx: 'slash' },
  e_fire: { name: tl('Fire'), type: 'dmg', elem: 'fire', power: 14, target: 'ally', fx: 'fire' },
  e_ice: { name: tl('Ice'), type: 'dmg', elem: 'ice', power: 14, target: 'ally', fx: 'ice' },
  e_bolt: { name: tl('Bolt'), type: 'dmg', elem: 'bolt', power: 16, target: 'ally', fx: 'bolt' },
  e_blaze: { name: tl('Blaze'), type: 'dmg', elem: 'fire', power: 10, target: 'allies', fx: 'fire' },
  e_frost: { name: tl('Frost Breath'), type: 'dmg', elem: 'ice', power: 10, target: 'allies', fx: 'ice' },
  e_tidal: { name: tl('Tidal Wave'), type: 'dmg', elem: 'water', power: 8, target: 'allies', fx: 'water' },
  e_shadow: { name: tl('Shadow Bolt'), type: 'dmg', elem: 'dark', power: 30, target: 'ally', fx: 'dark' },
  e_night: { name: tl('Hollow Night'), type: 'dmg', elem: 'dark', power: 4, target: 'allies', fx: 'dark' },
  e_drain: { name: tl('Drain'), type: 'dmg', elem: 'dark', power: 18, target: 'ally', fx: 'dark', drain: true },
  e_eclipse: { name: tl('Eclipse'), type: 'dmg', elem: 'dark', power: 0, target: 'allies', fx: 'dark' },
  e_doom: { name: tl('Crown of Ash'), type: 'dmg', elem: 'dark', power: 70, target: 'ally', fx: 'dark' },
  e_gaze: { name: tl('Gaze'), type: 'dmg', elem: 'dark', power: 22, target: 'ally', fx: 'dark' },
  e_heal: { name: tl('Mend'), type: 'heal', power: 30, target: 'self', fx: 'heal' },
  e_lullaby: { name: tl('Lullaby'), type: 'status', status: 'sleep', chance: 0.55, target: 'ally', fx: 'sleep' },
  e_dreamfog: { name: tl('Dream Fog'), type: 'status', status: 'sleep', chance: 0.3, target: 'allies', fx: 'sleep' },
  e_hush: { name: tl('Hush'), type: 'status', status: 'silence', chance: 0.6, target: 'ally', fx: 'dark' },
  e_meteor: { name: tl('Meteor Rain'), type: 'dmg', elem: 'none', power: 28, target: 'allies', fx: 'flare' },
  e_starbreath: { name: tl('Starfire Breath'), type: 'dmg', elem: 'fire', power: 25, target: 'allies', fx: 'fire' },
  e_crush: { name: tl('Crushing Coil'), type: 'phys', power: 1.7, target: 'ally', fx: 'hit' },
  e_needles: { name: tl('Needle Storm'), type: 'phys', power: 0.7, target: 'allies', fx: 'slash' },
  e_sandstorm: { name: tl('Sandstorm'), type: 'dmg', elem: 'none', power: 12, target: 'allies', fx: 'sand' },
  e_whirl: { name: tl('Maelstrom'), type: 'dmg', elem: 'water', power: 18, target: 'allies', fx: 'water' },
  e_crownfall: { name: tl('Crownfall'), type: 'dmg', elem: 'dark', power: 58, target: 'allies', fx: 'dark' },
  e_nightsong: { name: tl('Night Song'), type: 'status', status: 'sleep', chance: 0.4, target: 'allies', fx: 'sleep' },
  e_ashstorm: { name: tl('Ash Storm'), type: 'dmg', elem: 'fire', power: 34, target: 'allies', fx: 'fire', poison: 0.3 },
  e_shatter: { name: tl('Shatter'), type: 'phys', power: 2.0, target: 'ally', fx: 'hit' },
  e_hushall: { name: tl('Hollow Hush'), type: 'status', status: 'silence', chance: 0.4, target: 'allies', fx: 'dark' },
  e_blind: { name: tl('Blinding Sand'), type: 'status', status: 'blind', chance: 0.55, target: 'ally', fx: 'sand' },
  e_blindall: { name: tl('Dazzle'), type: 'status', status: 'blind', chance: 0.35, target: 'allies', fx: 'holy' },
  e_slow: { name: tl('Time Warp'), type: 'status', status: 'slow', chance: 0.5, target: 'ally', fx: 'dark' },
  e_slowall: { name: tl('Heavy Night'), type: 'status', status: 'slow', chance: 0.35, target: 'allies', fx: 'dark' },
  // 1.7 The Drowned Kingdom
  e_madden: { name: tl('Maddening Howl'), type: 'status', status: 'berserk', chance: 0.45, target: 'ally', fx: 'fire' },
  e_stop: { name: tl('Still Gaze'), type: 'status', status: 'stop', chance: 0.4, target: 'ally', fx: 'dark' },
  e_maelstrom: { name: tl('Maelstrom'), type: 'dmg', elem: 'water', power: 32, target: 'allies', fx: 'water' },
  e_undertow: { name: tl('Undertow'), type: 'dmg', elem: 'water', power: 62, target: 'ally', fx: 'water' },
  e_depths: { name: tl('Crushing Depths'), type: 'phys', power: 1.0, target: 'allies', fx: 'hit' },
  e_sting: { name: tl('Lantern Sting'), type: 'dmg', elem: 'bolt', power: 24, target: 'ally', fx: 'bolt' },
  e_lure: { name: tl('Lure Light'), type: 'status', status: 'blind', chance: 0.5, target: 'allies', fx: 'holy' },
  e_siren: { name: tl('Siren Song'), type: 'status', status: 'sleep', chance: 0.4, target: 'allies', fx: 'sleep' },
  e_forget: { name: tl('Forget'), type: 'status', status: 'silence', chance: 0.45, target: 'allies', fx: 'water' },
  e_remember: { name: tl('Remember'), type: 'heal', power: 500, target: 'self', fx: 'heal' }
};
const STATUS_LABEL = { sleep: tl('Sleep'), silence: tl('Silence'), blind: tl('Blind'), slow: tl('Slow'), poison: tl('Poison'), berserk: tl('Berserk'), stop: tl('Stop') };
const CASTERS = ['lyra', 'oswin', 'selene'];
const STATUS_TURNS = { sleep: [2, 3], silence: [3, 4], blind: [3, 4], slow: [3, 4], berserk: [3, 3], stop: [2, 2] };   // [on heroes, on enemies]

const AILMENTS = ['poison', 'sleep', 'silence', 'blind', 'slow', 'berserk', 'stop'];
// ITEMS, MONSTERS, ENCOUNTERS, NIGHT_ENC and SHOPS are data files in content/ (2.0, EN-1).
// build.py checks them and puts them in the game ahead of this file. See content/README.md.

// Orrin's forge (Ironhold). Unlocked once the Stonebrand is home.
const RECIPES = [
  { out: 'forge_ring', mats: { ember_core: 2, frost_crystal: 2 }, gold: 3000 },
  { out: 'ember_plate', mats: { ember_core: 4, sun_gold: 3 }, gold: 8000 },
  { out: 'night_weave', mats: { dusk_silk: 3, frost_crystal: 3 }, gold: 8000 },
  { out: 'gloam_leathers', mats: { dusk_silk: 3, star_shard: 2 }, gold: 8000 },
  { out: 'oathblade', mats: { star_shard: 3, sun_gold: 2, abyss_ash: 3 }, gold: 20000 },
  { out: 'phoenix_staff', mats: { ember_core: 4, star_shard: 3, abyss_ash: 2 }, gold: 18000 },
  { out: 'tidecaller', mats: { frost_crystal: 3, sun_gold: 2, abyss_ash: 2 }, gold: 18000 },
  { out: 'gloamfang', mats: { dusk_silk: 4, abyss_ash: 3 }, gold: 18000 },
  { out: 'evenstar', mats: { dusk_silk: 3, star_shard: 3, abyss_ash: 2 }, gold: 18000 },
  { out: 'abyssal_plate', mats: { deep_pearl: 4, abyss_ash: 2, sun_gold: 2 }, gold: 24000 },
  { out: 'pearl_veil', mats: { deep_pearl: 4, dusk_silk: 3 }, gold: 22000 },
  { out: 'marlin_garb', mats: { deep_pearl: 3, dusk_silk: 2, star_shard: 2 }, gold: 22000 }
];
// The black market marks everything up; items with price 0 elsewhere get a price here
const BLACKMARKET_PRICES = { megalixir: 20000, elixir: 6000, thief_gloves: 60000 };
const BLACKMARKET_MARKUP = 3;

// 1.7 Treasure maps: each map's dig spot is placed on the world map at load (see maps.js TREASURE_SPOTS)
const TREASURES = {
  1: { loot: ['gold:25000', 'megalixir', 'xpotion'], source: tl('Whisper sells it in the Undermarket') },
  2: { loot: ['frost_crystal', 'frost_crystal', 'frost_crystal', 'megalixir'], source: tl('Dropped by Sand Bandits, Cutpurses and Abyssal Anglers') },
  3: { loot: ['sun_gold', 'sun_gold', 'sun_gold', 'gold:30000'], source: tl('Dropped by Sand Bandits, Cutpurses and Abyssal Anglers') },
  4: { loot: ['lucky_coin', 'elixir', 'elixir'], source: tl('Dropped by Sand Bandits, Cutpurses and Abyssal Anglers') },
  5: { loot: ['admiral_hat', 'deep_pearl', 'deep_pearl', 'deep_pearl'], source: tl('A wreck on the sea floor') }
};

// Fishing: where each fish bites. 'w' is weight; harder fish need more reel hits.
const FISH = {
  minnow: { diff: 1 }, trout: { diff: 1 }, goldcarp: { diff: 3 }, seabass: { diff: 1 }, mackerel: { diff: 2 }, eel: { diff: 2 },
  icepike: { diff: 2 }, frostchar: { diff: 2 }, sturgeon: { diff: 3 }, catfish: { diff: 2 }, pearlfish: { diff: 3 }, embereel: { diff: 3 }, koi: { diff: 3 }
};
const FISH_SPOTS = {
  brightwater: [{ w: 6, f: 'minnow' }, { w: 4, f: 'trout' }, { w: 1, f: 'goldcarp' }],
  halden: [{ w: 5, f: 'seabass' }, { w: 3, f: 'mackerel' }, { w: 2, f: 'eel' }],
  sea: [{ w: 6, f: 'seabass' }, { w: 4, f: 'mackerel' }, { w: 1, f: 'eel' }],
  river: [{ w: 5, f: 'trout' }, { w: 5, f: 'minnow' }],
  frostmere: [{ w: 5, f: 'icepike' }, { w: 4, f: 'frostchar' }, { w: 1, f: 'sturgeon' }],
  mirage: [{ w: 7, f: 'catfish' }, { w: 1, f: 'pearlfish' }],
  shrine: [{ w: 4, f: 'eel' }, { w: 4, f: 'mackerel' }, { w: 2, f: 'seabass' }],
  lastlight: [{ w: 4, f: 'embereel' }, { w: 4, f: 'catfish' }, { w: 2, f: 'trout' }],
  ash: [{ w: 3, f: 'embereel' }, { w: 5, f: 'seabass' }, { w: 2, f: 'mackerel' }]
};

function xpForLevel(L) { return L <= 1 ? 0 : Math.round(8 * Math.pow(L - 1, 2.3) + 12 * (L - 1)); }
const MAX_LEVEL = 50;

// Combo techs: members must all be in the battle party, awake, unsilenced and have the MP.
const COMBOS = [
  { id: 'flame_edge', name: tl('Flame Edge'), members: ['arin', 'lyra'], mp: [6, 6], type: 'phys', elem: 'fire', power: 2.6, target: 'enemy', fx: 'fire', desc: tl('Lyra sets Arin\'s blade alight.') },
  { id: 'sacred_cross', name: tl('Sacred Cross'), members: ['arin', 'oswin'], mp: [8, 10], type: 'dmg', elem: 'holy', power: 55, heal: 0.15, target: 'enemies', fx: 'holy', desc: tl('Holy damage to all foes; heals the party a little.') },
  { id: 'crossfang', name: tl('Crossfang'), members: ['arin', 'kestrel'], mp: [6, 6], type: 'phys', power: 1.5, hits: 3, target: 'enemy', fx: 'slash', desc: tl('Three crossing strikes.') },
  { id: 'prism_nova', name: tl('Prism Nova'), members: ['lyra', 'oswin'], mp: [12, 10], type: 'dmg', elem: 'none', power: 70, target: 'enemies', fx: 'flare', desc: tl('Light split into every color.') },
  { id: 'firestorm', name: tl('Firestorm'), members: ['lyra', 'kestrel'], mp: [10, 6], type: 'dmg', elem: 'fire', power: 52, target: 'enemies', fx: 'fire', desc: tl('Kestrel scatters bombs; Lyra lights them.') },
  { id: 'tidebreaker', name: tl('Tidebreaker'), members: ['oswin', 'kestrel'], mp: [8, 6], type: 'phys', elem: 'water', power: 2.3, target: 'enemy', fx: 'water', desc: tl('A wave with a knife in it.') },
  { id: 'eclipse_blade', name: tl('Eclipse Blade'), members: ['arin', 'selene'], mp: [8, 10], type: 'phys', elem: 'dark', power: 3.0, target: 'enemy', fx: 'dark', desc: tl('A blade of night, swung by daylight.') },
  { id: 'twin_stars', name: tl('Twin Stars'), members: ['lyra', 'selene'], mp: [16, 16], type: 'dmg', elem: 'none', power: 120, target: 'enemies', fx: 'flare', desc: tl('The sisters\' song. Devastates all foes.') },
  { id: 'lantern_light', name: tl('Lantern Light'), members: ['arin', 'lyra', 'oswin'], mp: [14, 18, 18], type: 'dmg', elem: 'holy', power: 160, heal: 0.4, target: 'enemies', fx: 'holy', desc: tl('The first flame, remembered. Heals the party.') },
  { id: 'shadow_waltz', name: tl('Shadow Waltz'), members: ['kestrel', 'selene'], mp: [10, 10], type: 'phys', elem: 'dark', power: 1.1, hits: 4, target: 'enemy', fx: 'dark', desc: tl('Two shadows dancing. Four dark strikes.') },
  { id: 'twilight_psalm', name: tl('Twilight Psalm'), members: ['oswin', 'selene'], mp: [14, 14], type: 'dmg', elem: 'none', power: 95, heal: 0.25, target: 'enemies', fx: 'flare', desc: tl('A prayer sung in light and dark. Heals the party.') },
  { id: 'last_light', name: tl('Last Light'), members: ['arin', 'lyra', 'selene'], mp: [20, 24, 24], type: 'dmg', elem: 'holy', power: 230, heal: 0.2, target: 'enemies', fx: 'holy', flag: 'combo_lastlight', desc: tl('Lastlight\'s secret: three who carried the flame through the dark.') }
];
// Limits: one per hero, unlocked by finishing that hero's personal quest (flag limit_<id>).
// The gauge fills as the hero takes damage and carries over between battles.
const LIMITS = {
  arin: { name: tl('First Light'), target: 'enemy', desc: tl('A blade of dawn on one foe. Revives and heals the whole party.') },
  lyra: { name: tl('Phoenix Rite'), target: 'enemies', desc: tl('Fire on every foe, then the party gains Regen.') },
  oswin: { name: tl('High Tide'), target: 'enemies', desc: tl('A wave on every foe. Fully heals the party, cures ailments and raises Barrier.') },
  kestrel: { name: tl('Grand Larceny'), target: 'enemy', desc: tl('Six lightning strikes, and steals from every foe.') },
  selene: { name: tl('Long Night'), target: 'enemies', desc: tl('Darkness on every foe; heals the party with what it takes. Puts ordinary foes to sleep.') }
};
const limitUnlocked = m => !!(LIMITS[m.id] && G.flags['limit_' + m.id]);
const limitReady = m => limitUnlocked(m) && (m.limit || 0) >= 100;

// The Lantern Board: from Lv 30 each level gives an Ember (at the cap, one per 20,000 EXP).
// Every hero shares the layout; the passives and the big node differ per hero.
const BOARD_NODES = {
  spark: { x: 3, y: 2, cost: 0, links: ['hp', 'mp', 'atk', 'mag'] },
  hp: { x: 2, y: 1, cost: 1, links: ['spark', 'p1'] }, mp: { x: 4, y: 1, cost: 1, links: ['spark', 'p2'] },
  atk: { x: 2, y: 3, cost: 1, links: ['spark', 'def'] }, mag: { x: 4, y: 3, cost: 1, links: ['spark', 'spd'] },
  p1: { x: 1, y: 1, cost: 2, links: ['hp', 'big', 'cap'] }, p2: { x: 5, y: 1, cost: 2, links: ['mp', 'p3', 'cap'] },
  def: { x: 1, y: 3, cost: 2, links: ['atk', 'big'] }, spd: { x: 5, y: 3, cost: 2, links: ['mag', 'p3'] },
  big: { x: 0, y: 2, cost: 3, links: ['p1', 'def'] }, p3: { x: 6, y: 2, cost: 3, links: ['p2', 'spd'] },
  cap: { x: 3, y: 0, cost: 5, links: ['p1', 'p2'] }
};
const BOARD_EMBERS_TOTAL = Object.values(BOARD_NODES).reduce((a, n) => a + n.cost, 0);
const PASSIVES = {
  counter: { name: tl('Counter'), desc: tl('20% chance to strike back when hit by an attack.') },
  limit_charge: { name: tl('Quick Limit'), desc: tl('The Limit gauge fills 50% faster.') },
  auto_regen: { name: tl('Auto-Regen'), desc: tl('Starts every battle with Regen.') },
  auto_haste: { name: tl('Auto-Haste'), desc: tl('Starts every battle with Haste.') },
  mp_saver: { name: tl('MP Saver'), desc: tl('Skills cost 25% less MP.') },
  first_strike: { name: tl('Lookout'), desc: tl('The party gets the first strike far more often.') },
  resolve: { name: tl('Lamplighter\'s Resolve'), desc: tl('Once per battle, survive a fatal blow with 1 HP.') },
  wildfire: { name: tl('Wildfire'), desc: tl('Magic damage +20%.') },
  tidal_grace: { name: tl('Tidal Grace'), desc: tl('Healing +30%.') },
  ghost_step: { name: tl('Ghost Step'), desc: tl('Dodge 25% of attacks.') },
  twilight: { name: tl('Twilight'), desc: tl('Dark damage +25%.') }
};
const BOARD_HERO = {
  arin: { p1: 'counter', p2: 'limit_charge', p3: 'auto_regen', cap: 'resolve', big: 'str' },
  lyra: { p1: 'mp_saver', p2: 'limit_charge', p3: 'auto_haste', cap: 'wildfire', big: 'mag' },
  oswin: { p1: 'mp_saver', p2: 'auto_regen', p3: 'first_strike', cap: 'tidal_grace', big: 'mag' },
  kestrel: { p1: 'counter', p2: 'first_strike', p3: 'auto_haste', cap: 'ghost_step', big: 'str' },
  selene: { p1: 'mp_saver', p2: 'limit_charge', p3: 'auto_haste', cap: 'twilight', big: 'mag' }
};
// flat bonuses (hp/mp are a share of the base stat); the big node is +20 to the hero's chosen stat
const BOARD_STATS = { hp: ['hp', 0.1], mp: ['mp', 0.15], atk: ['str', 8], mag: ['mag', 8], def: ['def', 10], spd: ['spd', 6] };

// Cooking (at inns): a meal buffs the party for the next 3 battles
const MEALS = {
  minnow_fry: { name: tl('Minnow Fry'), needs: { minnow: 3 }, effect: 'regen', desc: tl('Start battles with Regen.') },
  grilled_trout: { name: tl('Grilled Trout'), needs: { trout: 2 }, effect: 'str', amount: 0.12, desc: tl('ATK +12%.') },
  bass_stew: { name: tl('Sea Bass Stew'), needs: { seabass: 1, mackerel: 1 }, effect: 'def', amount: 0.12, desc: tl('DEF +12%.') },
  eel_skewers: { name: tl('Eel Skewers'), needs: { eel: 2 }, effect: 'spd', amount: 0.15, desc: tl('SPD +15%.') },
  char_sashimi: { name: tl('Frost Char Sashimi'), needs: { frostchar: 1, icepike: 1 }, effect: 'mag', amount: 0.12, desc: tl('MAG +12%.') },
  catfish_gumbo: { name: tl('Catfish Gumbo'), needs: { catfish: 2 }, effect: 'haste', desc: tl('Start battles with Haste.') },
  ember_hotpot: { name: tl('Ember Eel Hotpot'), needs: { embereel: 2 }, effect: 'ward', desc: tl('No ailments can take hold.') },
  carp_feast: { name: tl('Golden Carp Feast'), needs: { goldcarp: 1, minnow: 1 }, effect: 'xp', amount: 0.25, desc: tl('EXP +25%.') },
  pearl_pilaf: { name: tl('Pearl Pilaf'), needs: { pearlfish: 1 }, effect: 'gold', amount: 0.5, desc: tl('Gold +50%.') },
  sturgeon_roast: { name: tl('Snow Sturgeon Roast'), needs: { sturgeon: 1 }, effect: 'power', amount: 0.15, desc: tl('ATK and MAG +15%.') },
  koi_banquet: { name: tl('Lantern Koi Banquet'), needs: { koi: 1 }, effect: 'all', amount: 0.15, desc: tl('All stats +15%, and Regen.') }
};
const MEAL_BATTLES = 3;

// Arena cups at Aerie
const ARENA_CUPS = [
  { id: 'bronze', name: tl('Bronze Cup'), level: 24, rounds: [['hobgoblin', 'hobgoblin', 'hobgoblin'], ['ogre', 'ogre'], ['magmaslime', 'firebat', 'magmaslime']], prize: 'gale_sandals', gold: 2000 },
  { id: 'silver', name: tl('Silver Cup'), level: 28, rounds: [['revenant', 'revenant'], ['embergolem', 'sphinx'], ['mummy', 'tombpriest', 'mummy']], prize: 'champion_belt', gold: 4000 },
  { id: 'gold', name: tl('Gold Cup'), level: 32, rounds: [['hollowknight', 'nightgaze'], ['chimera', 'wraith'], ['dreadknight', 'dreadknight']], prize: 'sage_circlet', gold: 7000 },
  { id: 'platinum', name: tl('Platinum Cup'), level: 36, rounds: [['astralknight', 'starspawn'], ['voiddrake', 'voiddrake'], ['firstking']], prize: 'phoenix_charm', gold: 12000 },
  { id: 'champion', name: tl('Grand Champion'), level: 42, rounds: [['warden'], ['vesper'], ['leviathan', 'leviathan'], ['wyrm']], prize: 'lantern_crown', gold: 30000 },
  { id: 'eclipse', name: tl('Eclipse Cup'), level: 46, unlock: 'boss_abyss', rounds: [['gloamknight', 'gloamknight'], ['nightmare', 'herald'], ['cinderknight', 'ashgolem', 'cinderknight'], ['orun']], prize: 'eclipse_mantle', gold: 50000 }
];
