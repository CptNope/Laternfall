# Testing Lanternfall

Lanternfall has no unit tests. It's tested by **playing it**: either by hand in a browser, or automatically with a headless browser that presses keys for you. This page covers both.

## Contents

- [Quick checks by hand](#quick-checks-by-hand)
- [The play-test harness](#the-play-test-harness)
- [Scenarios](#scenarios)
- [How the harness works](#how-the-harness-works)
- [Writing a new scenario](#writing-a-new-scenario)
- [Balance simulator](#balance-simulator)
- [Debugging tricks](#debugging-tricks)
- [Docs checks](#docs-checks)
- [Continuous integration](#continuous-integration)

---

## Quick checks by hand

1. `python3 build.py`
2. Open `index.html` in a browser and open the developer console (F12).
3. Add `?noenc` to the URL to turn off random encounters while you walk around.
4. Nothing should appear in red in the console.

| Check | How |
| --- | --- |
| New Game starts | Title → New Game → the intro text → Brightwater |
| Old saves load | Keep an old save in your browser, then Continue |
| Touch controls | Use the browser's device toolbar (Ctrl+Shift+M) with a touch device selected |
| Audio | Press a key first (browsers block audio until you do), then M to toggle |

---

## The play-test harness

`tools/playtest.py` drives the real game in headless Chrome. It seeds a save, presses keys, takes screenshots, and **fails if the page logs any JavaScript error**.

```bash
pip install playwright
playwright install chromium            # or set CHROME=/path/to/chrome to use one you have

python3 build.py
python3 tools/playtest.py                                  # default scenarios, screenshots in playtest-shots/
python3 tools/playtest.py index.html /tmp/shots chapter    # one scenario, chosen output folder
```

The output looks like this:

```text
shot 01_isle_cutscene
isle cutscene presses 12 isle= True obj= Chapter VI: Sail or fly to the island that rose in the far northeast sea.
...
finale presses 422 boss_abyss True chapter6 True crown item True
ERRORS: 0
```

The exit code is `0` when there were no errors and `1` otherwise, so it can gate CI.

---

## Scenarios

| Scenario | What it does | Checks | Screenshots |
| --- | --- | --- | --- |
| `chapter` | Loads a post-ending save at Lv 45 and plays Chapter VI from start to end: the isle rising, Lastlight, Warden Ione, the Ward Hall, the Abyss, a memory scene, both boss phases (HP shrunk to 400) and the epilogue | `isle`, `q_crown`, `combo_lastlight`, `mem1`, `boss_abyss`, `chapter6` flags; the Crown of Dusk & Dawn received | `01`–`09` |
| `orun` | Real battles against Orun, Ashen Isle monsters and Abyss monsters on their own backgrounds | Battles finish; materials drop | `10`–`12` |
| `systems` | Gets the fishing rod, fishes until a catch, forges at Orrin's, toggles Config, opens the quest log and the Lastlight shop | A fish in the inventory; the Forgeheart Ring forged; `CFG` saved | `13`–`19` |
| `newgame` | Starts a fresh game, walks with auto-dash, checks the isle is still underwater, fights an early encounter and an isle encounter | Party is Arin and Lyra at Lv 1; isle tiles are `~` before the ending; isle encounters use the `ash` background | `20`–`21` |
| `comfort` | Seeds a 1.x save and checks it migrates into slot 1; saves to slot 2; auto-save on entering a town; Config; a battle at 4× where round 2 is repeated with Shift; equipment optimisation; the Log; a fake gamepad walking the hero; the post-game encounter toggle; the title's Load Game menu | Save `version` 2, legacy key kept, Auto slot written, repeat deals damage, the hero moves on gamepad input | `22`–`27` |
| `hearts` | All five hero quests from a post-Chapter-VI save: Elder Maren and the 12 lamps (the last wakes the Lamp-Eater), Mira and the Ember Caves riddles and Hearth Warden, Wenna and the Grotto, the jail trapdoor and Vane, an inn dream where Selene fights alone, every hero using a Limit in one battle, a campfire talk, the festival | Each quest's `*_done` and `limit_*` flags and weapon; the Undercity exits to the jail; Limit gauges empty after use; Heartlight received | `30`–`41` |
| `depth` | The 1.6 systems from a Lv 45 save at the Ironhold inn (seeded as a 1.x save, so it also tests the v1→v3 migration) | 19 named checks: 16 Embers each after migration; lighting Vigor with the keyboard; Counter and MP Saver; Vigor's +10% HP; cooking Grilled Trout at the inn and its +12% ATK; fire healing a Magma Slime; Haste and Slow turn speed; the meal counting down; Vane's phase change and its announcement; a rare steal; Sable's two rewards; the board and meal surviving save/load. A failed check counts as an error | `42`–`47` |
| `drowned` | 1.7 from a post-game save in Port Halden (Oswin's quest done) | 22 named checks: Wenna's chart; Brann's bell and its cost; diving onto the sea floor below the spot; entering Nerith; the palace staying shut until Ysolde; Nereus, the Crown and the Rift opening; the Tide and Tidesong; surfacing at another spot; digging map 1; map drops; Old Ivy and a moth ride with no battles; the Undermarket in and out; black-market prices; a save on the sea floor | `48`–`57` |
| `readme` | Takes clean screenshots for the README | — | Lastlight, Ashen Isle, Abyss, Hollow Crown, fishing |

```mermaid
flowchart LR
    subgraph chapter
      c1[Seed a post-ending save] --> c2[World: the isle rises] --> c3[Lastlight + Ione] --> c4[Abyss 1F → 2F memory] --> c5[4F: Crown → Orun] --> c6[Epilogue]
    end
    subgraph systems
      s1[Frostmere: get the rod] --> s2[Fish: wait, bite, reel] --> s3[Ironhold: forge] --> s4[Config, quests, shop]
    end
    subgraph newgame
      n1[Clear storage] --> n2[Intro] --> n3[Walk] --> n4[Isle still hidden] --> n5[Encounters]
    end
```

---

## How the harness works

```mermaid
sequenceDiagram
    participant Py as playtest.py
    participant Br as Headless Chrome
    participant G as Game (index.html)
    Py->>Br: open file://index.html
    Py->>G: localStorage.setItem(save JSON)
    Py->>Br: reload, press Enter (Continue)
    loop each step
        Py->>G: evaluate "void runScript(async () => { ... })"
        Py->>Br: press Enter until Script.running == 0 and UI.stack is empty
        Py->>Br: screenshot
        Py->>G: evaluate checks (G.flags, hasItem, G.mapId)
    end
    Br-->>Py: console errors and page errors collected throughout
    Py->>Py: exit 1 if any error
```

**Key helpers**

| Helper | Purpose |
| --- | --- |
| `boot(save)` | Clears storage, writes a **1.x-format** save (so every scenario also exercises the migration), reloads, and presses Enter to Continue |
| `run(js)` | Starts a game script, such as `await talkIone()` or `await enterLocation('G')`. It uses `void runScript(...)` so `evaluate` doesn't wait on the game's promise |
| `until_idle()` | Presses Enter until no script is running and no UI is open (it skips through dialogue) |
| `ev(js)` | Reads game state: `G.flags.isle`, `hasItem('forge_ring')`, `fishKinds()` |
| `shot(name)` | Saves a screenshot |

**Seeding saves.** `POST` in the script is a post-ending save at Lv 45 with the whole party. Copy it and adjust the `flags`, `mapId`, `x`, `y` and `inv` to start anywhere. The save format is documented in [ARCHITECTURE.md](ARCHITECTURE.md#game-state-and-saves).

**Fast bosses.** Before a fight, `ev("MONSTERS.crown.hp = 400")` shrinks a boss so a scenario finishes quickly. This tests the flow, not the balance. For balance, see [ROADMAP ST-1](../ROADMAP.md#13x--stabilise).

**Mini-games.** The fishing scenario reads the UI component's state (`UI.top().state`, `.pos`, `.zone`) and presses Enter at the right moment, so it's deterministic.

---

## Writing a new scenario

```python
if want('myquest'):
    s = json.loads(json.dumps(POST))                    # copy the base save
    s['flags'].update({'q_scarf': True}); s['mapId'] = 'frostmere'; s['x'] = 6; s['y'] = 14
    await boot(s); await until_idle()
    await run("await talkMarta()"); await until_idle()
    assert await ev("G.flags.scarf_done") is not True   # not finished yet
    await run("const m = getMap('observatory:0'); await changeMap(m.id, m.extras.spot.x, m.extras.spot.y + 1, 'up')", 800)
    await run("await Field.map.entities.find(e => e.kind === 'glint').talk()"); await until_idle()
    print('scarf', await ev("hasItem('red_scarf')"))
    await shot('30_scarf')
```

Run it with `python3 tools/playtest.py index.html /tmp/shots myquest`.

**Tips**

- Always wrap game calls in `run(...)`. Never `await` a game promise directly in `evaluate`.
- After any `run`, call `until_idle()` before the next step.
- Use `G.x`, `G.y`, `G.dir` and `Field.anim = null` to place the player exactly; use `changeMap(...)` to move between maps with all the hooks.
- `ev("G.scene.enemies.forEach(e => e.hp = 1)")` ends a battle on the next hit.

---

## Balance simulator

`tools/balance_sim.py` answers "is this boss fair?" with numbers. It loads the game, injects `tools/balance_sim.js`, which makes the **real** battle code run instantly and lets a simple AI play the party, and then fights each scenario many times.

```bash
python3 tools/balance_sim.py        # 40 runs per scenario
python3 tools/balance_sim.py 100    # more runs, steadier numbers
```

```text
scenario                                 win  rounds (min-max)   KOs  items used per fight
Chapter VI finale Lv42 shop              68%     22 (5-27)      2.4   hiether:3.5 remedy:3.5 plume:0.9 ...
Chapter VI finale Lv42 mid               82%     22 (9-28)      1.4   hiether:4.0 xpotion:0.3 plume:0.5
Chapter VI finale Lv50 best             100%     13 (11-16)      0.0   hiether:1.9 remedy:1.4
```

```mermaid
flowchart LR
    SC[Scenario<br/>party, level, gear, items, bosses] --> SET[setup: build the party<br/>with makeMember + gear]
    SET --> B[new Battle with the real rules<br/>wait and fade made instant]
    B --> AI[AI commandPhase<br/>revive, heal, Barrier, Remedy,<br/>then the strongest attack]
    AI --> B
    B --> R[win or lose, rounds, KOs, items]
    R --> T[(table)]
```

The 1.5 scenarios add the five hero-quest bosses at Lv 44, plus Selene alone against Vesper's Echo (a scenario's `party` can be a single hero).

**The AI** uses a Limit whenever one is ready, revives fallen heroes, heals when two or more are hurt, keeps Barrier and Rally up against bosses, cures a silenced healer with a Remedy, and otherwise uses each hero's strongest affordable attack. It never uses combos, so real players usually finish a little faster.

**Loadouts:** `SHOP` (Lastlight shop gear), `MID` (loot from the Spire and the tomb, mid arena prizes) and `BEST` (forged weapons and top prizes). Add your own dictionaries for other points in the game.

## Debugging tricks

Paste these into the browser console while playing.

| Goal | Console |
| --- | --- |
| No encounters | Open `index.html?noenc`, or `G.flags.noEnc = true` |
| Teleport on the world map | `G.x = 79; G.y = 10` |
| Go to a map | `runScript(() => changeMap('abyss:3', 18, 14, 'up'))` |
| Enter a location | `runScript(() => enterLocation('G'))` |
| Give an item | `addItem('fishing_rod')` |
| Set a flag | `G.flags.isle = true; applyWorldFlags(getMap('world'))` |
| Level up | `G.party.forEach(m => { m.level = 45; m.xp = xpForLevel(45); }); healAll()` |
| Start a battle | `runScript(() => startBattle(['crown'], { boss: true, bg: 'crownfall' }))` |
| Print the world | `console.log(getMap('world').tiles.map(r => r.join('')).join('\n'))` |
| Current objective | `mainObjective()` |
| List saves | `ALL_SLOTS.map(s => slotSummary(s))` |
| Save to a slot | `saveGame('2')` |
| Wipe every save | `localStorage.clear()` |
| Fake a gamepad | `navigator.getGamepads = () => [{ buttons: Array.from({length: 16}, (_, i) => ({ pressed: i === 13 })), axes: [0, 0] }]` (holds D-pad down) |

---

## Docs checks

```bash
python3 tools/gentables.py                                  # regenerate docs/GAME_GUIDE.md from data.js
tools/check_mermaid.sh README.md ROADMAP.md CHANGELOG.md docs/*.md
```

`check_mermaid.sh` renders every diagram with the Mermaid CLI and lists any that fail to parse. GitHub would show those as an error box. Set `CHROME=/path/to/chrome` to skip downloading a browser.

---

## Continuous integration

`.github/workflows/playtest.yml` runs on every pull request and on pushes to `main`. It:

1. builds the game and fails if `index.html` doesn't match `src/` (someone forgot to run `build.py`);
2. regenerates the game guide and fails if `docs/GAME_GUIDE.md` is out of date;
3. runs the `chapter`, `systems`, `newgame`, `comfort`, `hearts`, `depth` and `drowned` scenarios, failing on any JavaScript error or failed check;
4. uploads the screenshots as a `playtest-screenshots` artifact.

```mermaid
flowchart LR
    PR[Pull request] --> B[python3 build.py<br/>git diff index.html]
    B --> GG[gentables.py<br/>git diff GAME_GUIDE.md]
    GG --> PT[playtest.py<br/>5 scenarios]
    PT --> A[(screenshots artifact)]
    PT -->|any JS error| X[❌ fail]
    PT -->|ERRORS: 0| OK[✅ pass]
```
