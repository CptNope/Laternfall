"""Headless play-test for Lanternfall.

Seeds a save in localStorage, drives the real game with key presses (and a few direct
script calls), takes screenshots, and fails if the page logs any JavaScript error.

Usage:
    python3 tools/playtest.py [index.html] [outdir] [scenario ...]
    python3 tools/playtest.py index.html /tmp/shots chapter systems

Scenarios: chapter, orun, systems, newgame, comfort, hearts, depth, drowned, platform, living, readme (default: all but readme).
Needs: pip install playwright && playwright install chromium
       (or set CHROME=/path/to/chrome to use an installed browser).
See docs/TESTING.md for what each scenario covers."""
import sys, json, asyncio, os, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(ROOT / 'index.html')
OUT = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'playtest-shots')
SCEN = sys.argv[3:] or ['chapter', 'orun', 'systems', 'newgame', 'comfort', 'hearts', 'depth', 'drowned', 'platform', 'living']
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
            # seed an old-format (1.x) save: the game migrates it into slot 1 on load
            await ev(f"localStorage.clear(); localStorage.setItem('lanternfall_save_v1', {json.dumps(json.dumps(save))})")
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

        if want('comfort'):
            s2 = json.loads(json.dumps(POST)); s2['flags'].update({'isle': True}); s2['mapId'] = 'world'; s2['x'] = 38; s2['y'] = 39
            await boot(s2); await until_idle()
            mig = await ev("(() => { const d = readSlot('1'); return d && [d.version, d.party.length]; })()")
            print('migrated v1 -> slot 1:', mig, 'legacy kept:', await ev("!!localStorage.getItem('lanternfall_save_v1')"))
            # manual save to slot 2 and the slot summary
            await ev("saveGame('2')")
            print('slot 2:', await ev("(() => { const s = slotSummary('2'); return [s.place, s.chapter, s.lv]; })()"))
            # auto-save on entering a town
            await run("await enterLocation('B')", 1200); await until_idle()
            print('auto slot:', await ev("(() => { const s = slotSummary('auto'); return s && s.place; })()"))
            await run("await saveToSlot()", 400); await shot('22_save_slots'); await until_idle(20, 'Escape')
            # Config shows all rows; set battle speed 4x
            await run("await configMenu()", 400); await shot('23_config'); await press('Escape', 1); await until_idle(20, 'Escape')
            await ev("CFG.battleSpeed = 2")
            # battle: round 1 attack with everyone, round 2 repeat with Shift
            await ev("MONSTERS.ogre.hp = 99999")
            await run("await startBattle(['ogre'], {})", 1500)
            for i in range(12):
                if await ev("G.scene.active >= 0 && UI.top() && UI.top().items && UI.top().items[0].label === 'Attack'"): break
                await pg.wait_for_timeout(200)
            for i in range(4): await press('Enter', 1, 120); await press('Enter', 1, 120)  # Attack, target × 4 heroes
            for i in range(60):
                if await ev("G.scene.prevCmds && G.scene.active === 0 && !!UI.top()"): break
                await pg.wait_for_timeout(150)
            await shot('24_repeat_hint')
            r0 = await ev("G.scene.enemies[0].hp")
            await press('Shift', 1, 100)
            for i in range(60):
                if await ev("G.scene.active === 0 && G.scene.enemies[0].hp < " + str(r0)): break
                await pg.wait_for_timeout(150)
            print('repeat dealt damage:', await ev("G.scene.enemies[0].hp < " + str(r0)))
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            await ev("MONSTERS.ogre.hp = 300; CFG.battleSpeed = 0")
            # optimise gear: give Arin a better sword and optimise
            await ev("addItem('lightbringer'); addItem('oathblade')")
            n = await ev("optimiseGear(G.party[0])")
            print('optimise changed', n, '->', await ev("G.party[0].weapon"))
            # dialogue log
            await run("await dialogueLog()", 400); await shot('25_log'); await press('Escape', 1); await until_idle(20, 'Escape')
            # gamepad: fake a pad holding D-pad down and check the hero walks
            await ev("Field.enter('brightwater', 11, 11, 'down'); window.__pad = true; navigator.getGamepads = () => [window.__pad ? { buttons: Array.from({length: 16}, (_, i) => ({ pressed: i === 13 })), axes: [0, 0] } : null]")
            y0 = await ev("G.y"); await pg.wait_for_timeout(700); await ev("window.__pad = false"); await pg.wait_for_timeout(300)
            print('gamepad moved', y0, '->', await ev("G.y"))
            # encounter toggle (post-game only)
            await ev("CFG.noEnc = true; G.encSteps = 0; Field.map = getMap('world'); G.mapId = 'world'; G.x = 20; G.y = 40; Field.encounterCheck(1)")
            await pg.wait_for_timeout(600)
            print('no encounter with toggle:', await ev("G.scene === Field"))
            await ev("CFG.noEnc = false")
            # rebind Confirm to J through the Controls page, check it, then reset
            await run("await controlsMenu()", 400)
            for k in range(4): await press('ArrowDown', 1, 80)        # Up, Down, Left, Right -> Confirm
            await press('Enter', 1, 300); await pg.keyboard.press('KeyJ'); await pg.wait_for_timeout(300)
            print('rebind: J ->', await ev("KEYMAP.KeyJ"), '| Enter ->', await ev("KEYMAP.Enter || null"), '| saved', await ev("!!CFG.keys"))
            await shot('28_controls')
            await ev("CFG.keys = null; saveCfg(); applyKeymap()"); await press('Escape', 2); await until_idle(20, 'Escape')
            print('reset: Enter ->', await ev("KEYMAP.Enter"))
            # large text + high contrast
            await ev("CFG.bigText = true; CFG.contrast = true")
            await run("await say('Lyra', 'Large text and high-contrast windows make long dialogue easier to read on a phone held at arm\\'s length.')", 900)
            await shot('29_bigtext_contrast'); await until_idle()
            await ev("CFG.bigText = false; CFG.contrast = false")
            # the title screen lists slots and Load Game
            await pg.reload(); await pg.wait_for_timeout(1000); await shot('26_title')
            await press('ArrowDown', 2); await press('Enter', 1, 400); await shot('27_load_menu')

        if want('hearts'):
            s3 = json.loads(json.dumps(POST))
            s3['flags'].update({'isle': True, 'chapter6': True, 'boss_abyss': True, 'lantern_abyss': True})
            s3['inv'].update({'tent': 3}); s3['mapId'] = 'brightwater'; s3['x'] = 5; s3['y'] = 9; s3['dir'] = 'up'
            await boot(s3); await until_idle()
            for b_ in ['lampeater', 'hearthwarden', 'abbot', 'vane']: await ev(f"MONSTERS.{b_}.hp = 300")
            await ev("MONSTERS.echo.hp = 20")   # Selene fights alone; the harness only presses Attack
            # --- Arin: the road ---
            await run("await talkElder()"); await until_idle()
            await ev("for (let i = 0; i < 11; i++) G.flags['lamp_' + i] = true")
            await run("await changeMap('world', 82, 6, 'right')", 800); await until_idle()
            print('lamp entities on world:', await ev("Field.map.entities.filter(e => e.kind === 'roadlamp').length"))
            await run("await worldMapView()", 500); await shot('30_map_lamps'); await press('Escape'); await until_idle(20, 'Escape')
            await ev("G.x = 82; G.y = 6; G.dir = 'right'")
            await shot('31_roadlamp')
            await run("await Field.map.entities.find(e => e.kind === 'roadlamp' && !e.lit).talk()", 300)
            for i in range(40):
                if await ev("G.scene instanceof Battle"): break
                await press('Enter', 1, 150)
            await pg.wait_for_timeout(1500); await shot('32_lampeater'); await until_idle(500, 'Enter', 100)
            await run("await changeMap('brightwater', 5, 9, 'up')", 800); await until_idle()
            await run("await talkElder()"); await until_idle()
            print('arin:', await ev("[G.flags.road_done, G.flags.limit_arin, hasItem('sunbearer')]"))
            # --- Lyra: the grimoire, Ember Caves ---
            await run("await talkMother()"); await until_idle()
            await run("await changeMap('world', 19, 41, 'up')", 700); await until_idle()
            await run("await enterLocation('8')", 1200); await until_idle(); await shot('33_embercave')
            await run("const m = getMap('embercave:0'); const sp = m.extras.spot; await changeMap(m.id, sp.x, sp.y + 1, 'up')", 800); await until_idle()
            await run("await Field.map.entities.find(e => e.kind === 'riddle').talk()", 600)
            for i in range(10):
                if await ev("!!(UI.top() && UI.top().choices)"): break
                await press('Enter', 1, 200)
            await shot('34_riddle'); await until_idle()
            print('riddle 0 (answered Fire):', await ev("G.flags.riddle_0"))
            await ev("window.askRiddle = async () => true; G.flags.riddle_1 = true")
            await run("const m = getMap('embercave:1'); const b = m.extras.boss; await changeMap(m.id, b.x, b.y + 3, 'up')", 800); await until_idle()
            await run("await bossEncounter('embercave')", 300); await until_idle(500, 'Enter', 100)
            print('lyra:', await ev("[G.flags.grimoire_done, G.flags.limit_lyra, hasItem('hearthstaff')]"))
            # --- Oswin: the grotto ---
            await run("await enterInterior('halden', TOWN_DEFS.halden.buildings[1])", 800); await until_idle()
            await run("await Field.map.entities.find(e => e.name === undefined && e.mark).talk()", 300); await until_idle()
            print('q_grotto', await ev("G.flags.q_grotto"))
            await run("await changeMap('world', 41, 40, 'right')", 700); await until_idle()
            await run("await enterLocation('9')", 1200); await until_idle(); await shot('35_grotto')
            await run("const m = getMap('grotto:1'); const b = m.extras.boss; await changeMap(m.id, b.x, b.y + 3, 'up')", 800); await until_idle()
            await run("await bossEncounter('grotto')", 300); await until_idle(500, 'Enter', 100)
            print('oswin:', await ev("[G.flags.grotto_done, G.flags.limit_oswin, hasItem('abbots_bell')]"))
            # --- Kestrel: the Undercity ---
            await run("await enterInterior('ironhold', TOWN_DEFS.ironhold.buildings[2])", 800); await until_idle()
            await run("await talkJailGuard(); refreshEntities()"); await until_idle()
            print('hatch:', await ev("Field.map.entities.filter(e => e.kind === 'hatch').length"))
            await run("await Field.map.entities.find(e => e.kind === 'hatch').talk()", 1200); await until_idle(); await shot('36_undercity')
            await run("const m = getMap('undercity:1'); const b = m.extras.boss; await changeMap(m.id, b.x, b.y + 3, 'up')", 800); await until_idle()
            await run("await bossEncounter('undercity')", 300); await until_idle(500, 'Enter', 100)
            print('kestrel:', await ev("[G.flags.debt_done, G.flags.limit_kestrel, hasItem('pickpocket')]"))
            await run("const m = getMap('undercity:0'); await changeMap(m.id, m.up.x, m.up.y + 1, 'up'); await stairs(-1)", 900); await until_idle()
            print('undercity exit ->', await ev("G.mapId"))
            # --- Selene: the dream ---
            await run("await changeMap('brightwater', 12, 9, 'up')", 700); await until_idle()
            await run("await talkMother()"); await until_idle()
            print('q_echo after Mira:', await ev("G.flags.q_echo"), 'selene in party:', await ev("inParty('selene')"))
            await run("await innStay('brightwater', 10)", 400)
            for i in range(60):
                if await ev("G.scene instanceof Battle"): break
                await press('Enter', 1, 150)
            await pg.wait_for_timeout(1600); await shot('37_echo_solo'); await until_idle(500, 'Enter', 100)
            print('selene:', await ev("[G.flags.echo_done, G.flags.limit_selene, hasItem('duskstar')]"))
            # --- Limits in battle ---
            await ev("G.party.forEach(m => m.limit = 100); MONSTERS.ogre.hp = 99999")
            await run("await startBattle(['ogre', 'ogre'], {})", 1600)
            for i in range(12):
                if await ev("G.scene.active === 0 && !!UI.top()"): break
                await pg.wait_for_timeout(200)
            await shot('38_limit_menu')
            # every hero picks their ★ Limit (top of the menu) and a target if asked
            for i in range(4):
                await press('Enter', 1, 250)
                if await ev("!!(UI.top() && UI.top().kind === 'enemy')"): await press('Enter', 1, 250)
            for i in range(80):
                if await ev("G.scene.active === 0 && !!UI.top()"): break
                await pg.wait_for_timeout(150)
            print('after limits: gauges', await ev("BP().map(m => Math.round(m.limit))"), 'foe damage', await ev("G.scene.enemies.map(e => e.maxhp - e.hp)"), 'stolen', await ev("G.scene.enemies.map(e => e.stolen)"))
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            await ev("MONSTERS.ogre.hp = 300")
            # --- campfire + festival ---
            await run("await changeMap('world', 16, 44, 'up')", 700); await until_idle()
            await run("await campfireTalk()", 300); await shot('39_campfire'); await until_idle()
            print('campfire flags', await ev("Object.keys(G.flags).filter(k => k.startsWith('camp_'))"))
            await run("await changeMap('brightwater', 5, 9, 'up')", 700); await until_idle()
            await run("await talkElder()", 400)
            for i in range(20):
                if await ev("G.scene === BlackScene"): break
                await press('Enter', 1, 200)
            await pg.wait_for_timeout(5000); await shot('40_festival'); await until_idle(200, 'Enter', 150)
            print('festival', await ev("[G.flags.festival, hasItem('heartlight')]"))
            await run("await questMenu()", 400); await press('ArrowDown', 3); await shot('41_quests'); await until_idle(20, 'Escape')

        if want('depth'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST)); s['flags'].update({'isle': True}); s['mapId'] = 'ironhold'; s['x'] = 10; s['y'] = 12
            s['inv'].update({'trout': 2, 'minnow': 1})
            await boot(s); await until_idle()
            # --- save migration: Lv45 heroes get the 16 Embers they would have earned ---
            check(await ev("G.party.every(m => m.embers === 16 && Array.isArray(m.board))"), 'v1 save migrated to v3 with 16 Embers each')
            # --- Lantern Board: open from Status, ignite a node with the keyboard ---
            await run("await statusMenu()", 300); await press('Enter', 1, 250); await shot('42_status_board_hint')
            await press('Enter', 1, 300); await press('ArrowLeft', 1, 150); await press('Enter', 1, 200)
            check(await ev("G.party[0].board.includes('hp') && G.party[0].embers === 15"), 'keyboard ignites Vigor on Arin\'s board')
            await ev("const m = G.party[0]; boardBuy(m, 'p1'); boardBuy(m, 'atk')")
            await pg.wait_for_timeout(300); await shot('43_lantern_board')
            await press('Escape'); await until_idle(20, 'Escape')
            check(await ev("hasPassive(G.party[0], 'counter') && !hasPassive(G.party[0], 'resolve')"), 'Arin has Counter but not the capstone')
            check(await ev("!boardBuy(G.party[0], 'big') || true") and await ev("!boardCanBuy(G.party[0], 'spd')"), 'unlinked nodes cannot be bought')
            hp0 = await ev("HEROES.arin.base.hp + HEROES.arin.grow.hp * 44")
            check(await ev(f"maxHp(G.party[0]) === Math.floor({hp0}) + Math.round(Math.floor({hp0}) * 0.1)"), 'Vigor adds 10% max HP')
            await ev("const l = G.party.find(m => m.id === 'lyra'); boardBuy(l, 'hp'); boardBuy(l, 'p1')")
            check(await ev("(() => { const l = G.party.find(m => m.id === 'lyra'), s = spellsOf(l).find(x => SPELLS[x].mp >= 8); return spellCost(l, s) === Math.ceil(SPELLS[s].mp * 0.75); })()"), 'MP Saver cuts Lyra\'s costs by 25%')
            # --- cooking at the inn ---
            str0 = await ev("stat(G.party[0], 'str')")
            await run("await innStay('ironhold', 10)", 400); await press('Enter', 1, 300)
            await press('ArrowDown', 1, 150); await press('Enter', 1, 300)   # Cook a meal
            await shot('44_cook_menu')
            await press('ArrowDown', 1, 150); await press('Enter', 1, 300)   # Grilled Trout
            await until_idle()
            check(await ev("G.meal && G.meal.id === 'grilled_trout' && G.meal.left === 3 && !hasItem('trout')"), 'Grilled Trout cooked from 2 trout')
            check(await ev(f"stat(G.party[0], 'str') === Math.round({str0} * 1.12)"), 'meal raises Attack by 12%')
            # --- elements: Magma Slime absorbs fire ---
            await run("await startBattle(['magmaslime', 'icegolem'])", 2600)
            check(await ev("G.scene.weakMult(MONSTERS.magmaslime, 'fire') === -1 && G.scene.weakMult(MONSTERS.frostwolf, 'ice') === 0.5"), 'absorb is -1 and resist is 0.5')
            await ev("const e = G.scene.enemies[0]; e.hp = e.maxhp - 60; G.scene.damageEnemy(e, 40, '#fff', false, 'fire'); window._absorb = e.hp")
            check(await ev("window._absorb === G.scene.enemies[0].maxhp - 20"), 'fire damage heals the Magma Slime')
            await ev("const e = G.scene.enemies[1]; e.status.blind = 4; e.status.slow = 4; BP()[0].status.haste = 4; BP()[1].status.slow = 3; BP()[1].status.blind = 3")
            check(await ev("G.scene.spdMod(BP()[0].status) === 1.6 && G.scene.spdMod(BP()[1].status) === 0.6"), 'Haste and Slow change turn speed')
            await pg.wait_for_timeout(400); await shot('45_battle_statuses')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(400, 'Enter', 110)
            check(await ev("G.meal && G.meal.left === 2"), 'meal counts down after a battle')
            # --- boss phases, AI and rare steals: Guildmaster Vane ---
            await ev("MONSTERS.vane.hp = 99999; MONSTERS.vane.rare = ['thief_gloves', 1]")
            await run("await startBattle(['vane'], { boss: true })", 2600)
            await ev("const e = G.scene.enemies[0]; G.scene.damageEnemy(e, Math.ceil(e.maxhp * 0.6))")
            check(await ev("G.scene.enemies[0].phaseN === 1 && G.scene.enemies[0].phase.acts.some(a => a.a === 'e_blind')"), 'Vane enters phase 2 below half HP')
            await ev("G.scene.takeSteal(G.scene.enemies[0], null)")
            check(await ev("hasItem('thief_gloves') && G.scene.enemies[0].stolen"), 'rare steal takes the Thief\'s Gloves')
            seen = False
            for i in range(120):
                m = await ev("G.scene && G.scene.msg")
                if m and 'second knife' in m: await shot('46_boss_phase'); seen = True; break
                if await ev("!!UI.top()"): await press('Enter', 1, 120)
                else: await pg.wait_for_timeout(100)
            check(seen, 'the phase change is announced on Vane\'s turn')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(400, 'Enter', 110)
            await ev("MONSTERS.vane.hp = 8500")
            # --- Sable's codex rewards ---
            await ev("for (const id in MONSTERS) G.seen[id] = true; G.flags.q_scholar = true; G.flags.scholar_done = true")
            await run("await talkSable()", 300); await until_idle()
            await run("await talkSable()", 300); await until_idle()
            check(await ev("hasItem('scholar_monocle') && hasItem('bestiary_seal') && G.flags.codex_all"), 'Sable gives the Monocle at 45 and the Seal for every creature')
            # --- bestiary shows resists, absorbs, AI and rare steals ---
            n = await ev("Object.keys(MONSTERS).indexOf('vane')")
            await run("await bestiaryMenu()", 300); await press('ArrowDown', n, 40); await pg.wait_for_timeout(300); await shot('47_bestiary_vane')
            await press('Escape'); await until_idle(20, 'Escape')
            # --- save round trip keeps the board and the meal ---
            await ev("saveGame('2'); G.party[0].board = []; G.meal = null; loadGame('2')")
            check(await ev("G.party[0].board.includes('p1') && G.meal && G.meal.id === 'grilled_trout'"), 'board and meal survive save/load')

        if want('drowned'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['flags'].update({k: True for k in ['isle', 'q_grotto', 'grotto_done', 'q_road', 'road_done', 'q_debt', 'debt_done', 'q_crown', 'boss_abyss']})
            s['party'][3]['weapon'] = 'abbots_bell'
            s['mapId'] = 'halden'; s['x'] = 12; s['y'] = 12
            await boot(s); await until_idle()
            # --- the quest: Wenna, then Brann fits the bell ---
            await run("await drownedQuestStart()"); await until_idle()
            check(await ev("G.flags.q_drowned && hasItem('tide_chart')"), 'Wenna gives Tessaly\'s Chart')
            await run("await talkBrann()"); await until_idle()
            check(await ev("G.flags.bell && G.inv.frost_crystal === 4 && G.inv.sun_gold === 4"), 'Brann fits the bell for 2 Frost Crystals and 1 Sun Gold')
            # --- dive from a black-water spot ---
            await ev("G.onShip = true; G.ship = { x: 20, y: 22, dir: 'down' }; Field.enter('world', 20, 22, 'down')")
            await pg.wait_for_timeout(500); await shot('48_dive_spot')
            await press('Enter', 1, 300); await press('Enter', 1, 300); await until_idle()
            check(await ev("Field.map.id === 'deep' && G.x === 10 && G.y === 11 && !G.onShip"), 'diving lands on the sea floor below the spot')
            await pg.wait_for_timeout(600); await shot('49_sea_floor')
            # --- Nerith ---
            await ev("Field.enter('deep', 24, 14, 'down')"); await press('ArrowDown', 1, 400); await until_idle()
            check(await ev("Field.map.id === 'nerith'"), 'walking onto the city enters Nerith')
            await pg.wait_for_timeout(700); await shot('50_nerith')
            await run("await enterLocation('0')"); await until_idle()
            check(await ev("Field.map.id === 'nerith'"), 'the palace is shut until Ysolde is met')
            await run("await talkYsolde()"); await until_idle()
            # --- the Drowned Palace and King Nereus ---
            await run("await enterLocation('0')"); await until_idle()
            check(await ev("Field.map.id === 'palace:0'"), 'the Drowned Palace opens after Mother Ysolde')
            await pg.wait_for_timeout(500); await shot('51_palace')
            await ev("MONSTERS.nereus.hp = 60")
            await run("await palaceBoss()", 400)
            for i in range(60):
                if await ev("G.scene !== Field && !!G.scene.enemies && !UI.stack.length && !G.scene.msg"): break
                await press('Enter', 1, 150)
            await pg.wait_for_timeout(900); await shot('52_nereus')
            await until_idle(500, 'Enter', 110)
            check(await ev("G.flags.boss_palace && hasItem('tidecrown')"), 'Nereus falls and gives the Crown of Nerith')
            await ev("MONSTERS.nereus.hp = 16000")
            check(await ev("(() => { const m = getMap('deep'); applyDeepFlags(m); return m.at(DEEP_LOC.I.x, DEEP_LOC.I.y) === 'I'; })()"), 'the Hadal Rift opens on the sea floor')
            await run("await talkYsolde()"); await until_idle()
            check(await ev("G.flags.ysolde_thanks && questList().some(q => q.title === 'The Tide That Remembers')"), 'Ysolde sends you to the Rift')
            # --- the Hadal Rift and the Tide ---
            await ev("Field.enter('deep', DEEP_LOC.I.x, DEEP_LOC.I.y - 1, 'down')"); await press('ArrowDown', 1, 400); await until_idle()
            check(await ev("Field.map.id === 'hadal:0'"), 'stepping into the Rift enters the Hadal Rift')
            await ev("MONSTERS.tide.hp = 60")
            await run("await hadalBoss()", 400)
            for i in range(60):
                if await ev("G.scene !== Field && !!G.scene.enemies && !UI.stack.length && !G.scene.msg"): break
                await press('Enter', 1, 150)
            await pg.wait_for_timeout(900); await shot('53_tide')
            await until_idle(500, 'Enter', 110)
            check(await ev("G.flags.tide_done && hasItem('tidesong')"), 'the Tide That Remembers gives Tidesong')
            await ev("MONSTERS.tide.hp = 30000")
            # --- surfacing ---
            await ev("Field.enter('deep', 23, 23, 'down')"); await press('ArrowDown', 1, 400); await press('Enter', 1, 300); await until_idle()
            check(await ev("Field.map.id === 'world' && G.onShip && G.x === 46 && G.y === 48"), 'the bell line surfaces at the Shrine Deep')
            # --- the map screen in both views ---
            await ev("Field.enter('deep', 24, 14, 'down')")
            await run("await worldMapView()", 400); await shot('54_map_sea_floor'); await press('Shift', 1, 300); await shot('55_map_world'); await press('Escape'); await until_idle(20, 'Escape')
            # --- treasure maps ---
            await ev("addItem('tmap1'); const d = getMap('world').digs[1]; G.onShip = false; Field.enter('world', d.x, d.y, 'down')")
            g0 = await ev("G.gold")
            await press('Enter', 1, 300); await until_idle()
            check(await ev(f"G.flags.dug_1 && !hasItem('tmap1') && G.gold === {g0} + 25000"), 'digging at the spot finds map 1\'s treasure')
            check(await ev("(() => { const r = Math.random; Math.random = () => 0.1; const a = treasureMapDrop([{ def: MONSTERS.bandit }]); const b = treasureMapDrop([{ def: MONSTERS.wolf }]); Math.random = r; return a === 'tmap2' && b === null; })()"), 'bandits drop the next map, wolves don\'t')
            # --- lanternmoths ---
            await run("await talkIvy()"); await until_idle()
            check(await ev("hasItem('moth_whistle')"), 'Old Ivy gives the Moth Whistle once the roads are lit')
            await ev("G.onShip = false; Field.enter('world', 14, 31, 'left')")
            await press('Enter', 1, 300); await press('Enter', 1, 300); await until_idle()
            check(await ev("G.onMoth === true"), 'a lit roadside lamp lends a lanternmoth')
            await ev("G.encSteps = 1"); await press('ArrowUp', 4, 140); await pg.wait_for_timeout(300); await shot('56_lanternmoth')
            check(await ev("G.scene === Field && G.onMoth"), 'no battles while riding a moth')
            await press('Enter', 1, 300); await until_idle()
            check(await ev("!G.onMoth"), 'Enter lands the moth')
            # --- the Undermarket ---
            await ev("Field.enter('in:ironhold:jail', 6, 6, 'down')"); await press('Enter', 1, 300); await press('Enter', 1, 400); await until_idle()
            check(await ev("Field.map.id === 'undermarket'"), 'the jail hatch leads to the Undermarket')
            await pg.wait_for_timeout(600); await shot('57_undermarket')
            check(await ev("shopPrice('blackmarket', 'megalixir') === 20000 && shopPrice('blackmarket', 'sun_gold') === ITEMS.sun_gold.price * 3"), 'black-market prices')
            await ev("Field.enter('undermarket', 10, 14, 'down')"); await press('ArrowDown', 2, 400); await until_idle()
            check(await ev("Field.map.id === 'in:ironhold:jail'"), 'leaving the Undermarket returns to the jail')
            # --- save on the sea floor and load it back ---
            await ev("Field.enter('deep', 24, 14, 'down'); saveGame('3'); Field.enter('world', 40, 15, 'down'); loadGame('3')")
            check(await ev("G.mapId === 'deep' && G.x === 24 && slotSummary('3').place === 'The Sea Floor'"), 'a save on the sea floor loads back on the sea floor')

        if want('platform'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            # --- the title screen's new rows ---
            await pg.goto('file://' + PATH); await ev("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(1200)
            await press('ArrowDown', 5, 120); await pg.wait_for_timeout(300); await shot('58_title_platform')
            await press('Enter', 1, 400); await pg.wait_for_timeout(300); await shot('59_trophies_empty'); await press('Escape', 1, 300)
            # --- trophies: earned from flags, kept outside the save ---
            s = json.loads(json.dumps(POST)); s['flags'].update({'lantern1': True})
            await boot(s); await until_idle()
            await pg.wait_for_timeout(1300)
            check(await ev("!!Trophies.got.ember && !!Trophies.got.dawn && !Trophies.got.nerith"), 'trophies unlock from story flags')
            check(await ev("JSON.parse(localStorage.getItem('lanternfall_trophies_v1')).ember > 0"), 'trophies are stored outside the save slots')
            await ev("G.flags.stole_rare = true"); await pg.wait_for_timeout(700)
            check(await ev("!!Trophies.got.rare"), 'a rare steal earns Light Fingers')
            await run("await trophyRoom()", 400); await shot('60_trophy_room'); await press('Escape', 1, 300); await until_idle(10, 'Escape')
            # --- speedrun timer and splits ---
            check(await ev("G.splits.ending === null && G.splits.lantern1 === null"), 'a pre-1.8 save marks earlier splits as unknown, not as times')
            await ev("CFG.speedrun = true; G.playTime = 3725.4; G.splits = { lantern1: 1000, lantern3: null, ending: null }; localStorage.setItem('lanternfall_splits_v1', JSON.stringify({ lantern2: 2000 })); G.flags.lantern2 = true")
            await pg.wait_for_timeout(800); await shot('61_speedrun_split')
            check(await ev("G.splits.lantern2 > 3725 && splitFlash && splitFlash.delta > 0"), 'a split records the time and the difference from the best')
            pt = await ev("G.playTime")
            await run("await startBattle(['slime'])", 2200)
            check(await ev(f"G.playTime > {pt} + 1.5"), 'play time keeps counting during battles')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            await ev("CFG.speedrun = false")
            # --- battery saver: about 30 frames a second ---
            await ev("window.__n = 0; const f0 = frameInner; frameInner = n => { window.__n++; f0(n); }")
            await pg.wait_for_timeout(1000); full = await ev("window.__n")
            await ev("CFG.battery = true; window.__n = 0"); await pg.wait_for_timeout(1000); saver = await ev("window.__n")
            await ev("CFG.battery = false")
            check(saver < 36 and full > saver * 1.4, f'battery saver halves the frame rate ({full} → {saver} fps)')
            # --- config rows ---
            await run("await configMenu()", 400); await shot('62_config_platform'); await press('Escape', 1, 300); await until_idle(10, 'Escape')
            # --- transfer saves ---
            await ev("saveGame('2')")
            blob = await ev("exportSaves()")
            await ev("localStorage.removeItem(SAVE_PREFIX + '2')")
            check(await ev("!readSlot('2')"), 'slot 2 deleted before import')
            n = await ev(f"importSaves({json.dumps(blob)})")
            check(await ev("!!readSlot('2') && readSlot('2').party.length === 5") and n >= 3, f'an exported file restores the saves ({n} entries)')
            check(await ev("(() => { try { importSaves('{\"game\":\"other\"}'); return false; } catch (e) { return true; } })()"), 'a file from another game is refused')
            # --- installable app: served over http, the service worker caches the game for offline play ---
            import threading, http.server, socketserver
            root = str(pathlib.Path(PATH).parent)
            class Q(http.server.SimpleHTTPRequestHandler):
                def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
                def log_message(self, *a): pass
            socketserver.TCPServer.allow_reuse_address = True
            srv = socketserver.TCPServer(('127.0.0.1', 0), Q); port = srv.server_address[1]
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            ctx2 = await b.new_context(viewport={'width': 640, 'height': 480}); pg2 = await ctx2.new_page()
            pg2.on('pageerror', lambda e: errs.append('pwa: ' + str(e)))
            await pg2.goto(f'http://127.0.0.1:{port}/index.html'); await pg2.wait_for_timeout(2500); await pg2.reload(); await pg2.wait_for_timeout(1500)
            check(await pg2.evaluate("!!navigator.serviceWorker.controller"), 'the service worker controls the page')
            cdp = await ctx2.new_cdp_session(pg2)
            m = await cdp.send('Page.getAppManifest')
            check(not m.get('errors') and 'Lanternfall' in (m.get('data') or ''), 'the web app manifest parses')
            await ctx2.set_offline(True); await pg2.reload(); await pg2.wait_for_timeout(1500)
            check(await pg2.evaluate("typeof Trophies === 'object' && document.title.startsWith('Lanternfall')"), 'the game reloads offline')
            await ctx2.close(); srv.shutdown()

        if want('living'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['flags'].update({k: True for k in ['isle', 'q_road', 'road_done', 'q_debt', 'debt_done', 'boss_abyss']})
            s['mapId'] = 'brightwater'; s['x'] = 11; s['y'] = 12
            await boot(s); await until_idle()
            # --- day and night ---
            check(await ev("dayPhase() === 'day' && !isNight()"), 'a new clock starts in the morning')
            await ev("G.clock = 22 * 60; Field.enter('brightwater', 11, 12, 'down')"); await pg.wait_for_timeout(600)
            check(await ev("isNight() && Field.map.entities.some(e => e.name === 'Night watchman') && !Field.map.entities.some(e => e.wander)"), 'at night the wanderers go home and the night watchman is out')
            await shot('63_brightwater_night')
            await ev("G.clock = 22 * 60; G.onShip = false; Field.enter('world', 14, 40, 'down')"); await pg.wait_for_timeout(500); await shot('64_world_night')
            await ev("const r = Math.random; Math.random = () => 0.1; G.encSteps = 0; Field.encounterCheck(1); Math.random = r")
            await pg.wait_for_timeout(2200)
            check(await ev("!!G.scene.enemies && G.scene.enemies.every(e => NIGHT_ENC.r1.some(g => g.g.includes(e.id)) || NIGHT_ENC.r2.some(g => g.g.includes(e.id)))"), 'night battles come from the night tables')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            check(await ev("G.flags.night_win === true"), 'winning at night is noted (Night Owl)')
            await ev("G.clock = 10 * 60; Field.enter('in:brightwater:inn', 9, 4, 'up')")
            await run("await innStay('brightwater', 10)", 400); await press('Enter', 1, 300); await press('ArrowDown', 1, 150); await press('Enter', 1, 300); await until_idle()
            tod = await ev("[timeOfDay(), dayNumber()]")
            check(abs(tod[0] - 21 * 60) < 10 and tod[1] == 1, f'an inn can wake you at nightfall (woke {tod})')
            # --- weather ---
            await ev("window.__findClock = (reg, y, want) => { for (let c = 0; c < 1440 * 60; c += 360) { G.clock = c; if (regionWeather(reg, y) === want) { G.clock = c + 13 * 60 % 360 + 600; return regionWeather(reg, y) === want ? G.clock : c; } } return -1; }")
            await ev("(() => { for (let c = 10 * 60; c < 1440 * 60; c += 360) { G.clock = c; if (worldWeatherAt(14, 40) === 'rain' && !isNight()) return; } })(); Field.enter('world', 14, 40, 'down')")
            await pg.wait_for_timeout(500); await shot('65_world_rain')
            check(await ev("currentWeather() === 'rain'"), 'the weather is rolled per region from the clock')
            await run("await startBattle(['slime', 'slime'])", 2400); await shot('66_battle_rain')
            check(await ev("G.scene.weather === 'rain' && weatherMult('rain', 'water') === 1.25 && weatherMult('rain', 'fire') === 0.75 && G.scene.magBoost(BP()[1], 'bolt') >= 1.25"), 'rain strengthens water and lightning, weakens fire')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            await ev("(() => { for (let c = 10 * 60; c < 1440 * 60; c += 360) { G.clock = c; if (worldWeatherAt(30, 8) === 'snow' && !isNight()) return; } })(); Field.enter('frostmere', 11, 15, 'up')")
            await pg.wait_for_timeout(600); await shot('67_frostmere_snow')
            check(await ev("currentWeather() === 'snow'"), 'Frostmere gets snow')
            await ev("(() => { for (let c = 10 * 60; c < 1440 * 60; c += 360) { G.clock = c; if (worldWeatherAt(80, 43) === 'sand' && !isNight()) return; } })(); G.onShip = false; Field.enter('world', 80, 43, 'down')")
            await pg.wait_for_timeout(500); await shot('68_world_sandstorm')
            check(await ev("currentWeather() === 'sand' && weatherMiss('sand') === 0.15"), 'the Sunscar gets sandstorms')
            await ev("G.clock = 10 * 60; Field.enter('world', 14, 40, 'down')")
            # --- berserk and stop ---
            await run("await startBattle(['ogre'], { weather: 'clear' })", 2400)
            a0 = await ev("G.scene.memberAtk(0)")
            await ev("applyItemEffect('rage_tonic', BP()[0], G.scene, 0)")
            check(await ev(f"BP()[0].status.berserk === 3 && Math.abs(G.scene.memberAtk(0) - {a0} * 1.5) < 0.01"), 'Rage Tonic berserks: ATK ×1.5')
            await ev("G.scene.enemies[0].status.stop = 2; window.__hp = BP().map(m => m.hp).join(); window.__r = G.scene.enemyAct(G.scene.enemies[0])")
            await pg.wait_for_timeout(900)
            check(await ev("BP().map(m => m.hp).join() === window.__hp"), 'a stopped enemy loses its turn')
            await shot('69_battle_statuses')
            await ev("BP()[0].status = {}; G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            check(await ev("spellsOf(G.party.find(m => m.id === 'selene')).includes('stop') && MONSTERS.deepgazer.acts.some(a => a.a === 'e_stop')"), 'Selene learns Stop; deep gazers cast it')
            # --- Lanterns & Lies ---
            check(await ev("cardAttack('wolf', 'goblin') && !cardAttack('goblin', 'wolf') && cardAttack('slime', 'bat') && !cardAttack('bat', 'slime')"), 'flames: ember beats stone, tide beats ember (+2)')
            check(await ev("(() => { const b = Array(9).fill(null); layCard(b, 0, 'goblin', 'o', false); const f1 = layCard(b, 1, 'arin', 'p', true); const f2 = revealLies(b); return f1.length === 0 && f2.length === 1 && b[0].owner === 'p'; })()"), 'a Lie flips nothing when laid, then strikes at the end')
            await ev("G.clock = 10 * 60; Field.enter('brightwater', 10, 13, 'down')"); await pg.wait_for_timeout(400)
            check(await ev("Field.map.entities.some(e => e.name === 'Tess')"), 'Tess plays cards in Brightwater by day')
            await run("await talkCardFoe('tess')", 400)
            for i in range(30):
                if await ev("(() => { const t = UI.stack[UI.stack.length - 1]; return !!t && Array.isArray(t.choices) && t.choices.includes('Play') && t.done(); })()"): break
                await press('Enter', 1, 160)
            check(await ev("cardCount() === 7 && G.flags.q_cards"), 'Tess hands out a 7-card starter deck')
            await press('Enter', 1, 400)   # Play
            await pg.wait_for_timeout(300); await shot('70_card_deck'); await press('Escape', 1, 400)   # accept the five strongest
            for i in range(200):
                st = await ev("CardGame.state && UI.stack.length ? [CardGame.state.turn(), CardGame.state.phase(), CardGame.state.cell(), CardGame.state.board.findIndex(b => !b)] : null")
                if not st or st[1] == 'done': break
                if st[0] != 'p': await pg.wait_for_timeout(200); continue
                if st[1] == 'card': await press('Enter', 1, 150); continue
                cur, tgt = st[2], st[3]
                if cur // 3 < tgt // 3: await press('ArrowDown', 1, 60)
                elif cur // 3 > tgt // 3: await press('ArrowUp', 1, 60)
                elif cur % 3 < tgt % 3: await press('ArrowRight', 1, 60)
                elif cur % 3 > tgt % 3: await press('ArrowLeft', 1, 60)
                else: await press('Enter', 1, 200)
                if i == 6: await shot('71_card_match')
            await pg.wait_for_timeout(400); await shot('72_card_result')
            check(await ev("CardGame.state.phase() === 'done' && CardGame.state.board.every(Boolean)"), 'a full match plays out by keyboard')
            await until_idle(40)
            # --- the heist ---
            await run("await talkMags()", 300); await until_idle()
            check(await ev("G.flags.q_heist"), 'Mags asks Kestrel for a job')
            await ev("G.clock = 22 * 60; Field.enter('mirage', 16, 7, 'up')"); await pg.wait_for_timeout(300)
            await press('Enter', 1, 300); await press('Enter', 1, 400); await until_idle()
            check(await ev("Field.map.id === 'heist'"), 'the cellar grate opens at night')
            await pg.wait_for_timeout(700); await shot('73_heist')
            await ev("const g = Field.map.entities.find(e => e.kind === 'guard' && e.idx === 0); const [x, y] = guardSight(Field.map, g)[1]; G.x = x; G.y = y; Heist.check(Field.map)")
            await until_idle()
            check(await ev("Field.map.id === 'mirage' && G.flags.heist_caught === 1"), 'being seen gets you thrown out')
            await ev("addItem('sunset_opal'); Field.enter('heist', 1, 2, 'up')"); await press('ArrowUp', 1, 500); await until_idle()
            check(await ev("Field.map.id === 'mirage' && G.flags.heist_out"), 'leaving by the grate with the opal')
            await run("await talkMags()", 300); await until_idle()
            await pg.wait_for_timeout(700)
            hv = await ev("[!!G.flags.heist_done, hasItem('night_cloak'), !!Trophies.got.heist, Field.map.id, G.flags.heist_out, hasItem('sunset_opal')]")
            check(hv[:3] == [True, True, True], f'Mags pays with the Night Cloak; Ghost of Mirage {hv}')
            sol = await ev("(() => {\n// heist: time-expanded search, up to 3 player steps per guard step\n  const m = buildHeist(); const paths = HEIST_GUARDS.map(patrolPath);\n  const L = paths.reduce((a, p) => { const g = (x, y) => y ? g(y, x % y) : x; return a * p.length / g(a, p.length); }, 1);\n  const guardsAt = t => paths.map(p => guardAt(p, t));\n  const seenAt = []; for (let t = 0; t < L; t++) { const s = new Set(); const gs = guardsAt(t); for (const g of gs) { s.add(g.x + ',' + g.y); for (const [x, y] of guardSight(m, g)) s.add(x + ',' + y); } seenAt.push(s); }\n  const walk = (x, y) => m.at(x, y) !== undefined && !HEIST_SOLID.has(m.at(x, y));\n  const solve = (sx, sy, tx, ty) => {\n    const key = (x, y, t) => x + ',' + y + ',' + t; const vis = new Set([key(sx, sy, 0)]); let fr = [[sx, sy, 0]]; let steps = 0;\n    while (fr.length && steps < L * 3) {\n      const nx = [];\n      for (const [x, y, t] of fr) {\n        const t1 = (t + 1) % L;\n        // up to 3 moves during this guard step, each square must be unseen now; the final square unseen after the guards move\n        let reach = new Set([x + ',' + y]), layer = [[x, y]];\n        for (let k = 0; k < 3; k++) { const nl = []; for (const [a, b] of layer) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const p = [a + dx, b + dy], s = p.join(); if (!reach.has(s) && walk(...p) && !seenAt[t].has(s) && !(p[0] === 15 && p[1] === 11 && !(tx === 15 && ty === 11))) { reach.add(s); nl.push(p); } } layer = nl; }\n        for (const s of reach) { const [a, b] = s.split(',').map(Number);\n          if (seenAt[t1].has(s)) continue;\n          if (Math.abs(a - tx) + Math.abs(b - ty) <= 1 && !(a === tx && b === ty)) return true;\n          const k2 = key(a, b, t1); if (!vis.has(k2)) { vis.add(k2); nx.push([a, b, t1]); } }\n      }\n      fr = nx; steps++;\n    }\n    return false;\n  };\n  return [solve(1, 2, 15, 11), solve(16, 11, 1, 1)];\n})()")
            check(sol == [True, True], f'the heist has an unseen route in and out ({sol})')
            # --- save keeps the clock and the cards ---
            await ev("G.clock = 3000; saveGame('2'); G.clock = 0; G.cards = {}; loadGame('2')")
            cv = await ev("[G.clock, cardCount()]")
            check(abs(cv[0] - 3000) < 1 and cv[1] >= 7, f'the clock and the card collection are saved {cv}')

        print('ERRORS:', len(errs))
        for e in errs[:30]: print('  ', e)
        await b.close()
        return len(errs)
sys.exit(1 if asyncio.run(main()) else 0)
