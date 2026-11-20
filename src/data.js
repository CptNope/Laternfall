'use strict';
// ============================================================
//  DATA — heroes, spells, items, monsters, encounters, shops
// ============================================================
const HEROES = {
  arin: {
    name: 'Arin', cls: 'Lamplighter', skill: 'Valor',
    base: { hp: 62, mp: 10, str: 12, def: 8, mag: 5, spd: 8 },
    grow: { hp: 14, mp: 1.8, str: 2.4, def: 1.8, mag: 0.9, spd: 1.0 },
    spells: [['cure', 3], ['sunstrike', 6], ['rally', 11], ['valor', 18]],
    look: { skin: '#f1c9a0', hair: '#7a3e1d', style: 'spiky', body: '#2e5fb8', accent: '#e8c24a', cape: '#b8322e', weapon: 'sword' },
    start: { weapon: 'bronze_sword', armor: 'leather' },
    bio: 'A young lamplighter of Brightwater. Steady hand, stubborn heart.'
  },
  lyra: {
    name: 'Lyra', cls: 'Flamecaller', skill: 'Magic',
    base: { hp: 42, mp: 22, str: 6, def: 5, mag: 13, spd: 9 },
    grow: { hp: 9.5, mp: 4, str: 1.0, def: 1.1, mag: 2.6, spd: 1.1 },
    spells: [['fire', 1], ['ice', 2], ['bolt', 4], ['fira', 9], ['blizzara', 11], ['thundara', 13], ['flare', 20], ['starfall', 24]],
    look: { skin: '#f6d6b8', hair: '#c9472f', style: 'long', body: '#7b3fa8', accent: '#f0d36a', hat: 'witch', weapon: 'staff' },
    start: { weapon: 'oak_staff', armor: 'cloth_robe' },
    bio: 'Arin\'s oldest friend. Talks to fire like it is a stubborn cat.'
  },
  oswin: {
    name: 'Oswin', cls: 'Tide Priest', skill: 'Prayer',
    base: { hp: 50, mp: 20, str: 9, def: 8, mag: 11, spd: 7 },
    grow: { hp: 11.5, mp: 3.4, str: 1.5, def: 1.6, mag: 2.2, spd: 0.9 },
    spells: [['cure', 1], ['purify', 1], ['cura', 7], ['raise', 9], ['barrier', 12], ['holy', 15], ['curaga', 19]],
    look: { skin: '#e2b48c', hair: '#d8d8d8', style: 'bald', body: '#e9ecf2', accent: '#3a8fd0', beard: true, weapon: 'mace' },
    start: { weapon: 'iron_mace', armor: 'silk_robe' },
    bio: 'An old priest of the sea who dreams of things before they happen.'
  },
  kestrel: {
    name: 'Kestrel', cls: 'Rogue', skill: 'Tricks',
    base: { hp: 52, mp: 12, str: 11, def: 6, mag: 6, spd: 14 },
    grow: { hp: 12, mp: 1.8, str: 2.3, def: 1.3, mag: 1.0, spd: 1.6 },
    spells: [['steal', 1], ['twin', 1], ['smoke', 1], ['venom', 14], ['shadowstep', 20]],
    look: { skin: '#c98e62', hair: '#1f1b2e', style: 'pony', body: '#2f6b4a', accent: '#c7c7c7', hood: true, weapon: 'dagger' },
    start: { weapon: 'steel_dagger', armor: 'thief_vest' },
    bio: 'A quick-fingered thief from the Ironhold undercity. Owes nobody.'
  }
};

