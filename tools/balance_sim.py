"""Boss balance simulator.

Loads index.html in headless Chrome, injects tools/balance_sim.js (which makes the real battle
code run instantly and plays the party with a simple AI), and fights each scenario many times.

Usage:  python3 tools/balance_sim.py [runs]          (default 40 runs per scenario)
        CHROME=/path/to/chrome python3 tools/balance_sim.py
Prints a table: win rate, median rounds (min–max) and average items used per fight.
The AI is a reasonable player, not a perfect one; treat results as a guide, not gospel."""
import sys, os, json, asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 40

# Loadouts: what a player plausibly has at that point in the game.
SHOP = {  # Lastlight shop gear and common accessories (no superboss loot)
    'arin': {'weapon': 'ashsteel_blade', 'armor': 'ash_mail', 'acc': 'dwarven_band'},
    'lyra': {'weapon': 'cinder_staff', 'armor': 'ash_robe', 'acc': 'silk_ribbon'},
    'oswin': {'weapon': 'ash_mace', 'armor': 'ash_mail', 'acc': 'tide_pendant'},
    'kestrel': {'weapon': 'ash_kris', 'armor': 'ash_garb', 'acc': 'wake_charm'},
    'selene': {'weapon': 'umbral_rod', 'armor': 'ash_robe', 'acc': 'echo_bell'},
}
BEST = {  # optional bosses beaten, forge used, arena won
    'arin': {'weapon': 'lightbringer', 'armor': 'ember_plate', 'acc': 'fifth_flame'},
    'lyra': {'weapon': 'phoenix_staff', 'armor': 'night_weave', 'acc': 'lantern_crown'},
    'oswin': {'weapon': 'tidecaller', 'armor': 'dawn_plate', 'acc': 'phoenix_charm'},
    'kestrel': {'weapon': 'gloamfang', 'armor': 'gloam_leathers', 'acc': 'silk_ribbon'},
    'selene': {'weapon': 'evenstar', 'armor': 'night_weave', 'acc': 'sage_circlet'},
}
MID = {  # endgame of the main story: Spire and tomb loot, arena silver/gold
    'arin': {'weapon': 'dawnblade', 'armor': 'dawn_plate', 'acc': 'champion_belt'},
    'lyra': {'weapon': 'ember_scepter', 'armor': 'star_robe', 'acc': 'silk_ribbon'},
    'oswin': {'weapon': 'seraph_mace', 'armor': 'mythril_mail', 'acc': 'dwarven_band'},
    'kestrel': {'weapon': 'shadow_fang', 'armor': 'shadow_garb', 'acc': 'wake_charm'},
    'selene': {'weapon': 'nocturne', 'armor': 'star_robe', 'acc': 'echo_bell'},
}
NERITH = {  # 1.7: Nerith's shop gear
    'arin': {'weapon': 'coral_blade', 'armor': 'nacre_mail', 'acc': 'dwarven_band'},
    'lyra': {'weapon': 'pearl_staff', 'armor': 'kelp_robe', 'acc': 'silk_ribbon'},
    'oswin': {'weapon': 'reef_mace', 'armor': 'nacre_mail', 'acc': 'pressure_ring'},
    'kestrel': {'weapon': 'eel_fang', 'armor': 'shark_garb', 'acc': 'wake_charm'},
    'selene': {'weapon': 'abyss_orb', 'armor': 'kelp_robe', 'acc': 'echo_bell'},
}
HEARTS = {  # the five hero weapons, forged armour, the Crown of Nerith and Heartlight
    'arin': {'weapon': 'sunbearer', 'armor': 'abyssal_plate', 'acc': 'heartlight'},
    'lyra': {'weapon': 'hearthstaff', 'armor': 'pearl_veil', 'acc': 'tidecrown'},
    'oswin': {'weapon': 'abbots_bell', 'armor': 'abyssal_plate', 'acc': 'pressure_ring'},
    'kestrel': {'weapon': 'pickpocket', 'armor': 'marlin_garb', 'acc': 'silk_ribbon'},
    'selene': {'weapon': 'duskstar', 'armor': 'pearl_veil', 'acc': 'sage_circlet'},
}
ITEMS = {'xpotion': 8, 'hiether': 6, 'plume': 6, 'elixir': 3, 'megalixir': 2, 'remedy': 6}
P4 = lambda lv, ids=('arin', 'lyra', 'oswin', 'selene'): [[i, lv] for i in ids]

