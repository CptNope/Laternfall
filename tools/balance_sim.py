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
        for name, party, gear, bosses, heal in SCENARIOS:
            cfg = {'party': party, 'gear': gear, 'items': ITEMS, 'bosses': bosses, 'runs': RUNS, 'healBetween': heal}
            r = await pg.evaluate('cfg => SIM.fight(cfg)', cfg)
            print(f'{name:38} {r["winRate"]*100:4.0f}% {r["medianRounds"]:>6} ({r["minRounds"]}-{r["maxRounds"]}) {r["kos"]:>8}   {r["avgItems"]}')
        if errs: print('ERRORS', errs[:5])
        await b.close()
asyncio.run(main())