// type: dmg (magic), phys (physical skill), heal, revive, buff, cure, steal, escape
const SPELLS = {
  cure: { name: 'Cure', mp: 4, type: 'heal', power: 22, target: 'ally', fx: 'heal', desc: 'Restore HP to one ally.' },
  cura: { name: 'Cura', mp: 9, type: 'heal', power: 26, scale: 0.75, target: 'allies', fx: 'heal', desc: 'Restore HP to all allies.' },
  curaga: { name: 'Curaga', mp: 18, type: 'heal', power: 60, scale: 1.3, target: 'allies', fx: 'heal', desc: 'Greatly restore all allies.' },
  purify: { name: 'Purify', mp: 2, type: 'cure', target: 'ally', fx: 'heal', desc: 'Cure poison.' },
  raise: { name: 'Raise', mp: 14, type: 'revive', target: 'ally', fx: 'holy', desc: 'Revive a fallen ally.' },
  barrier: { name: 'Barrier', mp: 10, type: 'buff', buff: 'barrier', target: 'allies', fx: 'buff', desc: 'Raise party defense for a time.' },
  rally: { name: 'Rally', mp: 8, type: 'buff', buff: 'rally', target: 'allies', fx: 'buff', desc: 'Raise party attack for a time.' },
  holy: { name: 'Holy', mp: 16, type: 'dmg', elem: 'holy', power: 70, target: 'enemy', fx: 'holy', desc: 'Searing holy light on one foe.' },
  sunstrike: { name: 'Sunstrike', mp: 5, type: 'phys', elem: 'holy', power: 1.6, target: 'enemy', fx: 'holy', desc: 'A blade of sunlight. Strong vs. undead.' },
  valor: { name: 'Lionheart', mp: 14, type: 'phys', elem: 'holy', power: 2.8, target: 'enemy', fx: 'holy', desc: 'Arin\'s finest stroke.' },
  fire: { name: 'Fire', mp: 4, type: 'dmg', elem: 'fire', power: 10, target: 'enemy', fx: 'fire', desc: 'Flames on one foe.' },
  ice: { name: 'Ice', mp: 4, type: 'dmg', elem: 'ice', power: 10, target: 'enemy', fx: 'ice', desc: 'Frost on one foe.' },
  bolt: { name: 'Bolt', mp: 5, type: 'dmg', elem: 'bolt', power: 12, target: 'enemy', fx: 'bolt', desc: 'Lightning on one foe.' },
  fira: { name: 'Fira', mp: 10, type: 'dmg', elem: 'fire', power: 26, target: 'enemies', fx: 'fire', desc: 'Flames on all foes.' },
  blizzara: { name: 'Blizzara', mp: 10, type: 'dmg', elem: 'ice', power: 26, target: 'enemies', fx: 'ice', desc: 'Frost on all foes.' },
  thundara: { name: 'Thundara', mp: 12, type: 'dmg', elem: 'bolt', power: 30, target: 'enemies', fx: 'bolt', desc: 'Lightning on all foes.' },
  flare: { name: 'Flare', mp: 24, type: 'dmg', elem: 'none', power: 120, target: 'enemy', fx: 'flare', desc: 'A star\'s heart, unleashed.' },
  starfall: { name: 'Starfall', mp: 36, type: 'dmg', elem: 'none', power: 85, target: 'enemies', fx: 'flare', desc: 'Call down the sky.' },
  steal: { name: 'Steal', mp: 0, type: 'steal', target: 'enemy', fx: 'none', desc: 'Lift an item from a foe.' },
  twin: { name: 'Twin Strike', mp: 4, type: 'phys', hits: 2, power: 0.8, target: 'enemy', fx: 'slash', desc: 'Two quick cuts.' },
  smoke: { name: 'Smoke Bomb', mp: 3, type: 'escape', target: 'self', fx: 'none', desc: 'Guaranteed escape (not from bosses).' },
  venom: { name: 'Venom Edge', mp: 7, type: 'phys', power: 1.3, poison: true, target: 'enemy', fx: 'poison', desc: 'Strike and poison.' },
  shadowstep: { name: 'Shadowstep', mp: 15, type: 'phys', hits: 3, power: 0.9, target: 'enemy', fx: 'slash', desc: 'Three strikes from nowhere.' },
  // enemy abilities
  e_spores: { name: 'Spore Cloud', type: 'dmg', elem: 'none', power: 6, target: 'allies', fx: 'poison', poison: 0.5 },
  e_bite: { name: 'Venom Bite', type: 'phys', power: 1.1, target: 'ally', fx: 'slash', poison: 0.6 },
  e_slam: { name: 'Slam', type: 'phys', power: 1.5, target: 'ally', fx: 'hit' },
  e_cleave: { name: 'Cleave', type: 'phys', power: 0.9, target: 'allies', fx: 'slash' },
  e_fire: { name: 'Fire', type: 'dmg', elem: 'fire', power: 14, target: 'ally', fx: 'fire' },
  e_ice: { name: 'Ice', type: 'dmg', elem: 'ice', power: 14, target: 'ally', fx: 'ice' },
  e_bolt: { name: 'Bolt', type: 'dmg', elem: 'bolt', power: 16, target: 'ally', fx: 'bolt' },
  e_blaze: { name: 'Blaze', type: 'dmg', elem: 'fire', power: 10, target: 'allies', fx: 'fire' },
  e_frost: { name: 'Frost Breath', type: 'dmg', elem: 'ice', power: 10, target: 'allies', fx: 'ice' },
  e_tidal: { name: 'Tidal Wave', type: 'dmg', elem: 'water', power: 8, target: 'allies', fx: 'water' },
  e_shadow: { name: 'Shadow Bolt', type: 'dmg', elem: 'dark', power: 30, target: 'ally', fx: 'dark' },
  e_night: { name: 'Hollow Night', type: 'dmg', elem: 'dark', power: 4, target: 'allies', fx: 'dark' },
  e_drain: { name: 'Drain', type: 'dmg', elem: 'dark', power: 18, target: 'ally', fx: 'dark', drain: true },
  e_eclipse: { name: 'Eclipse', type: 'dmg', elem: 'dark', power: 0, target: 'allies', fx: 'dark' },
  e_doom: { name: 'Crown of Ash', type: 'dmg', elem: 'dark', power: 70, target: 'ally', fx: 'dark' },
  e_gaze: { name: 'Gaze', type: 'dmg', elem: 'dark', power: 22, target: 'ally', fx: 'dark' },
  e_heal: { name: 'Mend', type: 'heal', power: 30, target: 'self', fx: 'heal' }
};

