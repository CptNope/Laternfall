"""Headless play-test for Lanternfall.

Seeds a save in localStorage, drives the real game with key presses (and a few direct
script calls), takes screenshots, and fails if the page logs any JavaScript error.

Usage:
    python3 tools/playtest.py [index.html] [outdir] [scenario ...]
    python3 tools/playtest.py index.html /tmp/shots chapter systems

Scenarios: chapter, orun, systems, newgame, readme (default: chapter orun systems newgame).
Needs: pip install playwright && playwright install chromium
       (or set CHROME=/path/to/chrome to use an installed browser).
See docs/TESTING.md for what each scenario covers."""
import sys, json, asyncio, os, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(ROOT / 'index.html')
OUT = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'playtest-shots')
SCEN = sys.argv[3:] or ['chapter', 'orun', 'systems', 'newgame']
os.makedirs(OUT, exist_ok=True)

def member(i, lv, w, a, acc=None):
    return {'id': i, 'level': lv, 'xp': 0, 'hp': 9999, 'mp': 999, 'weapon': w, 'armor': a, 'acc': acc}

POST = {
    'party': [member('arin', 45, 'dawnblade', 'dawn_plate'), member('lyra', 45, 'celestia', 'star_robe'),
              member('selene', 45, 'nocturne', 'star_robe'), member('oswin', 45, 'astral_mace', 'mythril_mail'),
              member('kestrel', 45, 'comet_edge', 'shadow_garb')],
    'seen': {}, 'killed': {},
    'inv': {'xpotion': 5, 'megalixir': 2, 'ember_core': 6, 'frost_crystal': 6, 'sun_gold': 5},
    'gold': 90000,
    'flags': {k: True for k in ['q1', 'lantern1', 'bridge', 'oswin', 'lantern2', 'ship', 'metKestrel', 'kestrel', 'lantern3',
                                'selene', 'dawnkey', 'ending', 'boss_spire', 'lantern4', 'airship', 'boss_tomb', 'sunseal',
                                'q_hammer', 'hammer_done', 'visit_A', 'visit_B', 'visit_C', 'visit_D', 'visit_E', 'visit_F']},
    'playTime': 3600, 'mapId': 'world', 'x': 40, 'y': 15, 'dir': 'down',
    'ship': {'x': 40, 'y': 38, 'dir': 'right'}, 'onShip': False, 'lastInn': {'town': 'ironhold'},
    'airship': {'x': 41, 'y': 15, 'dir': 'right'}, 'inAir': False, 'carry': None
}

