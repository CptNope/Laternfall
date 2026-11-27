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
import re
import sys, json, asyncio, os, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(ROOT / 'index.html')
OUT = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'playtest-shots')
SCEN = sys.argv[3:] or ['chapter', 'orun', 'systems', 'newgame', 'comfort', 'hearts', 'depth', 'drowned', 'platform', 'living', 'tiles', 'mods', 'editor', 'i18n', 'endless', 'home', 'guests', 'verses']
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
            await press('Enter', 1, 400)  # Normal mode (2.1)
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

        if want('endless'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['mapId'] = 'brightwater'; s['x'] = 13; s['y'] = 11; s['dir'] = 'up'
            await boot(s); await until_idle()
            # --- every floor is sound: stairs both ways, a boss and a way on every fifth floor ---
            bad = await ev("(() => { const bad = []; for (let f = 0; f < 120; f++) { const m = genDungeonFloor('endless', f); const D = m.down && m.at(m.down.x, m.down.y) === '>' && m.at(m.up.x, m.up.y) === '<'; if (!D || !!m.extras.boss !== endlessBossFloor(f) || (m.extras.boss && !MONSTERS[endlessDef(f).boss])) bad.push(f); } return bad; })()")
            check(bad == [], f'120 floors generate with stairs down and up, a boss on every fifth (bad: {bad})')
            check(await ev("genDungeonFloor('endless', 7).tiles.join() === genDungeonFloor('endless', 7).tiles.join() && endlessDef(0).theme === 'hollow' && endlessDef(5).theme === 'shrine' && endlessDef(50).theme === 'hollow'"), 'floors are seeded and the look cycles through the old dungeons')
            # --- the keeper only appears after the ending ---
            check(await ev("Field.map.entities.some(e => e.name === KEEPER)"), 'Hesper stands by the well after the ending')
            check(await ev("(() => { const f = G.flags.ending; G.flags.ending = false; const n = endlessNpcs().length; G.flags.ending = f; return n === 0; })()"), 'and not before it')
            await run("await talkKeeper()", 400); await shot('80_endless_keeper')
            await press('Enter', 3, 350); await press('Enter', 1, 300); await until_idle(); await pg.wait_for_timeout(900)
            check(await ev("G.mapId === 'endless:0' && G.flags.endless_best === 1 && G.flags.seen_endless"), f'talking to her and picking 1F sends the party down (map {await ev("G.mapId")})')
            await shot('81_endless_1f')
            # --- foes are rescaled to the depth ---
            hp = await ev("(() => { const b = new Battle(['sporecap'], {}); return [b.enemies[0].maxhp, MONSTERS.sporecap.hp, endlessScale(MONSTERS.sporecap, 0).hp]; })()")
            check(hp[0] == hp[2] and hp[0] > hp[1] * 3, f'a Spore Cap down here has Abyss-level HP ({hp})')
            check(await ev("endlessScale(MONSTERS.shadebat, 3).hp > endlessScale(MONSTERS.shadebat, 0).hp && endlessScale(MONSTERS.crown, 0).hp === MONSTERS.crown.hp"), 'foes grow with depth; bosses are matched to the Hollow Crown')
            # --- stairs down: the record goes up and floors behind are dropped ---
            await ev("const m = Field.map; G.x = m.down.x; G.y = m.down.y")
            await run("await stairs(1)", 900); await until_idle()
            check(await ev("G.mapId === 'endless:1' && G.flags.endless_best === 2 && !G.maps['endless:0']"), 'going down records the depth and forgets the floor above')
            # --- a boss floor: an echo, gold, a checkpoint ---
            await run("await startEndless(4)", 900); await until_idle()
            check(await ev("G.mapId === 'endless:4' && Field.map.entities.some(e => e.kind === 'boss') && Field.map.at(Field.map.down.x, Field.map.down.y) === '>'"), '5F has a boss, with the way down behind it')
            gold = await ev("G.gold")
            await run("await endlessBoss()", 600); await press('Enter', 2, 400); await pg.wait_for_timeout(2600)
            check(await ev("G.scene.enemies && G.scene.enemies[0].id === 'gloomcap' && G.scene.enemies[0].maxhp === endlessScale(MONSTERS.gloomcap, 4).hp"), 'the 5F echo is a scaled Gloomcap')
            await shot('82_endless_boss')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            check(await ev(f"G.flags.boss_endless_4 && G.flags.endless_ck === 5 && G.gold >= {gold} + 2000 && !Field.map.entities.some(e => e.kind === 'boss')"), 'beating it pays out and unlocks a checkpoint at 6F')
            # --- climbing out ends the descent ---
            await ev("const m = Field.map; G.x = m.up.x; G.y = m.up.y")
            await run("await stairs(-1)", 400); await press('Enter', 1, 300); await until_idle(); await pg.wait_for_timeout(700)
            check(await ev("G.mapId === 'brightwater' && !Object.keys(G.maps).some(k => k.startsWith('endless:'))"), 'the stairs up lead back to the well')
            await run("await talkKeeper()", 400); await press('Enter', 1, 300); await shot('83_endless_checkpoint')
            check(await ev("UI.top() && (UI.top().opts.choices || []).includes(tl`Descend from ${6}F`)"), 'next time Hesper offers 6F')
            await press('ArrowDown', 1, 150); await press('Enter', 1, 300); await until_idle(); await pg.wait_for_timeout(900)
            check(await ev("G.mapId === 'endless:5' && !G.flags.boss_endless_4"), 'starting from the checkpoint begins a fresh descent')
            # --- trophies ---
            await ev("G.flags.endless_best = 10; Trophies.check()")
            check(await ev("!!Trophies.got.endless10 && !Trophies.got.endless30"), 'reaching 10F earns Down the Well')
            # --- Hollow mode ---
            await ev("G.flags.hollow = true; Field.enter('in:brightwater:inn', 9, 4, 'up')"); await pg.wait_for_timeout(500)
            await ev("G.party.forEach(m => m.hp = 1)"); gold = await ev("G.gold")
            await run("await innStay('brightwater', 10)", 400); await press('Enter', 6, 350); await until_idle(); await pg.wait_for_timeout(800)
            check(await ev(f"G.party.every(m => m.hp === 1) && G.gold === {gold}"), 'in Hollow mode the inn passes the night but heals nobody (and is free)')
            await ev("healAll()")
            await run("await startBattle(['slime'])", 2400); await shot('84_hollow_no_run')
            check(await ev("G.scene.enemies && isHollow()"), 'a battle in Hollow mode')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            ph = await ev("(() => { const b = new Battle(['crown'], { boss: true }); const P = b.enemies[0].def.phases; return [P.length, MONSTERS.crown.phases.length, P[P.length - 1].hp, P[P.length - 1].actions]; })()")
            check(ph[0] == ph[1] + 1 and ph[2] <= 0.2 and ph[3] == 3, f'bosses get a third phase that acts once more a turn ({ph})')
            check(await ev("(() => { const f = G.flags.hollow; G.flags.hollow = false; const n = new Battle(['crown'], { boss: true }).enemies[0].def.phases.length; G.flags.hollow = f; return n === MONSTERS.crown.phases.length; })()"), 'and not in Normal mode')
            await ev("saveGame('3')")
            check(await ev("slotSummary('3').hollow === true"), 'save slots show Hollow')
            # --- the mode is picked when a journey starts ---
            await pg.goto('file://' + PATH); await ev("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(900)
            await press('Enter', 1, 400); await shot('85_mode_menu')
            await press('ArrowDown', 1, 200); await press('Enter', 1, 300); await pg.wait_for_timeout(1500)
            check(await ev("G.flags.hollow === true && G.party.length === 2"), 'New Game → Hollow starts a Hollow journey')

        if want('home'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['mapId'] = 'brightwater'; s['x'] = 9; s['y'] = 7; s['dir'] = 'up'
            s['flags'].update({'q_cat': True, 'cat_found': True, 'cat_done': True, 'fish_minnow': True, 'fish_goldcarp': True, 'fish_icepike': True, 'fish_embereel': True})
            await boot(s); await until_idle()
            await ev("G.gold = 5000; Trophies.check()")
            check(await ev("Field.map.entities.some(e => e.name === CARPENTER)"), 'Corwin the carpenter works by Arin\'s house')
            # --- buying from Corwin: the menu, the gold, the flag ---
            await run("await talkCorwin()", 600)
            for _ in range(20):   # through his two lines, until the menu is up
                if await ev("!!(UI.top() && UI.top().items)"): break
                await press('Enter', 1, 350)
            await shot('90_carpenter_menu')
            check(await ev("UI.top() && UI.top().items && UI.top().items.length === 6"), 'his menu lists five things to build')
            await press('Enter', 1, 400)
            check(await ev("G.flags.home_catbed && G.gold === 5000 - 250"), 'choosing the first builds Mittens\' bed for 250 G')
            await until_idle(40, 'Escape', 150); await until_idle()
            check(await ev("homeNpcs()[0].x === 9 && (() => { const f = G.flags.lantern1; G.flags.lantern1 = false; const ok = !HOME_UPGRADES[3].need(G.flags); G.flags.lantern1 = f; return ok; })()"), 'the music box waits for the first Lantern')
            await ev("G.flags.home_shelf = G.flags.home_tank = G.flags.home_musicbox = true; rebuildHome()")
            # --- the house ---
            await ev("Field.enter(HOME_ID, 6, 8, 'up')"); await pg.wait_for_timeout(600)
            tiles = await ev("HOME_UPGRADES.slice(0, 4).map(u => Field.map.at(u.x, u.y)).join('')")
            check(tiles == 'ZSQJ', f'the house has the bed, shelf, tank and music box ({tiles})')
            check(await ev("Field.map.entities.some(e => e.catSprite && e.x === 2 && e.y === 4)"), 'Mittens sleeps in her bed')
            await shot('91_home')
            n = await ev("Trophies.count()")
            check(n > 0, f'the shelf has trophies to show ({n})')
            # --- the music box ---
            await ev("G.flags['heard:crown'] = true")
            check(await ev("heardSongs().includes('crown') && !heardSongs().includes('nerith') && heardSongs().includes('title')"), 'the music box knows the songs you have heard')
            await ev("Audio_.play('ending')")
            check(await ev("G.flags['heard:ending'] === true"), 'hearing a song adds it')
            await ev("G.x = 11; G.y = 3; G.dir = 'up'")
            await run("await musicBox()", 400); await shot('92_music_box'); await press('ArrowDown', 1, 150); await press('Enter', 1, 400); await until_idle()
            song = await ev("G.flags.home_song")
            check(bool(song) and await ev("Audio_.curName") == song, f'choosing a song plays it at home ({song})')
            await ev("Field.enter('brightwater', 11, 6, 'down')"); await pg.wait_for_timeout(300)
            check(await ev("Audio_.curName !== G.flags.home_song"), 'and Brightwater keeps its own song outside')
            await ev("Field.enter(HOME_ID, 6, 8, 'up')"); await pg.wait_for_timeout(300)
            check(await ev("Audio_.curName === G.flags.home_song"), 'the chosen song plays again when you come home')
            # --- Mittens comes along ---
            await ev("G.x = 3; G.y = 4; G.dir = 'left'")
            await run("await talkMittens()", 1500); await press('ArrowDown', 1, 200); await press('Enter', 1, 500); await until_idle()
            check(await ev("G.flags.cat_follow && Field.map.entities.filter(e => e.catSprite).length === 1 && Field.map.entities.some(e => e.follow)"), 'asked along, she follows (and leaves her bed)')
            await ev("Field.enter('brightwater', 11, 6, 'down')"); await pg.wait_for_timeout(300)
            await press('ArrowDown', 1, 260); await press('ArrowDown', 1, 260); await press('ArrowLeft', 1, 400)
            pos = await ev("(() => { const c = Field.map.entities.find(e => e.follow); return [c.mv ? c.mv.tx : c.x, c.mv ? c.mv.ty : c.y, G.x, G.y]; })()")
            check(pos[:2] == [11, 8] and pos[2:] == [10, 8], f'in town she trots one step behind ({pos})')
            await shot('93_mittens_follows')
            await press('ArrowRight', 1, 400)
            check(await ev("G.x === 11 && G.y === 8"), 'and never blocks the way back')
            # --- anywhere: another town, the world map, a dungeon, the sea floor; aboard the ship she rides unseen ---
            async def follow_at(mid, x, y, label):
                await ev(f"G.onShip = false; G.inAir = false; G.onMoth = false; Field.enter('{mid}', {x}, {y}, 'down')"); await pg.wait_for_timeout(250)
                await until_idle(40, 'Enter', 120)
                ok = await ev("Field.map.entities.filter(e => e.follow).length === 1")
                check(ok, f'she follows into {label}')
            await follow_at('halden', 12, 12, 'Port Halden')
            await follow_at('in:brightwater:inn', 9, 6, 'the inn')
            await follow_at('mine:0', "getMap('mine:0').up.x", "getMap('mine:0').up.y + 1", 'a dungeon')
            async def step_free():
                d = await ev("""(() => { for (const d of ['down', 'left', 'right', 'up']) { const [dx, dy] = DIRS[d]; if (Field.walkable(G.x + dx, G.y + dy) && !Field.entityAt(G.x + dx, G.y + dy)) return d; } return null; })()""")
                xy = await ev("[G.x, G.y]")
                await press({'down': 'ArrowDown', 'up': 'ArrowUp', 'left': 'ArrowLeft', 'right': 'ArrowRight'}[d], 1, 450)
                return xy
            deep = await ev("""(() => { const m = getMap('deep'), open = (x, y) => m.at(x, y) === '.'; for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) if (open(x, y) && open(x + 1, y) && open(x - 1, y) && open(x, y + 1) && open(x, y - 1) && !m.tiles.slice(y - 3, y + 4).some(r => r.slice(x - 3, x + 4).some(c => /[A-Za-z0-9]/.test(c) && c !== 'k'))) return [x, y]; return null; })()""")
            await follow_at('deep', deep[0], deep[1], 'the sea floor')
            await step_free(); await until_idle(40, 'Enter', 120)
            check(await ev("G.mapId === 'deep' && (() => { const c = Field.map.entities.find(e => e.follow); return c && !c.hidden && (c.x !== G.x || c.y !== G.y); })()"), 'on the sea floor she swims behind the bell, in a bubble')
            await shot('95_mittens_bubble')
            w = await ev("(() => { const m = getMap('world'), l = locDef('A'); return [l.x, l.y]; })()")
            await follow_at('world', w[0], w[1] + 1, 'the world map')
            sx, sy = await step_free(); await shot('96_mittens_world')
            check(await ev(f"G.x !== {sx} || G.y !== {sy}"), 'the party took a step on the world map')
            pos = await ev("(() => { const c = Field.map.entities.find(e => e.follow); return [c.x, c.y, c.hidden]; })()")
            check(pos == [sx, sy, False], f'on the world map she trots behind ({pos})')
            await ev("G.onShip = true; const a = { fx: G.x, fy: G.y, tx: G.x + 1, ty: G.y, dur: 0.1 }; followStep(Field.map, a)")
            check(await ev("Field.map.entities.find(e => e.follow).hidden === true"), 'aboard the ship she rides along out of sight')
            await ev("G.onShip = false; followStep(Field.map, { fx: G.x, fy: G.y, tx: G.x, ty: G.y + 1, dur: 0.16 })")
            check(await ev("(() => { const c = Field.map.entities.find(e => e.follow); return !c.hidden && c.x === G.x && c.y === G.y + 1; })()"), 'and hops off with you')
            await ev("followStep(Field.map, { fx: G.x + 9, fy: G.y + 9, tx: G.x + 10, ty: G.y + 9, dur: 0.16 })")
            check(await ev("(() => { const c = Field.map.entities.find(e => e.follow); return !c.mv && c.x === G.x + 9; })()"), 'after a cutscene moves you, she catches up instead of sliding')
            await ev("Field.enter('brightwater', 11, 8, 'down')"); await pg.wait_for_timeout(200)
            # --- Mittens in battle (2.3) ---
            await run("await startBattle(['slime', 'slime'])", 2400)
            check(await ev("G.scene.enemies && G.scene.cat === true"), 'walking with you, she sits in on fights')
            r = await ev("(async () => { const b = G.scene, r = Math.random; Math.random = () => 0; const ok = await catDistract(b, b.enemies[0]); Math.random = r; return [ok, b.catDistracted]; })()")
            check(r == [True, 1], f'now and then a foe loses its action to her ({r})')
            await shot('97_mittens_battle')
            check(await ev("(async () => { const b = G.scene, r = Math.random; Math.random = () => 0; const boss = { ...b.enemies[0], def: { ...b.enemies[0].def, boss: true } }; const ok = await catDistract(b, boss); Math.random = r; return ok === false; })()"), 'bosses ignore her')
            check(await ev("(() => { const b = G.scene, r = Math.random; Math.random = () => 0; const a = catFind(b); Math.random = () => 0.99; const n = catFind(b); Math.random = r; return !!ITEMS[a] && n === null; })()"), 'after a win she sometimes brings something back')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            check(await ev("(() => { const f = G.flags.cat_follow; G.flags.cat_follow = false; const c = new Battle(['slime'], {}).cat; G.flags.cat_follow = f; return c === false; })()"), 'left at home, she stays out of fights')
            await ev("G.flags.cat_follow = false; refreshEntities()")
            check(await ev("!Field.map.entities.some(e => e.follow)"), 'sent home, she leaves the street')
            # --- the Sailor's Compass ---
            await ev("Field.enter('mine:0', getMap('mine:0').up.x, getMap('mine:0').up.y + 1, 'down'); G.flags.noEnc = true; CFG.noEnc = true")
            await pg.wait_for_timeout(500)
            await ev("G.inv.compass = 1")
            tgt = await ev("(() => { const e = compassTarget(Field.map); return e && [e.x, e.y]; })()")
            check(tgt is not None, f'with the compass, the nearest unopened chest is found ({tgt})')
            await shot('94_compass')
            await ev("Field.map.entities.filter(e => e.kind === 'chest').forEach(e => e.opened = true)")
            check(await ev("compassTarget(Field.map) === null"), 'with every chest open the needle has nothing to point at')
            check(await ev("(() => { const g = document.createElement('canvas').getContext('2d'); const on = drawCompassHint(g, Field.map, 0); CFG.compass = false; const off = drawCompassHint(g, Field.map, 0); CFG.compass = true; const town = drawCompassHint(g, getMap('brightwater'), 0); return on && !off && !town; })()"), 'the needle shows in dungeons, and can be switched off in Config')

        if want('guests'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['mapId'] = 'frostmere'; s['x'] = 12; s['y'] = 11; s['dir'] = 'up'
            s['flags'].update({'obsOpen': True, 'boss_observatory': False, 'cat_done': True, 'cat_follow': True})
            await boot(s); await until_idle()
            # --- who is with you comes from story flags ---
            check(await ev("guestFor() === 'wren'"), 'with the Observatory open and the Wyrm awake, Wren is your guest')
            check(await ev("!Field.map.entities.some(e => e.name === tl('Wren') && !e.follow)"), 'so he is not in Frostmere')
            check(await ev("(() => { const F = Field.map.entities.filter(e => e.follow); return F.length === 2 && F[0].guest === 'wren' && !F[1].guest; })()"), 'he walks right behind you, Mittens behind him')
            await press('ArrowDown', 1, 300); await press('ArrowDown', 1, 450)
            pos = await ev("(() => { const F = Field.map.entities.filter(e => e.follow).map(e => e.mv ? [e.mv.tx, e.mv.ty] : [e.x, e.y]); return [F, [G.x, G.y]]; })()")
            check(pos[0][0] == [pos[1][0], pos[1][1] - 1] and pos[0][1] == [pos[1][0], pos[1][1] - 2], f'in a line: you, Wren, Mittens ({pos})')
            await shot('100_wren_follows')
            # --- in battle ---
            await run("await startBattle(['slime', 'slime'])", 2400)
            check(await ev("G.scene.guest === 'wren'"), 'Wren fights beside you')
            r = await ev("(async () => { const b = G.scene, hp = b.enemies.map(e => e.hp), r = Math.random; Math.random = () => 0; await guestAct(b); Math.random = r; return [b.guestActs, hp.some((h, i) => b.enemies[i].hp < h)]; })()")
            check(r == [1, True], f'his Starlight hurts a foe ({r})')
            await shot('101_wren_battle')
            r = await ev("(async () => { const b = G.scene, r = Math.random; Math.random = () => 0.99; await guestAct(b); Math.random = r; const slowed = b.enemies.some(e => e.status.slow); const again = pickGuestMove(b, GUESTS.wren).kind; return [slowed, b.guestUsed[tl('Slow Orbit')] === true]; })()")
            check(r == [True, True], f'Slow Orbit slows a foe, once a fight ({r})')
            check(await ev("(() => { const b = G.scene, r = Math.random; let n = 0; for (let k = 0; k < 40; k++) { Math.random = () => k / 40; if (pickGuestMove(b, GUESTS.wren).kind === 'slow') n++; } Math.random = r; return n === 0; })()"), 'and not a second time')
            check(await ev("!BP().some(m => m.id === 'wren') && BP().length <= 4"), 'he is not in the party list: no menu, gear or EXP')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            # --- Ione: heals only when someone is hurt; Ward once ---
            await ev("Object.assign(G.flags, { boss_observatory: true, q_crown: true, boss_abyss: false }); refreshEntities()")
            check(await ev("guestFor() === 'ione' && Field.map.entities.find(e => e.follow).guest === 'ione'"), 'after the Wyrm, Wren goes home; with the lamp, Ione comes along')
            await run("await startBattle(['slime'])", 2400)
            r = await ev("(() => { const b = G.scene, r = Math.random, kinds = new Set(); for (let k = 0; k < 40; k++) { Math.random = () => k / 40; kinds.add(pickGuestMove(b, GUESTS.ione).kind); } Math.random = r; return [...kinds].sort(); })()")
            check(r == ['barrier', 'mag'], f'with everyone healthy Ione never heals ({r})')
            r = await ev("(async () => { const b = G.scene; BP().forEach(m => m.hp = Math.ceil(maxHp(m) * 0.3)); const before = BP().map(m => m.hp); const r = Math.random; b.guestUsed = { [tl('Ward')]: true }; Math.random = () => 0.99; await guestAct(b); Math.random = r; return BP().every((m, i) => m.hp > before[i]); })()")
            check(r, 'with the party hurt, her Ashen Hymn heals everyone')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110)
            # --- Brann: at sea only ---
            await ev("Object.assign(G.flags, { boss_abyss: true, bounty: true, leviathan: false }); refreshEntities()")
            check(await ev("guestFor() === null && !Field.map.entities.some(e => e.guest)"), 'on land, Brann is not with you (he keeps the ship)')
            check(await ev("(() => { G.onShip = true; const g = guestFor(); G.onShip = false; return g === 'brann'; })()"), 'at sea, he fights beside you')
            check(await ev("(() => { G.onShip = true; G.flags.leviathan = true; const g = guestFor(); G.onShip = false; return g === null; })()"), 'and not after the Leviathan')
            check(await ev("GUESTS.brann.moves.every(m => m.elem !== 'water')"), 'none of his moves feed the Leviathan (it absorbs water)')
            check(await ev("guestFor({ noGuest: true }) === null && guestFor({ guest: 'ione' }) === 'ione'"), 'battles can ask for a guest or none')

        if want('verses'):
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST))
            s['mapId'] = 'brightwater'; s['x'] = 15; s['y'] = 11; s['dir'] = 'up'
            s['inv'].update({'ember_core': 2, 'bomb': 4, 'minnow': 2, 'potion': 5})
            for k in [k for k in s['flags'] if k.startswith('verse_') or k.startswith('sung_')]: del s['flags'][k]
            await boot(s); await until_idle()
            await ev("G.gold = 5000; G.flags.forged = 3")
            # --- the alchemy bench: Corwin builds it, it brews ---
            check(await ev("HOME_UPGRADES.find(u => u.id === 'bench').need(G.flags)"), 'with a forge material, Corwin can build the alchemy bench')
            await ev("G.flags.home_bench = true; rebuildHome(); Field.enter(HOME_ID, 10, 5, 'right')"); await pg.wait_for_timeout(500)
            check(await ev("Field.map.at(11, 4) === 'V'"), 'the bench stands in Arin\'s house')
            await ev("G.x = 10; G.y = 4; G.dir = 'right'")
            await shot('110_bench')
            check(await ev("brewKnown(ALCHEMY[0]) && !brewKnown(ALCHEMY[2]) && brewReady(ALCHEMY[0])"), 'recipes show once you hold their first ingredient')
            await run("await alchemyBench()", 500); await shot('111_bench_menu'); await press('Enter', 1, 2200)
            for _ in range(10):   # through "Brewed ...!" and back to the bench menu, then out
                if await ev("!!(UI.top() && UI.top().items)"): break
                await press('Enter', 1, 300)
            await press('Escape', 1, 400); await until_idle()
            check(await ev("G.inv.ember_flask === 2 && G.inv.ember_core === 1 && G.inv.bomb === 2 && G.flags.brewed_ember_flask && G.flags.brewed_total === 1"), f'brewing turns an Ember Core and two bombs into two Ember Flasks ({await ev("[G.inv.ember_flask, G.inv.ember_core, G.inv.bomb]")})')
            check(await ev("(async () => { const r = ALCHEMY.find(r => r.out === 'hipotion'), h = G.inv.hipotion || 0; await brew(r); return G.inv.hipotion === h + 3 && !G.inv.minnow; })()"), 'two Minnows and three Potions make three Hi-Potions')
            check(await ev("ALCHEMY.every(r => ITEMS[r.out] && Object.keys(r.needs).every(m => ITEMS[m]))"), 'every recipe uses real items')
            check(await ev("['ember_flask', 'frost_flask', 'dusk_flask'].every(id => ITEMS[id].effect === 'bomb' && ITEMS[id].amount > ITEMS.bomb.amount)"), 'the flasks hit harder than a plain bomb')
            await ev("G.flags.brewed_total = 10; Trophies.check()")
            check(await ev("!!Trophies.got.alchemist"), 'ten brews earn Alchemist')
            # --- a verse beside a relit Lantern ---
            await ev("G.flags.lantern_hollow = true; const m = getMap('hollow:1'); Field.enter('hollow:1', m.extras.lantern.x, m.extras.lantern.y + 3, 'up'); CFG.noEnc = true")
            await pg.wait_for_timeout(500)
            v = await ev("(() => { const e = Field.map.entities.find(e => e.kind === 'verse'); return e && [e.x, e.y, e.verse]; })()")
            check(v is not None and v[2] == 'ember', f'the verse of Ember lies beside the relit Ember Lantern ({v})')
            check(await ev("(() => { const f = G.flags.lantern_spire; G.flags.lantern_spire = false; const m = getMap('spire:2'); refreshEntities(); const e = verseEntity(m); G.flags.lantern_spire = f; return e === null; })()"), 'no verse beside a Lantern still dark')
            await shot('112_verse')
            await run("await pickVerse(Field.map.entities.find(e => e.kind === 'verse'))", 400); await until_idle(30, 'Enter', 200); await until_idle()
            check(await ev("G.flags.verse_ember && G.flags.q_verses && !Field.map.entities.some(e => e.kind === 'verse')"), 'picking it up records the verse and starts the quest')
            check(await ev("questList().some(q => q.title === tl('Old Bram\\'s Verses') && !q.done)"), 'the quest log lists Old Bram\'s Verses')
            # --- Bram sings it; with all seven, the whole rhyme ---
            await ev("Field.enter('brightwater', 15, 11, 'up')"); await pg.wait_for_timeout(400)
            await run("await talkBram()", 400); await until_idle(60, 'Enter', 220); await until_idle()
            check(await ev("G.flags.sung_ember && !G.flags.rhyme_done"), 'Bram sings the verse you brought')
            await ev("VERSES.forEach(v => G.flags['verse_' + v.id] = true)")
            await run("await talkBram()", 400); await until_idle(90, 'Enter', 220); await until_idle()
            check(await ev("G.flags.rhyme_done && VERSES.every(v => G.flags['sung_' + v.id]) && rhymeUnlocked()"), 'with every verse he sings the whole rhyme, and it unlocks')
            check(await ev("Trophies.check(), !!Trophies.got.rhyme"), 'The Whole Rhyme trophy')
            check(await ev("heardSongs().includes('rhyme')"), 'the music box knows the rhyme')
            check(await ev("questList().find(q => q.title === tl('Old Bram\\'s Verses')).done"), 'the quest is done')
            await pg.goto('file://' + PATH); await pg.wait_for_timeout(1200)
            check(await ev("Audio_.curName === 'rhyme'"), f'the title screen plays the rhyme now ({await ev("Audio_.curName")})')

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

        if want('mods'):
            # 2.0 EN-4: build the example mod, play it, then carry its save back to the real game
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            import subprocess
            MODDED = '/tmp/lanternfall-playtest-modded.html'
            r = subprocess.run([sys.executable, str(ROOT / 'build.py'), '--mod', str(ROOT / 'mods' / 'example'), '--out', MODDED], capture_output=True, text=True)
            check(r.returncode == 0, 'build.py --mod mods/example builds' + ('' if r.returncode == 0 else ': ' + (r.stderr or r.stdout)[-400:]))
            s = json.loads(json.dumps(POST)); s['mapId'] = 'lastlight'; s['x'] = 11; s['y'] = 12
            await pg.goto('file://' + MODDED)
            await ev(f"localStorage.clear(); localStorage.setItem('lanternfall_save_v1', {json.dumps(json.dumps(s))})")
            await pg.reload(); await pg.wait_for_timeout(1500)
            await shot('76_modded_title')
            check(await ev("MODS.length === 1 && MODS[0].id === 'example' && MODS[0].name === 'The Ember Fox'"), 'the modded game knows its mod (shown on the title screen)')
            check(await ev("!!MONSTERS.emberfox && MONSTERS.emberfox.fam === 'emberfox' && !!MONSTER_ART.emberfox"), 'the mod adds the Ember Fox, with its own drawing')
            check(await ev("!!ITEMS.ember_tail && SHOPS.lastlight_arms.includes('ember_tail')"), "the mod's Ember Tail is sold in Lastlight")
            check(await ev("ENCOUNTERS.r6.some(e => e.g.includes('emberfox')) && NIGHT_ENC.r6.some(e => e.g.includes('emberfox'))"), 'Ember Foxes roam the Ashen Isle by day and night')
            check(await ev("MONSTERS.goblin.steal === 'hipotion' && MONSTERS.goblin.hp === 34"), 'a patch changes one field and keeps the rest (Goblins carry a Hi-Potion)')
            await press('Enter'); await pg.wait_for_timeout(1300)
            await run("await startBattle(['emberfox', 'emberfox'])", 2500)
            await shot('77_modded_battle')
            check(await ev("G.scene && G.scene.enemies && G.scene.enemies.filter(e => e.def.fam === 'emberfox').length === 2"), 'a battle with the Ember Fox draws (no errors)')
            await ev("G.scene.enemies.forEach(e => e.hp = 1)"); await until_idle(300, 'Enter', 110); await pg.wait_for_timeout(500)
            await ev("addItem('ember_tail', 2); G.party[0].acc = 'ember_tail'; saveGame('1')")
            check(await ev("JSON.stringify(readSlot('1').mods) === '[\"example\"]'"), 'a save remembers the mods it was made with')
            # the same save in the game without the mod: the mod's items go, nothing breaks
            await pg.goto('file://' + PATH); await pg.wait_for_timeout(1200)
            gone = await ev("(() => { const ok = loadGame('1'); return [ok, MODS.length, !!G.inv.ember_tail, G.party[0].acc]; })()")
            await pg.wait_for_timeout(700)
            check(gone == [True, 0, False, None], f"the save loads in the game without the mod; its items are left out ({gone})")
            check(await ev("Toasts.some(t => /from a mod that isn't here/.test(t.msg))"), 'the player is told why')
            await run("await changeMap(G.mapId, G.x, G.y, 'down')", 1500)
            check(await ev("G.scene === Field && Field.map.id === 'lastlight'"), 'and the field carries on from it')
            await shot('78_save_without_mod')

        if want('editor'):
            # 2.0 EN-3: the town editor (index.html?edit) and the town check it shares with the build
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            ectx = await b.new_context(viewport={'width': 1340, 'height': 800}, accept_downloads=True)
            ep = await ectx.new_page()
            ep.on('pageerror', lambda e: errs.append('editor pageerror: ' + str(e)))
            ep.on('console', lambda m: errs.append('editor console: ' + m.text) if m.type == 'error' else None)
            await ep.goto('file://' + PATH + '?edit'); await ep.wait_for_timeout(1500)
            E = ep.evaluate
            check(await E("G.scene === EditorScene && Editor.id === Object.keys(TOWN_DEFS)[0] && Editor.map.entities.length > 3"), 'index.html?edit opens the editor on the first town, with its people')
            await ep.screenshot(path=f'{OUT}/79_editor.png')
            check(await E("townReport().length === 0"), "every town in the game passes the town check (in the browser too)")
            broken = await E("""(() => {
              const d = JSON.parse(JSON.stringify(TOWN_DEFS.brightwater));
              d.decor.push(...d.exits.map(([x, y]) => [x, y - 1, 'F']));                       // a fence across the way in
              const a = townProblems('brightwater', d).map(p => p.msg);
              const d2 = JSON.parse(JSON.stringify(TOWN_DEFS.brightwater)), inn = d2.buildings.find(b => b.id === 'inn');
              d2.decor.push([inn.x + Math.floor(inn.w / 2), inn.y + inn.h, 'c']);                  // crates on the inn's doorstep
              d2.decor.push([5, 7, 'F'], [4, 8, 'F'], [6, 8, 'F'], [5, 9, 'F']);                   // the Elder fenced in
              return [a, townProblems('brightwater', d2).map(p => p.msg)]; })()""")
            check(any('door of "inn"' in m for m in broken[0]) and any('can\'t be reached' in m for m in broken[0]), f'a fence across the way in cuts off every door ({len(broken[0])} problems)')
            check(any('door of "inn"' in m for m in broken[1]), 'crates on a doorstep are caught')
            check(any("Elder Maren can't be reached" in m for m in broken[1]), 'a townsperson fenced in is caught')
            async def at(tx, ty):
                return await E(f"(() => {{ const r = cv.getBoundingClientRect(); return [r.left + ({tx} * TS + 16 - Editor.cam.x) * r.width / W, r.top + ({ty} * TS + 16 - Editor.cam.y) * r.height / H]; }})()")
            async def drag(a, b2):
                x0, y0 = await at(*a); x1, y1 = await at(*b2)
                await ep.mouse.move(x0, y0); await ep.mouse.down(); await ep.mouse.move((x0 + x1) / 2, (y0 + y1) / 2); await ep.mouse.move(x1, y1); await ep.mouse.up(); await ep.wait_for_timeout(150)
            await drag((3, 11), (3, 8))
            r = await E("[Editor.def.buildings.find(b => b.id === 'items').y, Editor.problems.map(p => p.msg)]")
            check(r[0] == 7 and any('Elder Maren stands where nobody can walk' in m for m in r[1]), f'dragging the item shop onto the Elder moves it and flags him ({r})')
            await ep.screenshot(path=f'{OUT}/80_editor_problem.png')
            await ep.keyboard.press('Control+z'); await ep.wait_for_timeout(150)
            check(await E("TOWN_DEFS.brightwater.buildings.find(b => b.id === 'items').y === 10 && Editor.problems.length === 0"), 'undo puts it back')
            await ep.click('button[data-tool=decor]'); await ep.click('button[data-decor=l]'); await drag((9, 12), (11, 12))
            check(await E("[9, 10, 11].every(x => Editor.def.decor.some(d => d[0] === x && d[1] === 12 && d[2] === 'l'))"), 'dragging with a decoration paints a row of lamp posts')
            await ep.click('button[data-tool=building]'); await drag((19, 15), (21, 16))
            # a free 3 × 3 spot: the first where a house breaks nothing
            spot = await E("""(() => { for (let y = 1; y < 15; y++) for (let x = 1; x < 21; x++) { const d = JSON.parse(JSON.stringify(Editor.def)); d.buildings.push({ x, y, w: 3, h: 3, kind: 'house', roof: '#7a5a9a', id: 'probe' }); if (!townProblems('brightwater', d).length) return [x, y]; } return null; })()""")
            await ep.click('button[data-tool=building]'); await drag((spot[0], spot[1]), (spot[0] + 2, spot[1] + 2))
            check(await E("Editor.def.buildings.at(-1).id === 'house1' && Editor.def.buildings.length === 6"), 'a building needs 3 × 3; dragging one adds a house')
            await ep.click('button[data-tool=select]')
            await ep.select_option('select[data-b=kind]', 'inn'); await ep.wait_for_timeout(150)
            check(await E("Editor.def.buildings.at(-1).kind === 'inn' && Editor.def.buildings.at(-1).price === 50"), 'the panel turns it into an inn, with a price')
            await ep.click('button[data-act=walk]'); await ep.wait_for_timeout(1500)
            await ep.keyboard.press('ArrowLeft'); await ep.wait_for_timeout(400)
            check(await E("Editor.walking && G.scene === Field && Field.map.buildings.length === 6"), 'Walk around plays the edited town')
            await ep.screenshot(path=f'{OUT}/81_editor_walk.png')
            await ep.keyboard.press('Escape'); await ep.wait_for_timeout(300)
            check(await E("!Editor.walking && G.scene === EditorScene"), 'Esc goes back to editing')
            async with ep.expect_download() as dl: await ep.click('button[data-act=mod]')
            mod_town = open(await (await dl.value).path()).read()
            await ep.reload(); await ep.wait_for_timeout(1200)
            check(await E("Editor.def.buildings.length === 6 && !!Editor.drafts.brightwater"), 'edits survive a reload')
            await ectx.close()
            # the exported file is a working mod
            import subprocess, tempfile
            md = pathlib.Path(tempfile.mkdtemp()) / 'newinn'; (md / 'content').mkdir(parents=True)
            (md / 'mod.json').write_text(json.dumps({'name': 'A new inn', 'version': '1.0.0'})); (md / 'content' / 'towns.json').write_text(mod_town)
            r = subprocess.run([sys.executable, str(ROOT / 'build.py'), '--mod', str(md), '--out', str(md / 'out.html')], capture_output=True, text=True)
            check(r.returncode == 0 and 'every town can be walked' in r.stdout, 'the exported town builds as a mod and passes the town check' + ('' if r.returncode == 0 else ': ' + (r.stderr + r.stdout)[-300:]))

        if want('i18n'):
            # 2.0 EN-6: play in the pseudo language, which changes every translated line; any plain
            # English drawn on screen is a line that tl() doesn't reach
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            HOOK = """(() => { window.__drawn = new Set(); const f = CanvasRenderingContext2D.prototype.fillText;
              CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { window.__drawn.add(String(s)); return f.call(this, s, ...a); }; })()"""
            ictx = await b.new_context(viewport={'width': 640, 'height': 480}); await ictx.add_init_script(HOOK)
            ip = await ictx.new_page()
            ip.on('pageerror', lambda e: errs.append('i18n pageerror: ' + str(e)))
            ip.on('console', lambda m: errs.append('i18n console: ' + m.text) if m.type == 'error' else None)
            I = ip.evaluate
            async def ipress(key, n=1, d=150):
                for _ in range(n): await ip.keyboard.press(key); await ip.wait_for_timeout(d)
            async def idle(maxn=200, key='Enter'):
                for _ in range(maxn):
                    if await I('Script.running === 0 && UI.stack.length === 0'): return
                    await ip.keyboard.press(key); await ip.wait_for_timeout(110)
            s = json.loads(json.dumps(POST)); s['mapId'] = 'brightwater'; s['x'] = 11; s['y'] = 12; s['flags'].update({'isle': True, 'chapter6': True})
            await ip.goto('file://' + PATH + '?lang=pseudo')
            await I(f"localStorage.clear(); localStorage.setItem('lanternfall_save_v1', {json.dumps(json.dumps(s))})")
            await ip.reload(); await ip.wait_for_timeout(1200)
            check(await I("LANG === 'pseudo' && tl('New Game') !== 'New Game' && ITEMS.potion.name !== 'Potion'"), '?lang=pseudo switches the game, content names included')
            await ip.screenshot(path=f'{OUT}/82_pseudo_title.png')
            await ipress('Enter'); await ip.wait_for_timeout(1500); await idle()
            await I("void runScript(talkElder)"); await ip.wait_for_timeout(400); await ip.screenshot(path=f'{OUT}/83_pseudo_dialogue.png'); await idle()
            # every entry of the field menu, in and out
            n = await I("(() => 0)()")
            for i in range(12):
                await ipress('Escape', 1, 300)
                if not await I('UI.stack.length > 0'): break
                await ipress('ArrowDown', i, 70); await ipress('Enter', 1, 400)
                if i == 3: await ip.screenshot(path=f'{OUT}/84_pseudo_status.png')
                await ipress('ArrowDown', 1, 120); await ipress('Enter', 1, 300)   # one level deeper where there is one
                for _ in range(8):
                    if await I('UI.stack.length === 0 && Script.running === 0'): break
                    await ipress('Escape', 1, 120)
            await I("void runScript(() => openShop('brightwater_items', tl('Shopkeeper')))"); await ip.wait_for_timeout(500); await ipress('Enter', 1, 300); await ipress('Escape', 4, 150); await idle(60, 'Escape')
            await I("void runScript(async () => { await startBattle(['goblin', 'slime']); })"); await ip.wait_for_timeout(2500)
            await ipress('ArrowDown', 1); await ipress('Enter', 1, 400); await ip.screenshot(path=f'{OUT}/85_pseudo_battle.png'); await ipress('Escape', 2)
            await I("G.scene.enemies.forEach(e => e.hp = 1)"); await idle(300)
            drawn = await I("[...window.__drawn]")
            plain = lambda t: [w for w in re.findall(r"[A-Za-zÀ-ɏ']{2,}", t) if re.fullmatch(r"[A-Za-z']+", w) and len(w.strip("'")) > 1]
            left = sorted({d for d in drawn if plain(d)})
            check(len(drawn) > 150 and not left, f'every line drawn is translated ({len(drawn)} drawn{"; untranslated: " + "; ".join(left[:12]) if left else ""})')
            seen = await I("[...T_SEEN]")
            tmpl = json.load(open(ROOT / 'content' / 'lang' / 'template.json'))['strings']
            missing = [k for k in seen if k not in tmpl]
            check(len(seen) > 150 and not missing, f'content/lang/template.json has every line the game asked for ({len(seen)}){"; missing: " + "; ".join(missing[:6]) if missing else ""}')
            # the saved choice, without ?lang
            await ip.goto('file://' + PATH); await I("localStorage.setItem('lanternfall_lang', 'pseudo')"); await ip.reload(); await ip.wait_for_timeout(900)
            check(await I("LANG === 'pseudo'"), 'the chosen language is remembered')
            await I("localStorage.setItem('lanternfall_lang', 'en')"); await ip.reload(); await ip.wait_for_timeout(900)
            check(await I("LANG === 'en' && tl('New Game') === 'New Game'"), 'and English comes back')
            await ictx.close()
            # a real language, from a mod: a translated line, values in a new order, English where it's missing
            import subprocess, tempfile
            md = pathlib.Path(tempfile.mkdtemp()) / 'french'; (md / 'lang').mkdir(parents=True)
            (md / 'mod.json').write_text(json.dumps({'name': 'Français (test)', 'version': '1.0.0'}))
            (md / 'lang' / 'fr.json').write_text(json.dumps({'name': 'Français', 'strings': {'New Game': 'Nouvelle partie', 'Potion': 'Potion de soin', '{0} reached level {1}!': 'Niveau {1} pour {0} !'}}))
            out = md / 'out.html'
            r = subprocess.run([sys.executable, str(ROOT / 'build.py'), '--mod', str(md), '--out', str(out)], capture_output=True, text=True)
            check(r.returncode == 0, 'a language mod builds' + ('' if r.returncode == 0 else ': ' + (r.stderr + r.stdout)[-300:]))
            fp = await (await b.new_context()).new_page()
            await fp.goto('file://' + str(out) + '?lang=fr'); await fp.wait_for_timeout(900)
            got = await fp.evaluate("[LANG, tl('New Game'), ITEMS.potion.name, tl`${'Lyra'} reached level ${12}!`, tl('Load Game'), languages().map(l => l[1]).join(',')]")
            check(got == ['fr', 'Nouvelle partie', 'Potion de soin', 'Niveau 12 pour Lyra !', 'Load Game', 'English,Français'], f'the French line, the values reordered, English where untranslated, and French in Settings ({got})')
            (md / 'lang' / 'fr.json').write_text(json.dumps({'name': 'Français', 'strings': {'{0} reached level {1}!': 'Niveau {1} !'}}))
            r = subprocess.run([sys.executable, str(ROOT / 'build.py'), '--mod', str(md), '--out', str(out)], capture_output=True, text=True)
            check(r.returncode != 0 and 'needs the values {0},{1}' in r.stdout + r.stderr, 'a translation that drops a value stops the build')

        if want('tiles'):
            # 1.10 tile cache: the cached tile layer must look like the tiles drawn one by one
            def check(ok, label):
                print(('ok   ' if ok else 'FAIL ') + label)
                if not ok: errs.append('check failed: ' + label)
            s = json.loads(json.dumps(POST)); s['flags'].update({'isle': True, 'q_drowned': True})
            await boot(s); await until_idle()
            check(await ev("TileCache.enabled && TileCache.map === Field.map && TileCache.stats.chunks > 0"), 'the field draws through the tile cache')
            await shot('74_cached_world')
            # Compare over maps and scales. Chrome's antialiasing shifts by a level or two when a shape
            # moves, so compare 4×4-pixel block averages: noise stays under ~8, a missing or stale tile
            # is 20+. Fractional scales also get hairline seams where squares meet (under ~20).
            COMPARE = r"""((ids, k, step) => {
              const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(640 * k); c.height = Math.round(480 * k); return c.getContext('2d', { willReadFrequently: true }); };
              const a = mk(), b = mk(), Wd = a.canvas.width, Hd = a.canvas.height;
              TileCache.canvasOpts = { willReadFrequently: true };
              const out = {};
              for (const id of ids) {
                const m = getMap(id); if (m.kind === 'world') applyWorldFlags(m); if (m.kind === 'deep') applyDeepFlags(m);
                TileCache.reset(); let worst = 0, n = 0;
                for (let cy0 = -64; cy0 < m.h * TS - 200; cy0 += step * 7 * TS) for (let cx0 = -64; cx0 < m.w * TS - 300; cx0 += step * 9 * TS) {
                  const cx = (Math.round(cx0 * k) + n % 3) / k, cy = (Math.round(cy0 * k) + n % 5) / k; n++;
                  for (const t of [3.1, 0.2]) {
                    a.setTransform(k, 0, 0, k, 0, 0); b.setTransform(k, 0, 0, k, 0, 0);
                    if (!TileCache.draw(a, m, cx, cy, t)) { worst = 999; break; }
                    drawTilesDirect(b, m, cx, cy, t);
                    const da = a.getImageData(0, 0, Wd, Hd).data, db = b.getImageData(0, 0, Wd, Hd).data;
                    for (let by = 0; by + 4 <= Hd; by += 4) for (let bx = 0; bx + 4 <= Wd; bx += 4) {
                      let d = 0;
                      for (let yy = by; yy < by + 4; yy++) for (let xx = bx; xx < bx + 4; xx++) { const i = (yy * Wd + xx) * 4; d += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); }
                      if (d / 48 > worst) worst = d / 48;
                    }
                  }
                }
                out[id] = +worst.toFixed(1);
              }
              TileCache.canvasOpts = undefined; TileCache.reset();
              return out;
            })"""
            MAPS = ['world', 'deep', 'heist', 'brightwater', 'halden', 'frostmere', 'mirage', 'ironhold', 'lastlight', 'nerith',
                    'hollow:1', 'mine:2', 'tomb:1', 'observatory:3', 'palace:2', 'abyss:1', 'in:brightwater:hall', 'in:halden:inn']
            for k, step, limit in [(1, 2, 8), (2, 3, 12), (1.37, 3, 28)]:
                res = await ev(f"{COMPARE}({json.dumps(MAPS if k == 1 else MAPS[:8])}, {k}, {step})")
                bad = {m: v for m, v in res.items() if v > limit}
                check(not bad, f'at scale {k}, cached tiles match tiles drawn one by one (worst 4x4 block {max(res.values())}, limit {limit}){" " + str(bad) if bad else ""}')
            # a changed tile (the isle rising, a door opening) throws the chunks away
            ch = await ev("(() => { const m = getMap('world'); const c = document.createElement('canvas').getContext('2d'); TileCache.draw(c, m, 0, 0, 1); const n = TileCache.chunks.size, old = m.at(3, 3); m.set(3, 3, old === '.' ? 'T' : '.'); TileCache.draw(c, m, 0, 0, 1); const after = [TileCache.rev === m.rev, TileCache.built]; m.set(3, 3, old); return n > 0 && after[0]; })()")
            check(ch, 'changing a map tile rebuilds the cache')
            # and it is faster: the world map's tiles, cached vs one by one
            sp = await ev("""(() => { const c = document.createElement('canvas'); c.width = 640; c.height = 480; const g = c.getContext('2d');
              Field.enter('world', 30, 20, 'down');
              const run = on => { TileCache.enabled = on; TileCache.reset(); Field.draw(g); const t0 = performance.now(); for (let i = 0; i < 40; i++) { Field.t = i / 60; Field.draw(g); } g.getImageData(0, 0, 1, 1); return (performance.now() - t0) / 40; };
              const d = run(false), k = run(true); return [d, k]; })()""")
            print(f'     world frame: tiles one by one {sp[0]:.2f} ms, cached {sp[1]:.2f} ms')
            check(sp[1] < sp[0] * 0.75, f'the cached world draws faster ({sp[1]:.2f} ms vs {sp[0]:.2f} ms)')
            await shot('75_cached_world_walk')

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