// items
const ITEMS = {
  potion: { name: 'Potion', price: 20, kind: 'use', effect: 'hp', amount: 60, target: 'ally', desc: 'Restores 60 HP.' },
  hipotion: { name: 'Hi-Potion', price: 120, kind: 'use', effect: 'hp', amount: 180, target: 'ally', desc: 'Restores 180 HP.' },
  xpotion: { name: 'X-Potion', price: 600, kind: 'use', effect: 'hp', amount: 9999, target: 'ally', desc: 'Fully restores HP.' },
  ether: { name: 'Ether', price: 160, kind: 'use', effect: 'mp', amount: 40, target: 'ally', desc: 'Restores 40 MP.' },
  hiether: { name: 'Hi-Ether', price: 700, kind: 'use', effect: 'mp', amount: 9999, target: 'ally', desc: 'Fully restores MP.' },
  antidote: { name: 'Antidote', price: 15, kind: 'use', effect: 'cure', target: 'ally', desc: 'Cures poison.' },
  plume: { name: 'Phoenix Plume', price: 180, kind: 'use', effect: 'revive', target: 'ally', desc: 'Revives a fallen ally.' },
  tent: { name: 'Tent', price: 120, kind: 'use', effect: 'tent', target: 'none', field: 'world', desc: 'Rest on the world map. Restores the party.' },
  elixir: { name: 'Elixir', price: 0, kind: 'use', effect: 'elixir', target: 'ally', desc: 'Fully restores HP and MP.' },
  megalixir: { name: 'Megalixir', price: 0, kind: 'use', effect: 'megalixir', target: 'allies', desc: 'Fully restores the whole party.' },
  bomb: { name: 'Ember Bomb', price: 90, kind: 'use', effect: 'bomb', amount: 90, target: 'enemies', battleOnly: true, desc: 'Deals fire damage to all foes.' },
  // weapons
  bronze_sword: { name: 'Bronze Sword', price: 60, kind: 'weapon', who: ['arin'], atk: 5, desc: 'A village blade.' },
  iron_sword: { name: 'Iron Sword', price: 380, kind: 'weapon', who: ['arin'], atk: 13, desc: 'Honest iron.' },
  steel_sword: { name: 'Steel Sword', price: 1600, kind: 'weapon', who: ['arin'], atk: 24, desc: 'Dwarf-forged steel.' },
  mythril_sword: { name: 'Mythril Sword', price: 0, kind: 'weapon', who: ['arin'], atk: 36, desc: 'Light as a feather.' },
  dawnblade: { name: 'Dawnblade', price: 0, kind: 'weapon', who: ['arin'], atk: 54, mag: 8, desc: 'Forged from the first light.' },
  oak_staff: { name: 'Oak Staff', price: 50, kind: 'weapon', who: ['lyra'], atk: 2, mag: 3, desc: 'Gnarled and warm.' },
  mage_staff: { name: 'Mage Staff', price: 360, kind: 'weapon', who: ['lyra'], atk: 4, mag: 8, desc: 'Channels the arcane.' },
  rune_staff: { name: 'Rune Staff', price: 1500, kind: 'weapon', who: ['lyra'], atk: 7, mag: 15, desc: 'Carved with old runes.' },
  star_rod: { name: 'Star Rod', price: 0, kind: 'weapon', who: ['lyra'], atk: 10, mag: 25, desc: 'Hums with starlight.' },
  ember_scepter: { name: 'Ember Scepter', price: 0, kind: 'weapon', who: ['lyra'], atk: 14, mag: 38, desc: 'The first flame, tamed.' },
  iron_mace: { name: 'Iron Mace', price: 320, kind: 'weapon', who: ['oswin'], atk: 9, mag: 4, desc: 'Blessed iron.' },
  steel_mace: { name: 'Steel Mace', price: 1400, kind: 'weapon', who: ['oswin'], atk: 17, mag: 8, desc: 'Heavy and sure.' },
  tide_mace: { name: 'Tide Mace', price: 0, kind: 'weapon', who: ['oswin'], atk: 27, mag: 16, desc: 'Sings like the sea.' },
  seraph_mace: { name: 'Seraph Mace', price: 0, kind: 'weapon', who: ['oswin'], atk: 38, mag: 26, desc: 'Shines in the dark.' },
  steel_dagger: { name: 'Steel Dagger', price: 1200, kind: 'weapon', who: ['kestrel'], atk: 20, desc: 'Quick and quiet.' },
  mythril_knife: { name: 'Mythril Knife', price: 0, kind: 'weapon', who: ['kestrel'], atk: 32, spd: 3, desc: 'A whisper of an edge.' },
  shadow_fang: { name: 'Shadow Fang', price: 0, kind: 'weapon', who: ['kestrel'], atk: 46, spd: 6, desc: 'Cuts the space between moments.' },
  // armor
  leather: { name: 'Leather Armor', price: 50, kind: 'armor', who: ['arin', 'kestrel', 'oswin'], def: 3, desc: 'Basic protection.' },
  cloth_robe: { name: 'Cloth Robe', price: 40, kind: 'armor', who: ['lyra', 'oswin'], def: 2, mag: 1, desc: 'Simple robe.' },
  chain_mail: { name: 'Chain Mail', price: 450, kind: 'armor', who: ['arin', 'oswin'], def: 9, desc: 'Rings of iron.' },
  silk_robe: { name: 'Silk Robe', price: 340, kind: 'armor', who: ['lyra', 'oswin'], def: 6, mag: 3, desc: 'Fine silk, lightly warded.' },
  plate: { name: 'Plate Armor', price: 2000, kind: 'armor', who: ['arin', 'oswin'], def: 16, desc: 'Full plate.' },
  sage_robe: { name: 'Sage Robe', price: 1500, kind: 'armor', who: ['lyra', 'oswin'], def: 12, mag: 7, desc: 'Woven with wisdom.' },
  thief_vest: { name: 'Thief Vest', price: 1300, kind: 'armor', who: ['kestrel'], def: 12, spd: 3, desc: 'Lots of pockets.' },
  mythril_mail: { name: 'Mythril Mail', price: 0, kind: 'armor', who: ['arin', 'oswin'], def: 25, desc: 'Shimmering mail.' },
  star_robe: { name: 'Star Robe', price: 0, kind: 'armor', who: ['lyra', 'oswin'], def: 20, mag: 14, desc: 'The night sky, sewn.' },
  shadow_garb: { name: 'Shadow Garb', price: 0, kind: 'armor', who: ['kestrel'], def: 22, spd: 7, desc: 'Drinks the light.' },
  dawn_plate: { name: 'Dawn Plate', price: 0, kind: 'armor', who: ['arin', 'oswin'], def: 35, desc: 'Warm to the touch.' }
};