async def main():
    async with async_playwright() as p:
        chrome = os.environ.get('CHROME')
        b = await p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
        ctx = await b.new_context(viewport={'width': 640, 'height': 480})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)

        async def shot(name):
            await pg.screenshot(path=f'{OUT}/{name}.png'); print('shot', name)
        async def ev(js):
            return await pg.evaluate(js)
        async def press(k='Enter', n=1, d=90):
            for _ in range(n):
                await pg.keyboard.press(k); await pg.wait_for_timeout(d)
        async def until_idle(maxn=300, key='Enter', d=120):
            """press key until no script is running and no UI is open"""
            for i in range(maxn):
                if await ev('Script.running === 0 && UI.stack.length === 0'): return i
                await pg.keyboard.press(key); await pg.wait_for_timeout(d)
            raise Exception('never idle; stack=%s' % await ev('UI.stack.map(c=>c.constructor.name)'))
        async def run(js, settle=200):
            await ev(f'void runScript(async () => {{ {js} }})'); await pg.wait_for_timeout(settle)

        async def boot(save):
            await pg.goto('file://' + PATH)
            await ev(f"localStorage.setItem('lanternfall_save_v1', {json.dumps(json.dumps(save))})")
            await pg.reload(); await pg.wait_for_timeout(900)
            await press('Enter')  # Continue
            await pg.wait_for_timeout(1300)

        want = lambda s: s in SCEN or 'all' in SCEN

        if want('chapter'):
            await boot(POST)
            await pg.wait_for_timeout(1500)
            await shot('01_isle_cutscene')
            n = await until_idle()
            print('isle cutscene presses', n, 'isle=', await ev('G.flags.isle'), 'obj=', await ev('mainObjective().text'))
            # fly the party next to Lastlight to see the island
            await ev("G.x = 77; G.y = 9; G.inAir = false; Field.anim = null")
            await pg.wait_for_timeout(400); await shot('02_ashen_isle')
            await run("await worldMapView()", 500); await shot('03_world_map'); await press('Escape'); await until_idle()
            await run("await enterLocation('G')", 1200); await shot('04_lastlight'); await until_idle()
            await run("await talkIone()", 300); await until_idle()
            print('q_crown', await ev('G.flags.q_crown'), 'lamp', await ev("hasItem('lastlight_lamp')"), 'combo', await ev('G.flags.combo_lastlight'))
            await run("await enterInterior('lastlight', TOWN_DEFS.lastlight.buildings[1])", 900); await shot('05_ward_hall'); await until_idle()
            await run("await changeMap('world', 77, 9, 'down')", 600); await until_idle()
            await run("await enterLocation('7')", 1500); await until_idle(); await shot('06_abyss_1f')
            print('in', await ev('G.mapId'))
            # memory scene on floor 2
            await run("const m = getMap('abyss:1'); await changeMap('abyss:1', m.up.x, m.up.y + 1, 'down')", 700)
            sp = await ev("Field.map.extras.spot")
            print('spot', sp, 'glint', await ev("Field.map.entities.filter(e=>e.kind==='glint').length"))
            await run("await Field.map.entities.find(e=>e.kind==='glint').talk()", 300); await until_idle()
            print('mem1', await ev('G.flags.mem1'))
            # boss: shrink HP so the test finishes
            await ev("MONSTERS.crown.hp = 400; MONSTERS.orun.hp = 400")
            await run("const m = getMap('abyss:3'); const b = m.extras.boss; await changeMap('abyss:3', b.x, b.y + 3, 'up')", 900)
            await shot('07_abyss_boss_room')
            await run("await bossEncounter('abyss')", 400)
            # dialogue then battle: mash Enter (Attack, target) until crown battle shows
            for i in range(40):
                if await ev("G.scene && G.scene.constructor && G.scene.constructor.name === 'Battle'"): break
                await press('Enter', 1, 150)
            await pg.wait_for_timeout(1600); await shot('08_battle_crown')
            n = await until_idle(800, 'Enter', 110)
            print('finale presses', n, 'boss_abyss', await ev('G.flags.boss_abyss'), 'chapter6', await ev('G.flags.chapter6'), 'crown item', await ev("hasItem('twin_crown')"))
            await shot('09_after_chapter')

        if want('orun'):
            s = json.loads(json.dumps(POST)); s['flags'].update({'isle': True, 'q_crown': True, 'abyssOpen': True})
            await boot(s); await until_idle()
            await ev("MONSTERS.orun.hp = 99999")
            await run("await startBattle(['orun'], { boss: true, bg: 'crownfall', music: 'crown' })", 2600)
            await shot('10_battle_orun')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)")
            await until_idle(400, 'Enter', 110)
            await run("await startBattle(['ashhound','cinderwisp','ashgolem'], { bg: 'ash' })", 2600)
            await shot('11_battle_ash'); await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(400, 'Enter', 110)
            await run("await startBattle(['gloamknight','herald','crownshard'], { bg: 'abyss' })", 2600)
            await shot('12_battle_abyss'); await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(400, 'Enter', 110)
            print('drops', await ev("Object.keys(G.inv).filter(k=>ITEMS[k].kind==='mat')"))

        if want('systems'):
            s = json.loads(json.dumps(POST)); s['flags'].update({'isle': True}); s['mapId'] = 'frostmere'; s['x'] = 14; s['y'] = 15; s['dir'] = 'down'
            await boot(s); await until_idle()
            await run("await talkFisher()", 300); await until_idle()
            print('rod', await ev("hasItem('fishing_rod')"))
            # fish in Frostmere's pond: face the water at (15,15)
            await ev("G.x = 14; G.y = 15; G.dir = 'right'")
            await run("await goFishing('frostmere')", 400)
            await shot('13_fishing_wait')
            # wait for the bite then reel: drive the UI directly via its state so the test is deterministic
            for i in range(80):
                st = await ev("(UI.top() && UI.top().state) || null")
                if st == 'bite': await press('Enter', 1, 60); break
                await pg.wait_for_timeout(60)
            await pg.wait_for_timeout(300); await shot('14_fishing_reel')
            for i in range(400):
                top = await ev("(()=>{const u=UI.top(); return u && u.state==='reel' ? [u.pos,u.zone,u.zoneW] : null})()")
                if not top: break
                pos, z, zw = top
                if z + 0.02 < pos < z + zw - 0.02: await pg.keyboard.press('Enter')
                await pg.wait_for_timeout(16)
            await pg.wait_for_timeout(400); await shot('15_fishing_result')
            await until_idle(30, 'Escape')
            print('fish kinds', await ev('fishKinds()'), await ev("Object.keys(G.inv).filter(k=>ITEMS[k].kind==='fish')"))
            # forge
            await run("await changeMap('ironhold', 9, 10, 'up')", 700); await until_idle()
            await run("await talkOrrin()", 300)
            for i in range(10):
                if await ev("UI.top() && UI.top().choices"): break
                await press('Enter', 1, 150)
            await press('Enter', 1, 300); await pg.wait_for_timeout(300)
            await shot('16_forge_menu')
            await press('Enter', 1, 200)  # Forgeheart Ring
            await press('Enter', 6, 200)
            await pg.wait_for_timeout(1800)
            await press('Escape', 4, 200); await until_idle(60, 'Escape')
            print('forge_ring', await ev("hasItem('forge_ring')"), 'forged', await ev('G.flags.forged'))
            # config menu + quest log
            await run("await configMenu()", 400); await press('ArrowRight', 1, 200); await shot('17_config'); await press('Escape', 2); await until_idle(20, 'Escape')
            print('cfg', await ev('JSON.stringify(CFG)'))
            await run("await questMenu()", 400); await shot('18_quests'); await press('Escape', 2); await until_idle(20, 'Escape')
            await run("await openShop('lastlight_arms', 'Armorer')", 300); await press('Enter', 2, 200); await shot('19_lastlight_shop'); await until_idle(40, 'Escape')

        if want('newgame'):
            await pg.goto('file://' + PATH); await ev("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(900)
            await press('Enter')  # New Game
            await pg.wait_for_timeout(15000)
            n = await until_idle(60, 'Enter', 200)
            await shot('20_newgame_brightwater')
            print('newgame map', await ev('G.mapId'), 'party', await ev("G.party.map(m=>m.id+':'+m.level)"), 'isle', await ev('!!G.flags.isle'))
            # walk with dash on: should still move normally
            await ev("CFG.dash = true")
            for k in ['ArrowDown'] * 3 + ['ArrowLeft'] * 2: await press(k, 1, 220)
            print('pos', await ev('[G.x, G.y]'))
            await run("await openMainMenu()", 400); await shot('21_main_menu'); await press('Escape', 3); await until_idle(20, 'Escape')
            # world map before the ending: the isle must still be under the sea
            await run("await changeMap('world', 14, 44, 'down')", 700); await until_idle()
            print('isle tile before ending', await ev("getMap('world').at(79, 9)"), 'G loc hidden', await ev("!G.flags.isle"))
            # early random encounter still works
            await ev("G.encSteps = 0"); await ev("Field.encounterCheck(1)"); await pg.wait_for_timeout(2500)
            await ev("G.scene.enemies && G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            print('after battle scene', await ev("G.scene === Field"))
            # isle encounter (post-ending)
            await ev("G.flags.ending = true; G.flags.isle = true; applyWorldFlags(getMap('world')); G.x = 82; G.y = 10")
            await ev("G.encSteps = 0"); await ev("Field.encounterCheck(1)"); await pg.wait_for_timeout(2500)
            print('isle enemies', await ev("G.scene.enemies && G.scene.enemies.map(e=>e.id)"), 'bg', await ev("G.scene.bg"))
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)

        if want('readme'):
            s2 = json.loads(json.dumps(POST)); s2['flags'].update({'isle': True, 'q_crown': True, 'abyssOpen': True, 'visit_G': True, 'visit_7': True, 'q_fish': True}); s2['inv']['fishing_rod'] = 1
            s2['mapId'] = 'lastlight'; s2['x'] = 11; s2['y'] = 12; s2['dir'] = 'up'
            await boot(s2); await until_idle(); await pg.wait_for_timeout(2800)
            await pg.screenshot(path=f'{OUT}/lastlight.png')
            await run("await changeMap('world', 77, 10, 'right')", 900); await until_idle(); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'{OUT}/ashen-isle.png')
            await run("const m = getMap('abyss:3'); const b = m.extras.boss; await changeMap('abyss:3', b.x, b.y + 3, 'up')", 900); await until_idle(); await pg.wait_for_timeout(2800)
            await pg.screenshot(path=f'{OUT}/crownfall-abyss.png')
            await run("await startBattle(['crown'], { boss: true, bg: 'crownfall', music: 'crown' })", 3200)
            await pg.screenshot(path=f'{OUT}/hollow-crown.png'); await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            await run("await changeMap('brightwater', 14, 15, 'right')", 900); await until_idle(); await pg.wait_for_timeout(2800)
            await run("await goFishing('brightwater')", 300)
            for i in range(80):
                if await ev("(UI.top() && UI.top().state) || null") == 'bite': await press('Enter', 1, 60); break
                await pg.wait_for_timeout(60)
            await pg.wait_for_timeout(500); await pg.screenshot(path=f'{OUT}/fishing.png')

        print('ERRORS:', len(errs))
        for e in errs[:30]: print('  ', e)
        await b.close()
        return len(errs)
sys.exit(1 if asyncio.run(main()) else 0)