SCENARIOS = [
    # name, party, gear, bosses (list of fights), heal between fights
    ('Hollow King (2 phases) Lv32 mid', P4(32, ('arin', 'lyra', 'oswin', 'kestrel')), MID, [['king'], ['king2']], True),
    ('Astral Wyrm Lv36 mid', P4(36), MID, [['wyrm']], False),
    ('Chapter VI finale Lv42 shop', P4(42), SHOP, [['crown'], ['orun']], True),
    ('Chapter VI finale Lv45 shop', P4(45), SHOP, [['crown'], ['orun']], True),
    ('Chapter VI finale Lv42 mid', P4(42), MID, [['crown'], ['orun']], True),
    ('Chapter VI finale Lv45 mid', P4(45), MID, [['crown'], ['orun']], True),
    ('Chapter VI finale Lv50 best', P4(50), BEST, [['crown'], ['orun']], True),
    ('Abyss trash Lv42 shop', P4(42), SHOP, [['gloamknight', 'herald', 'crownshard']], False),
    ('Eclipse Cup final Lv46 mid', P4(46), MID, [['orun']], False),
    # 1.5 Hearts of the Lamplighters: post-game bosses, recommended Lv 44+
    ('Lamp-Eater Lv44 mid', P4(44), MID, [['lampeater']], False),
    ('Hearth Warden Lv44 mid', P4(44), MID, [['hearthwarden']], False),
    ('Drowned Abbot Lv44 mid', P4(44), MID, [['abbot']], False),
    ('Guildmaster Vane Lv44 mid', P4(44, ('arin', 'lyra', 'oswin', 'kestrel')), MID, [['vane']], False),
    ("Vesper's Echo, Selene alone Lv44 mid", [['selene', 44]], MID, [['echo']], False),
    ("Vesper's Echo, Selene alone Lv48 shop", [['selene', 48]], SHOP, [['echo']], False),
    ('Hearts trash Lv44 shop', P4(44), SHOP, [['enforcer', 'cutpurse', 'cutpurse']], False),
    # 1.7 The Drowned Kingdom: the sea floor and palace Lv 46+, the Tide is the superboss (Lv 50, board, meal)
    ('Sea floor trash Lv46 shop', P4(46), SHOP, [['angler', 'lanternjelly']], False),
    ('Palace trash Lv46 nerith', P4(46), NERITH, [['siren', 'coralgolem']], False),
    ('Nereus Lv46 nerith', P4(46), NERITH, [['nereus']], False),
    ('Nereus Lv48 mid', P4(48), MID, [['nereus']], False),
    ('The Tide Lv50 nerith', P4(50), NERITH, [['tide']], False),
    ('The Tide Lv50 hero weapons', P4(50), HEARTS, [['tide']], False),
]

async def main():
    async with async_playwright() as p:
        chrome = os.environ.get('CHROME')
        b = await p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
        pg = await b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + str(ROOT / 'index.html')); await pg.wait_for_timeout(600)
        await pg.add_script_tag(content=(ROOT / 'tools' / 'balance_sim.js').read_text())
        print(f'{"scenario":38} {"win":>5} {"rounds (min-max)":>17} {"KOs":>5}  items used per fight')
        only = os.environ.get('SIM_ONLY', '').lower()   # e.g. SIM_ONLY=nereus to run matching scenarios only
        for name, party, gear, bosses, heal in SCENARIOS:
            if only and only not in name.lower(): continue
            cfg = {'party': party, 'gear': gear, 'items': ITEMS, 'bosses': bosses, 'runs': RUNS, 'healBetween': heal}
            r = await pg.evaluate('cfg => SIM.fight(cfg)', cfg)
            print(f'{name:38} {r["winRate"]*100:4.0f}% {r["medianRounds"]:>6} ({r["minRounds"]}-{r["maxRounds"]}) {r["kos"]:>8}   {r["avgItems"]}')
        if errs: print('ERRORS', errs[:5])
        await b.close()
asyncio.run(main())