// monsters
// fam: slime, bat, beast, goblin, skeleton, knight, ogre, plant, serpent, ghost, crab, golem, imp, eye, witch | bosses
const MONSTERS = {
  slime: { name: 'Green Slime', fam: 'slime', c: ['#5fd16a', '#2f8a3a'], hp: 22, atk: 13, def: 2, mag: 4, spd: 5, xp: 6, gold: 5, weak: ['fire'], drop: ['potion', 0.12], steal: 'potion' },
  bat: { name: 'Cave Bat', fam: 'bat', c: ['#6b5a8a', '#3c2f55'], hp: 18, atk: 15, def: 1, mag: 2, spd: 12, xp: 7, gold: 4, weak: ['bolt'], steal: 'potion' },
  goblin: { name: 'Goblin', fam: 'goblin', c: ['#8fb34a', '#7a4b2a'], hp: 34, atk: 17, def: 4, mag: 2, spd: 8, xp: 10, gold: 9, drop: ['potion', 0.15], steal: 'antidote' },
  wolf: { name: 'Wild Wolf', fam: 'beast', c: ['#8a8070', '#5a5045'], hp: 30, atk: 19, def: 3, mag: 2, spd: 13, xp: 11, gold: 6, weak: ['fire'], steal: 'potion' },
  sporecap: { name: 'Spore Cap', fam: 'plant', c: ['#c0503a', '#efe2c4'], hp: 50, atk: 22, def: 6, mag: 10, spd: 6, xp: 18, gold: 12, weak: ['fire'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_spores' }], drop: ['antidote', 0.25], steal: 'antidote' },
  shadebat: { name: 'Shade Bat', fam: 'bat', c: ['#3a3a5a', '#1c1c30'], hp: 42, atk: 26, def: 5, mag: 4, spd: 14, xp: 17, gold: 10, weak: ['bolt'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_bite' }], steal: 'potion' },
  rootcrawler: { name: 'Root Crawler', fam: 'serpent', c: ['#7a5a32', '#4a3a1a'], hp: 66, atk: 25, def: 10, mag: 4, spd: 7, xp: 22, gold: 15, weak: ['fire'], drop: ['potion', 0.2], steal: 'potion' },
  gloomcap: { name: 'Gloomcap', fam: 'gloomcap', boss: true, size: 1.6, c: ['#5a2f7a', '#e4d6f2', '#b6f25a'], hp: 520, atk: 35, def: 16, mag: 22, spd: 8, xp: 300, gold: 250, weak: ['fire'], acts: [{ w: 3, a: 'attack' }, { w: 2, a: 'e_spores' }, { w: 1, a: 'e_slam' }], steal: 'ether' },
  blueslime: { name: 'Gel Slime', fam: 'slime', c: ['#4aa8e8', '#1f5f9a'], hp: 70, atk: 34, def: 10, mag: 10, spd: 8, xp: 26, gold: 20, weak: ['bolt'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_ice' }], steal: 'potion' },
  hobgoblin: { name: 'Hobgoblin', fam: 'goblin', c: ['#c46a3a', '#3a3a3a'], hp: 95, atk: 41, def: 14, mag: 4, spd: 9, xp: 34, gold: 28, drop: ['hipotion', 0.1], steal: 'hipotion' },
  harpy: { name: 'Harpy', fam: 'bat', c: ['#d89a5a', '#8a4a2a'], hp: 80, atk: 39, def: 9, mag: 6, spd: 16, xp: 30, gold: 22, weak: ['bolt'], steal: 'potion' },
  sandcrab: { name: 'Sand Crab', fam: 'crab', c: ['#e07a4a', '#8a3a1a'], hp: 110, atk: 37, def: 26, mag: 4, spd: 6, xp: 36, gold: 30, weak: ['bolt'], steal: 'antidote' },
  drowned: { name: 'Drowned One', fam: 'skeleton', c: ['#7fa8a0', '#2f5a55'], hp: 140, atk: 49, def: 18, mag: 8, spd: 8, xp: 50, gold: 35, weak: ['holy', 'fire'], drop: ['hipotion', 0.15], steal: 'ether' },
  tideserpent: { name: 'Tide Serpent', fam: 'serpent', c: ['#2f8ac0', '#13406a'], hp: 160, atk: 53, def: 20, mag: 20, spd: 11, xp: 58, gold: 40, weak: ['bolt'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_tidal' }], steal: 'hipotion' },
  wisp: { name: 'Will-o-Wisp', fam: 'ghost', c: ['#9ad8ff', '#3a6aa0'], hp: 100, atk: 30, def: 30, mag: 38, spd: 13, xp: 52, gold: 32, weak: ['holy', 'fire'], acts: [{ w: 1, a: 'attack' }, { w: 2, a: 'e_ice' }], steal: 'ether' },
  warden: { name: 'Drowned Warden', fam: 'warden', boss: true, size: 1.7, c: ['#2a6a7a', '#c8d8c0', '#5af0d0'], hp: 1900, atk: 80, def: 32, mag: 55, spd: 10, xp: 1200, gold: 900, weak: ['bolt'], acts: [{ w: 3, a: 'attack' }, { w: 2, a: 'e_tidal' }, { w: 1, a: 'e_cleave' }], steal: 'hiether' },
  seaserpent: { name: 'Sea Serpent', fam: 'serpent', c: ['#1f7a6a', '#0c3a35'], hp: 200, atk: 60, def: 24, mag: 30, spd: 12, xp: 70, gold: 50, weak: ['bolt'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_tidal' }], steal: 'hipotion' },
  kingcrab: { name: 'King Crab', fam: 'crab', c: ['#c03a3a', '#5a1010'], hp: 240, atk: 62, def: 40, mag: 6, spd: 7, xp: 78, gold: 60, weak: ['bolt'], steal: 'hipotion' },
  frostwolf: { name: 'Frost Wolf', fam: 'beast', c: ['#d8e8f8', '#7a98b8'], hp: 220, atk: 68, def: 28, mag: 20, spd: 18, xp: 85, gold: 55, weak: ['fire'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_frost' }], steal: 'hipotion' },
  icegolem: { name: 'Ice Golem', fam: 'golem', c: ['#a8d8f0', '#4a7a9a', '#e8ffff'], hp: 340, atk: 76, def: 48, mag: 10, spd: 6, xp: 110, gold: 80, weak: ['fire'], steal: 'ether' },
  snowimp: { name: 'Snow Imp', fam: 'imp', c: ['#7ac8e8', '#2a5a8a'], hp: 180, atk: 52, def: 22, mag: 58, spd: 16, xp: 90, gold: 70, weak: ['fire'], acts: [{ w: 1, a: 'attack' }, { w: 2, a: 'e_ice' }], steal: 'ether' },
  ogre: { name: 'Ogre', fam: 'ogre', c: ['#9a8a5a', '#5a4a2a'], hp: 300, atk: 86, def: 34, mag: 5, spd: 8, xp: 120, gold: 110, acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_slam' }], drop: ['hipotion', 0.25], steal: 'hipotion' },
  magmaslime: { name: 'Magma Slime', fam: 'slime', c: ['#ff7a2a', '#a02a0a'], hp: 320, atk: 84, def: 40, mag: 60, spd: 10, xp: 150, gold: 100, weak: ['ice'], acts: [{ w: 2, a: 'attack' }, { w: 1, a: 'e_fire' }], steal: 'bomb' },
  firebat: { name: 'Fire Bat', fam: 'bat', c: ['#e8502a', '#7a1a0a'], hp: 260, atk: 88, def: 30, mag: 40, spd: 28, xp: 140, gold: 90, weak: ['ice'], steal: 'bomb' },
  revenant: { name: 'Dwarf Revenant', fam: 'skeleton', c: ['#e8dcc0', '#7a5a3a'], hp: 420, atk: 98, def: 54, mag: 20, spd: 12, xp: 180, gold: 130, weak: ['holy'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_cleave' }], drop: ['ether', 0.15], steal: 'hiether' },
  embergolem: { name: 'Ember Golem', fam: 'golem', c: ['#5a3a2a', '#2a1a10', '#ff8a2a'], hp: 520, atk: 104, def: 68, mag: 50, spd: 7, xp: 220, gold: 160, weak: ['ice'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_blaze' }], steal: 'xpotion' },
  vesper: { name: 'Vesper', fam: 'witch', boss: true, size: 1.5, c: ['#1a1030', '#c04aa8', '#ffd0f0'], hp: 5000, atk: 115, def: 48, mag: 104, spd: 24, xp: 4000, gold: 3000, weak: ['holy'], acts: [{ w: 2, a: 'attack' }, { w: 3, a: 'e_shadow' }, { w: 2, a: 'e_night' }, { w: 1, a: 'e_drain' }], steal: 'elixir' },
  hollowknight: { name: 'Hollow Knight', fam: 'knight', c: ['#3a3048', '#1a1424', '#c070ff'], hp: 700, atk: 138, def: 80, mag: 30, spd: 14, xp: 300, gold: 220, weak: ['holy'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_cleave' }], drop: ['hipotion', 0.25], steal: 'xpotion' },
  nightgaze: { name: 'Night Gaze', fam: 'eye', c: ['#e8e0f0', '#5a2a8a', '#ff3a6a'], hp: 520, atk: 80, def: 50, mag: 118, spd: 18, xp: 280, gold: 200, weak: ['bolt'], acts: [{ w: 1, a: 'attack' }, { w: 2, a: 'e_gaze' }], steal: 'hiether' },
  wraith: { name: 'Shade Wraith', fam: 'ghost', c: ['#6a4a9a', '#20103a'], hp: 600, atk: 118, def: 60, mag: 100, spd: 20, xp: 290, gold: 210, weak: ['holy'], acts: [{ w: 2, a: 'attack' }, { w: 1, a: 'e_drain' }], steal: 'ether' },
  chimera: { name: 'Chimera', fam: 'beast', size: 1.3, c: ['#b8803a', '#5a2a1a'], hp: 900, atk: 148, def: 66, mag: 90, spd: 16, xp: 350, gold: 260, weak: ['ice'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_blaze' }], steal: 'xpotion' },
  voidslime: { name: 'Void Slime', fam: 'slime', c: ['#4a2a7a', '#100828'], hp: 780, atk: 140, def: 70, mag: 110, spd: 15, xp: 320, gold: 240, weak: ['holy'], acts: [{ w: 2, a: 'attack' }, { w: 1, a: 'e_shadow' }], steal: 'hiether' },
  dreadknight: { name: 'Dread Knight', fam: 'knight', c: ['#5a1a2a', '#200810', '#ff4a4a'], hp: 1000, atk: 160, def: 88, mag: 40, spd: 15, xp: 420, gold: 320, weak: ['holy'], acts: [{ w: 3, a: 'attack' }, { w: 1, a: 'e_cleave' }], drop: ['xpotion', 0.15], steal: 'megalixir' },
  king: { name: 'The Hollow King', fam: 'king', boss: true, size: 1.3, c: ['#120a20', '#e8c84a', '#8a3aff'], hp: 6500, atk: 165, def: 82, mag: 135, spd: 28, xp: 0, gold: 0, acts: [{ w: 3, a: 'attack' }, { w: 2, a: 'e_doom' }, { w: 2, a: 'e_eclipse' }, { w: 1, a: 'e_cleave' }], steal: 'megalixir' },
  king2: { name: 'Hollow King, Unbound', fam: 'king2', boss: true, size: 1.3, c: ['#05020a', '#ff5ac8', '#5affe8'], hp: 5200, atk: 175, def: 78, mag: 148, spd: 32, xp: 0, gold: 0, acts: [{ w: 2, a: 'attack' }, { w: 2, a: 'e_doom' }, { w: 2, a: 'e_eclipse' }, { w: 1, a: 'e_drain' }, { w: 1, a: 'e_frost' }, { w: 1, a: 'e_blaze' }], steal: 'megalixir' }
};

const ENCOUNTERS = {
  r1: [{ w: 3, g: ['slime', 'slime'] }, { w: 2, g: ['bat', 'bat', 'bat'] }, { w: 3, g: ['goblin'] }, { w: 2, g: ['goblin', 'slime'] }, { w: 2, g: ['wolf'] }, { w: 1, g: ['wolf', 'wolf'] }, { w: 1, g: ['slime', 'slime', 'slime'] }],
  d1: [{ w: 3, g: ['sporecap', 'shadebat'] }, { w: 2, g: ['shadebat', 'shadebat'] }, { w: 2, g: ['rootcrawler'] }, { w: 2, g: ['sporecap', 'sporecap'] }, { w: 1, g: ['rootcrawler', 'shadebat'] }, { w: 1, g: ['goblin', 'goblin', 'sporecap'] }],
  r2: [{ w: 3, g: ['blueslime', 'blueslime'] }, { w: 2, g: ['hobgoblin'] }, { w: 2, g: ['harpy', 'harpy'] }, { w: 2, g: ['sandcrab'] }, { w: 2, g: ['hobgoblin', 'blueslime'] }, { w: 1, g: ['harpy', 'sandcrab', 'harpy'] }],
  d2: [{ w: 3, g: ['drowned', 'drowned'] }, { w: 2, g: ['tideserpent'] }, { w: 2, g: ['wisp', 'wisp'] }, { w: 2, g: ['drowned', 'wisp'] }, { w: 1, g: ['tideserpent', 'wisp'] }, { w: 1, g: ['drowned', 'drowned', 'drowned'] }],
  sea: [{ w: 3, g: ['seaserpent'] }, { w: 2, g: ['kingcrab'] }, { w: 2, g: ['seaserpent', 'harpy'] }, { w: 1, g: ['kingcrab', 'kingcrab'] }],
  r3: [{ w: 3, g: ['frostwolf', 'frostwolf'] }, { w: 2, g: ['icegolem'] }, { w: 2, g: ['snowimp', 'snowimp'] }, { w: 2, g: ['ogre'] }, { w: 1, g: ['ogre', 'snowimp'] }, { w: 1, g: ['frostwolf', 'snowimp', 'frostwolf'] }],
  d3: [{ w: 3, g: ['magmaslime', 'firebat'] }, { w: 2, g: ['revenant'] }, { w: 2, g: ['firebat', 'firebat'] }, { w: 2, g: ['embergolem'] }, { w: 1, g: ['revenant', 'magmaslime'] }, { w: 1, g: ['revenant', 'revenant'] }],
  r4: [{ w: 3, g: ['hollowknight'] }, { w: 2, g: ['nightgaze', 'wraith'] }, { w: 2, g: ['wraith', 'wraith'] }, { w: 2, g: ['chimera'] }, { w: 1, g: ['hollowknight', 'nightgaze'] }],
  d4: [{ w: 3, g: ['voidslime', 'wraith'] }, { w: 2, g: ['dreadknight'] }, { w: 2, g: ['nightgaze', 'nightgaze'] }, { w: 2, g: ['hollowknight', 'voidslime'] }, { w: 1, g: ['chimera', 'nightgaze'] }, { w: 1, g: ['dreadknight', 'wraith'] }]
};

const SHOPS = {
  brightwater_items: ['potion', 'antidote', 'plume', 'tent'],
  brightwater_arms: ['bronze_sword', 'oak_staff', 'leather', 'cloth_robe'],
  halden_items: ['potion', 'hipotion', 'ether', 'antidote', 'plume', 'tent', 'bomb'],
  halden_arms: ['iron_sword', 'mage_staff', 'iron_mace', 'chain_mail', 'silk_robe'],
  ironhold_items: ['hipotion', 'xpotion', 'ether', 'hiether', 'antidote', 'plume', 'tent', 'bomb'],
  ironhold_arms: ['steel_sword', 'rune_staff', 'steel_mace', 'steel_dagger', 'plate', 'sage_robe', 'thief_vest']
};

function xpForLevel(L) { return L <= 1 ? 0 : Math.round(8 * Math.pow(L - 1, 2.3) + 12 * (L - 1)); }
const MAX_LEVEL = 40;
