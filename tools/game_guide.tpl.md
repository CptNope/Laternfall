# Lanternfall Game Guide

A complete guide to Lanternfall 1.3: the walkthrough, every hero, skill, monster, boss, item, shop, quest, fish and forge recipe, plus the battle formulas.

> **Spoilers.** Everything is in here, including Chapter VI. The [Walkthrough](#walkthrough) keeps the story vague, but the tables don't.

> The data tables are generated from `src/data.js` with `tools/gentables.py`, so they match the game exactly. To change a number, edit the data file and regenerate; don't edit the tables by hand. See [MODDING.md](MODDING.md#regenerating-the-guide-tables).

## Contents

- [Walkthrough](#walkthrough)
- [Hearts of the Lamplighters](#hearts-of-the-lamplighters)
- [The world](#the-world)
- [Towns, inns and shops](#towns-inns-and-shops)
- [Dungeons](#dungeons)
- [The party](#the-party)
- [Combo techs](#combo-techs)
- [Limits](#limits)
- [How battles work](#how-battles-work)
- [Bosses](#bosses)
- [Monsters by area](#monsters-by-area)
- [Side quests](#side-quests)
- [The Aerie Arena](#the-aerie-arena)
- [Fishing](#fishing)
- [Orrin's Forge](#orrins-forge)
- [Equipment](#equipment)
- [Items](#items)
- [Levels and EXP](#levels-and-exp)
- [New Game+](#new-game)

---

## Walkthrough

The main quest, in order. Each box is a goal from the quest log. Dashed lines are optional content, shown where it unlocks.

```mermaid
flowchart TD
    A([New Game: Brightwater]) --> B[Speak with Elder Maren]
    B --> C[Whisperwood Hollow<br/>Boss: Gloomcap]
    C --> D[Report to Maren:<br/>the river bridge opens]
    D --> E[Port Halden: Oswin joins]
    E --> F[Sunken Shrine<br/>Boss: Drowned Warden]
    F --> G[Brann gives you the ship Dawnrunner]
    G --> H[Ironhold: meet Kestrel in the jail]
    H --> I[Captain Dunmar frees Kestrel]
    I --> J[Emberdeep Mines<br/>Boss: Vesper]
    J --> K[Dawn Key; Selene can join in Ironhold]
    K --> L[Isle of Dusk: Hollow Spire<br/>Boss: the Hollow King, 2 phases]
    L --> M([Ending and credits])
    M --> N[Step onto the world map:<br/>the Ashen Isle rises]
    N --> O[Lastlight: Warden Ione]
    O --> P[Crownfall Abyss<br/>Bosses: Hollow Crown, then Orun]
    P --> Q([Chapter VI complete])

    G -. bounty .-> LV[Leviathan in the whirlpool]
    G -. sail east .-> MI[Mirage: Sultana Imara]
    MI -.-> TB[Tomb of the First King<br/>Boss: Ozymar]
    TB -.-> AS[Airship Aurora]
    AS -.-> AE[Aerie and the Arena]
    K -. Wren's chart .-> OB[Starfall Observatory<br/>Superboss: Astral Wyrm]
    M -. after ending .-> EC[Eclipse Cup, Lantern Koi]
    M -. after ending .-> HL[Hearts of the Lamplighters<br/>five hero quests]

    classDef boss fill:#5a2a3a,stroke:#ff8a8a,color:#fff
    classDef opt fill:#24324a,stroke:#8ab0ff,color:#fff
    class C,F,J,L,P boss
    class LV,MI,TB,AS,AE,OB,EC,HL opt
```

### Act by act

| Act | Goal | Where | Key unlock |
| --- | --- | --- | --- |
| I · Ember | Relight the Ember Lantern | Whisperwood Hollow, northwest of Brightwater | The river bridge east |
| II · Tide | Relight the Tide Lantern with Oswin | Sunken Shrine, south of Port Halden (only a tide priest can open it) | The ship *Dawnrunner* |
| III · Stone | Free Kestrel, then go down through the smugglers' tunnel | Emberdeep Mines, north of Ironhold | Dawn Key; Selene can join |
| IV · Dawn | Climb the Hollow Spire | Isle of Dusk, east across the sea | The ending |
| Optional | Open the First King's tomb with the Sun Seal | Tomb of the First King, south of Mirage (Lv 26+) | The airship *Aurora* |
| Optional | Find the Fifth Flame with Wren's Star Chart | Starfall Observatory, the island west of Frostmere (Lv 32+) | The Fifth Flame accessory |
| VI · Night | Bring the Hollow Crown down | Crownfall Abyss on the Ashen Isle (Lv 42+) | The Night Lantern, the Eclipse Cup |
| Hearts | Five personal quests, one per hero | All over the world (Lv 44+) | Limits, ultimate weapons, the Festival of Lanterns |

### Chapter VI in detail

```mermaid
sequenceDiagram
    autonumber
    participant P as Party
    participant W as World map
    participant L as Lastlight
    participant A as Crownfall Abyss
    P->>W: First step outside after the ending
    W-->>P: The Ashen Isle rises (flag: isle)
    P->>L: Sail or fly northeast
    L-->>P: Warden Ione: Lamp of Lastlight + combo Last Light
    P->>A: The lamp parts the mist (flag: abyssOpen)
    A-->>P: 2F and 3F: memories of Ozymar and Orun
    P->>A: 4F: The Hollow Crown
    A-->>P: The lamp blazes, full heal
    P->>A: Orun, the Night-Bearer
    A-->>P: Night Lantern lit, Crown of Dusk and Dawn, epilogue
    P->>L: Ione's thanks: 30,000 gold and 3 Megalixirs
```

---

## Hearts of the Lamplighters

After the ending, each hero has something left unfinished. The quests can be done in any order, and each one needs its hero in the party. Finishing one teaches that hero a **[Limit](#limits)** and gives them an ultimate weapon. Finish all five for the **Festival of Lanterns**.

```mermaid
flowchart LR
    E([After the ending]) --> R & G & D & K & S
    R[Elder Maren<br/>Father's Ledger] --> R2[Relight 12 roadside lamps<br/>marked on the world map] --> R3[Last lamp: the Lamp-Eater] --> R4[Sunbearer + First Light]
    G[Mira<br/>Mother's Grimoire] --> G2[Ember Caves:<br/>two riddle braziers] --> G3[Hearth Warden<br/>asks the third riddle] --> G4[Hearthstaff + Phoenix Rite]
    D[Sister Wenna<br/>The Last Letter] --> D2[Sea Mother's Grotto] --> D3[The Drowned Abbot] --> D4[Abbot's Bell + High Tide]
    K[Ironhold jail guard<br/>Vane's Marker] --> K2[Trapdoor to the Undercity] --> K3[Guildmaster Vane] --> K4[Pickpocket's Prize + Grand Larceny]
    S[Mira<br/>Selene can't sleep] --> S2[Rest at any inn] --> S3[Solo duel in a dream:<br/>Vesper's Echo] --> S4[Duskstar + Long Night]
    R4 & G4 & D4 & K4 & S4 --> F([Festival of Lanterns<br/>Heartlight])
```

| Quest | Hero | Start | Where | Boss | Reward |
| --- | --- | --- | --- | --- | --- |
| The Lamplighter's Road | Arin | Elder Maren, Brightwater | 12 lamps beside the roads on every continent, including the Isle of Dusk and the Ashen Isle | The Lamp-Eater (appears at the last lamp) | Sunbearer, ★ First Light |
| Mother's Grimoire | Lyra | Mira, Brightwater | Ember Caves (`8`), in the hills north of the Brightwater road | Hearth Warden | Hearthstaff, ★ Phoenix Rite |
| The Drowned Priesthood | Oswin | Sister Wenna, Port Halden chapel | Sea Mother's Grotto (`9`), on the coast east of Port Halden | The Drowned Abbot | Abbot's Bell, ★ High Tide |
| Old Debts | Kestrel | The guard in the Ironhold jail | The Undercity, through a trapdoor in the jail | Guildmaster Vane (acts twice) | Pickpocket's Prize, ★ Grand Larceny |
| Echo of Vesper | Selene | Mira, Brightwater | A dream: rest at any inn | Vesper's Echo (**Selene fights alone**) | Duskstar, ★ Long Night |
| The Festival of Lanterns | Everyone | Elder Maren, after all five | Brightwater | — | Heartlight |

**Tips**

- **The riddles** in the Ember Caves are Lyra's mother's bedtime riddles. A wrong answer summons Kiln Imps; you can try again afterwards. Answering the Hearth Warden's riddle correctly fully restores the party before the fight.
- **Selene's dream** can't end in a game over. If she loses, she simply wakes up, and the dream returns at the next inn. Bring Ethers: her draining spells keep her alive, but they cost MP.
- **Campfire talks:** using a **Tent** on the world map sometimes starts a short conversation around the fire. There are eight, each heard once, depending on who is in the party and how far the story has gone.

---

## The world

```mermaid
flowchart LR
    subgraph West[Western continent]
      BW[A · Brightwater] --- HO[1 · Whisperwood Hollow]
      BW -- river bridge --- PH[B · Port Halden]
      PH --- SS[2 · Sunken Shrine]
    end
    subgraph North[Northern continent]
      IH[C · Ironhold] --- EM[3 · Emberdeep Mines]
      IH --- FM[D · Frostmere]
    end
    subgraph Islands
      OB[5 · Starfall Observatory]
      DU[4 · Hollow Spire<br/>Isle of Dusk]
      AI[G · Lastlight<br/>7 · Crownfall Abyss<br/>Ashen Isle]
    end
    subgraph East[Sunscar Desert]
      MI[E · Mirage] --- TB[6 · Tomb of the First King]
      AE[F · Aerie<br/>air only]
    end
    SEA((Open sea<br/>by ship))
    PH == harbor ==> SEA
    SEA ==> IH
    SEA ==> DU
    SEA ==> MI
    SEA ==> OB
    SEA ==> AI
    TB == airship ==> AE
```

| Code | Place | Kind | How to reach | Battle area |
| --- | --- | --- | --- | --- |
| A | Brightwater | Town | Start | Plains |
| B | Port Halden | Town | East over the river bridge | Eastern lowlands |
| C | Ironhold | Town | By ship, north | Northern continent |
| D | Frostmere | Town | Road west of Ironhold | Northern snowfields |
| E | Mirage | Town | By ship, east | Sunscar Desert |
| F | Aerie | Town | **Airship only** (a mesa-walled valley) | Sunscar Desert |
| G | Lastlight | Town | Ship or airship, far northeast (after the ending) | Ashen Isle |
| 1 | Whisperwood Hollow | Dungeon, 2F | Road northwest of Brightwater | Whisperwood Hollow |
| 2 | Sunken Shrine | Dungeon, 2F | Coast road south of Port Halden | Sunken Shrine |
| 3 | Emberdeep Mines | Dungeon, 3F | Ring of mountains north of Ironhold | Emberdeep Mines |
| 4 | Hollow Spire | Dungeon, 3F | Isle of Dusk, east | Hollow Spire |
| 5 | Starfall Observatory | Dungeon, 3F | Small island west of Frostmere | Starfall Observatory |
| 6 | Tomb of the First King | Dungeon, 3F | South of Mirage | Tomb |
| 7 | Crownfall Abyss | Dungeon, 4F | The crater east of Lastlight | Crownfall Abyss |
| 8 | Ember Caves | Dungeon, 2F | Hills north of the Brightwater road (Lyra's quest) | Ember Caves |
| 9 | Sea Mother's Grotto | Dungeon, 2F | East coast of the Port Halden peninsula (Oswin's quest) | Sea Mother's Grotto |
| — | The Undercity | Dungeon, 2F | A trapdoor in the Ironhold jail (Kestrel's quest) | The Undercity |

### Saving

- **Three save slots** plus an **Auto** slot. Save from **Menu → Save** anywhere, or when you rest at an inn ("Save to slot N" is one press).
- **Auto-save** writes to the Auto slot every time you enter a town or dungeon. You can turn it off in Config.
- On the title screen, **Continue** loads your most recent save and **Load Game** lets you pick any slot. Saves from before 1.4 move into slot 1 automatically.

### Settings (Menu → Config)

| Setting | Options | What it does |
| --- | --- | --- |
| Sound | On / Off | Music and effects (also the M key) |
| Auto-dash | On / Off | Run everywhere; hold Shift, R or the gamepad's X to walk |
| Text speed | Normal / Fast / Instant | How fast dialogue appears |
| Battle speed | 1× / 2× / 4× | Speeds up battle animations; messages still wait for you |
| Auto-save | On / Off | Save to the Auto slot on entering towns and dungeons |
| Large text | On / Off | Bigger dialogue text |
| High contrast | On / Off | Solid black windows with bright yellow borders |
| Controls… | — | Rebind any action to any key (Confirm and Back always keep a key), or reset |
| Encounters | On / Off | Random battles; can only be turned off after the ending |

### Getting around

| Mode | Unlocked by | Notes |
| --- | --- | --- |
| On foot | Start | Hold **Shift** (or turn on **auto-dash**) to run. Forests, hills and dead woods raise the encounter rate by 50%. |
| Ship *Dawnrunner* | Brann, after the Tide Lantern | Walk onto it to sail and onto land to go ashore. Sea encounters. |
| Airship *Aurora* | Beating Ozymar | Fly anywhere with no encounters. Press **Enter** to land on open ground (not forest). |

**Encounters** come every 14–30 steps. The Sailor's Compass and the Moonfin Charm halve the rate. After the ending, **Config → Encounters** can turn them off entirely.

---

## Towns, inns and shops

| Town | Inn (party) | Notable people | Services |
| --- | --- | --- | --- |
| Brightwater | 10 G | Elder Maren, Mira, Pip, Old Bram | Free rest at Arin's house; item and arms shops |
| Port Halden | 30 G | Oswin, Brann, Nell | Chapel (revive and cure); harbor |
| Ironhold | 80 G | Captain Dunmar, Orrin, Hilda, Selene | Jail, barracks, **Orrin's Forge** |
| Frostmere | 120 G | Wren, Sable, the Ice Fisher | Observatory hut; **fishing rod** |
| Mirage | 150 G | Sultana Imara, Scholar Hesper, Dalen | Palace |
| Aerie | 200 G | Elder Skye, the Arena Master | **The Arena** |
| Lastlight | 300 G | Warden Ione, Calla, Fennick, Moss | Chapel; endgame armory |

Every building can be entered. Search **barrels, pots and crates** (face one and press Enter) for hidden items; each container is searched once. Resting at an inn also offers to save.

{{shops}}

---

## Dungeons

Each dungeon's floors are generated from a fixed seed, so every player gets the same layout. Torches light the walls, and the Lantern waits in the boss room on the last floor.

{{dungeons}}

---

## The party

Four heroes fight at once. Arrange them in **Menu → Formation**; the fifth waits in reserve and earns **half EXP**.

{{heroes}}

*Stats are shown at Lv 1 → Lv 50, before equipment.*

### Arin · Lamplighter

{{spells_arin}}

### Lyra · Flamecaller

{{spells_lyra}}

### Oswin · Tide Priest

{{spells_oswin}}

### Kestrel · Rogue

{{spells_kestrel}}

### Selene · Duskmage

{{spells_selene}}

---

## Combo techs

Choose **Combo** in battle. Every member must be in the active four, awake, not silenced, and have the MP. A combo uses **all of their turns**.

{{combos}}

---

## Limits

Each hero learns one **Limit** by finishing their [personal quest](#hearts-of-the-lamplighters). A gold gauge under the hero's name in battle fills as they **take damage**, and it stays full between battles. When it's full, a ★ command appears at the top of their battle menu. Using it is free, costs no MP, and empties the gauge.

{{limits}}

---

## How battles work

```mermaid
sequenceDiagram
    autonumber
    participant Y as You
    participant B as Battle
    participant E as Enemies
    Y->>B: Choose a command for each hero
    Note over Y,B: Combo partners skip their own command
    B->>B: Sort everyone by SPD × random 0.8–1.2<br/>(Defend always goes first)
    loop Each actor in order
        B->>E: Hero acts (attack, skill, item, combo)
        E->>B: Enemy acts (weighted move list)
    end
    B->>B: End of round: poison, regen,<br/>status timers, buff timers
    alt All enemies down
        B-->>Y: Victory: EXP, gold, drops, materials
    else All heroes down
        B-->>Y: Wake at the last inn with half your gold
    else
        B->>Y: Next round
    end
```

**Repeat last turn:** press **Shift**, **R** (touch) or **X** (gamepad) at the first hero's command menu to give everyone the same commands as last round. **Config → Battle speed** runs battles at 2× or 4×.

Some late bosses **act twice per round**.

### Formulas

| Thing | Formula |
| --- | --- |
| Physical damage | `(ATK − DEF ÷ 2) × multiplier × random(0.88–1.12)`, minimum 1 |
| Magic damage | `(spell power + MAG) × random(0.92–1.08) × weakness − target MAG × 0.4` |
| Weakness | Damage ×**1.6** if the target is weak to the element |
| Critical hit | Chance `6% + SPD × 0.1%`; damage ×**1.7** |
| Miss | Your attacks: 3%. Enemy attacks: `3% + (your SPD − their SPD) × 0.4%`, between 2% and 12% |
| Defend | Halves physical damage and cuts magic by 40% until your next turn |
| Rally | Party ATK ×1.35 for 4 rounds |
| Barrier | Party DEF ×1.4 and enemy magic ×0.6 for 4 rounds |
| Holy physical skills | ATK × `(1 + MAG ÷ 200)`, so Arin's MAG makes Sunstrike and Dawnbreak stronger |
| Gravity | 25% of the target's current HP (8% on bosses) |
| Poison | Heroes lose 6% of max HP per round (never below 1); enemies lose 5% (at most 250) |
| Regen | Renew: 8% of max HP per round for 5 rounds. Regen accessories: 5% per round |
| Steal | `55% + (your SPD − their SPD) × 2%`, between 25% and 92%; once per enemy |
| Run | `60% + (party SPD − enemy SPD) × 3%`, between 30% and 95%. Never from bosses or in the Arena |
| First strike | 8% of normal battles: the enemies lose their first round |
| Sleep | Heroes sleep 2 rounds and enemies 3. Any hit wakes an enemy; a hit wakes a hero 60% of the time |

### Statuses

| Status | Effect | Cured by | Prevented by |
| --- | --- | --- | --- |
| Poison | Loses HP every round | Antidote, Remedy, Purify, Sanctuary | Tide Pendant, Desert Veil, Silk Ribbon, Orrin's Seal, and others |
| Sleep | Skips turns | Getting hit, Remedy, Purify | Wake Charm, Pip's Candle, Dwarven Band, Nightglass Locket, and others |
| Silence | Can't use skills or combos | Remedy, Purify, Sanctuary | Echo Bell, Sage Circlet, Dwarven Band, Eclipse Mantle, and others |
| Regen | Heals every round | Wears off | — |

Bosses are immune to Sleep and Silence. Kestrel's Venom Edge poisons bosses 40% of the time.

---

## Bosses

{{bosses}}

```mermaid
xychart-beta
    title "Boss HP across the game"
    x-axis ["Gloomcap", "Warden", "Leviathan", "Vesper", "Ozymar", "King", "Unbound", "Wyrm", "Crown", "Orun"]
    y-axis "HP" 0 --> 13000
    bar [520, 1900, 3500, 5000, 6200, 6500, 5200, 12000, 8000, 9500]
```

**Tips**

- **Gloomcap**: weak to Fire. Lyra's Fire is your main damage.
- **Drowned Warden**: weak to Bolt. Keep Oswin healing through Tidal Wave.
- **Vesper**: weak to Holy. Silence protection helps a lot against Hush.
- **Ozymar**: no weakness. Remedies for Hush; Barrier for Sandstorm.
- **The Hollow King**: two phases back to back. The light of the three Lanterns fully heals the party between them.
- **Astral Wyrm**: Dream Fog sends the whole party to sleep, so equip sleep immunity on at least two heroes.
- **The Hollow Crown and Orun**: both **act twice per round** (the *Turns* column). Crownfall hits everyone hard, so keep **Barrier** up, and carry **Remedies**: Hollow Hush can silence Oswin. The Lamp of Lastlight heals you between the phases. **Last Light** (Arin + Lyra + Selene) is the strongest combo in the game.

**How hard are the late bosses?** `tools/balance_sim.py`, 60 fights each, gear from the Spire and the tomb:

| Fight | Party | Win rate | Median rounds | Knockouts per fight |
| --- | --- | --- | --- | --- |
| The Lamp-Eater | Lv 44 | 100% | 12 | 0 |
| The Drowned Abbot | Lv 44 | 98% | 11 | 0.2 |
| Guildmaster Vane | Lv 44 (with Kestrel) | 87% | 9 | 1.8 |
| Hearth Warden | Lv 44 | 83% | 11 | 2.0 |
| Vesper's Echo | Selene alone, Lv 44 | 100% | 12 | 0 |

**How hard is the finale?** `tools/balance_sim.py` fights it 60 times per setup with the real battle code and a simple AI (no combos or Limits, since those come later):

| Party | Win rate | Median rounds | Knockouts per fight |
| --- | --- | --- | --- |
| Lv 42, Lastlight shop gear | 67% | 23 | 2.2 |
| Lv 42, gear from the Spire and tomb | 90% | 23 | 1.0 |
| Lv 45, gear from the Spire and tomb | 98% | 20 | 0.1 |
| Lv 50, forged weapons, arena prizes | 100% | 13 | 0 |

---

## Monsters by area

Ordered roughly as you meet them.

{{monsters}}

---

## Side quests

```mermaid
flowchart LR
    subgraph Early
      Q1[The Lost Cat<br/>Pip]:::q
      Q2[Nell's Locket<br/>Nell]:::q
    end
    subgraph Middle
      Q3[The Stonebrand<br/>Orrin]:::q --> Q9[Orrin's Forge<br/>Orrin]:::new
      Q4[Bounty: Leviathan<br/>Brann]:::q
      Q5[Stars Over Frostmere<br/>Wren]:::q
      Q6[Monster Scholar<br/>Sable]:::q
      Q10[The Ones That Got Away<br/>Ice Fisher]:::new
    end
    subgraph Late
      Q7[The First King<br/>Sultana Imara]:::q --> Q8[Arena Legend<br/>Arena Master]:::q
    end
    classDef q fill:#24324a,stroke:#8ab0ff,color:#fff
    classDef new fill:#4a2a1a,stroke:#ff8a4a,color:#fff
```

| Quest | Giver | What to do | Reward |
| --- | --- | --- | --- |
| The Lost Cat | Pip, Brightwater | Find Mittens on Whisperwood Hollow 1F | Pip's Candle |
| Nell's Locket | Nell, Port Halden | Find the locket on Sunken Shrine 1F | Tide Pendant |
| The Stonebrand | Orrin, Ironhold | Find the hammer on Emberdeep Mines 2F | Dwarven Band |
| Bounty: Leviathan | Brann, Port Halden (after the ship) | Sail into the whirlpool (Lv 16+) | 4000 G, Sailor's Compass |
| Stars Over Frostmere | Wren, Frostmere | Relight 3 Lanterns, then open the Observatory (Lv 32+) | The Fifth Flame |
| Monster Scholar | Sable, Frostmere | Record 30 creatures in the bestiary | Silk Ribbon |
| The First King | Sultana Imara, Mirage | Open the Tomb with the Sun Seal (Lv 26+) | The airship *Aurora* |
| Arena Legend | Arena Master, Aerie | Win the first five cups | Lantern Crown |
| **The Ones That Got Away** | Ice Fisher, Frostmere | Catch every kind of fish (6 kinds for the first reward) | Angler's Ring, Moonfin Charm |
| **Orrin's Forge** | Orrin, Ironhold (after The Stonebrand) | Forge three items | Orrin's Seal |
| **The Lamplighter's Road** | Elder Maren (after the ending) | Relight 12 roadside lamps | Sunbearer, ★ First Light |
| **Mother's Grimoire** | Mira (after the ending) | Ember Caves riddles and the Hearth Warden | Hearthstaff, ★ Phoenix Rite |
| **The Drowned Priesthood** | Sister Wenna (after the ending) | The Drowned Abbot in the Sea Mother's Grotto | Abbot's Bell, ★ High Tide |
| **Old Debts** | Ironhold jail guard (after the ending) | Guildmaster Vane in the Undercity | Pickpocket's Prize, ★ Grand Larceny |
| **Echo of Vesper** | Mira (after the ending) | Selene's solo dream duel | Duskstar, ★ Long Night |
| **The Festival of Lanterns** | Elder Maren | Finish all five hero quests | Heartlight |

---

## The Aerie Arena

Cups are gauntlets: several battles in a row with no inn in between. You can use items but can't run, and losing costs nothing. The prize is awarded once; rematches pay gold only.

{{arena}}

---

## Fishing

Get the **Old Fishing Rod** from the Ice Fisher in Frostmere. Then face any water (a pond, the river, a harbor, the sea from the shore, or the Shrine's pools) and press **Enter**.

```mermaid
stateDiagram-v2
    [*] --> Waiting: Cast
    Waiting --> Bite: 1.2–3.4 seconds
    Waiting --> Lost: Press too soon
    Bite --> Reeling: Press within 0.9 s
    Bite --> Lost: Too slow
    Reeling --> Reeling: Hit in the green (the marker speeds up)
    Reeling --> Caught: Enough hits
    Reeling --> Lost: Second miss
    Caught --> [*]
    Lost --> [*]
```

Harder fish need more hits and have a narrower green zone (30% of the bar for ★, 22% for ★★, 15% for ★★★).

{{fish}}

---

## Orrin's Forge

After *The Stonebrand*, talk to Orrin in Ironhold and choose **Forge**. Materials drop from monsters (the bestiary lists who drops what) and a few come from Abyss chests.

{{mats}}

{{forge}}

---

## Equipment

### Weapons

**Arin**

{{weapons_arin}}

**Lyra**

{{weapons_lyra}}

**Oswin**

{{weapons_oswin}}

**Kestrel**

{{weapons_kestrel}}

**Selene**

{{weapons_selene}}

### Armour

{{armor}}

### Accessories

Anyone can wear any accessory. Only one is worn at a time.

{{acc}}

---

## Items

{{items}}

### Key items

{{keys}}

---

## Levels and EXP

The level cap is **50**. Every surviving active hero gets the full EXP from a battle; reserve heroes get half. The Lantern Crown and the Scholar's Lens add +50% EXP for their wearer.

{{xp}}

```mermaid
{{xpchart}}
```

---

## New Game+

After the ending, the title screen offers **New Game+**. You keep your levels, equipment, items (except key items), gold and bestiary. Each cycle makes enemies stronger:

| Stat | Change per cycle |
| --- | --- |
| HP | +60% |
| ATK and MAG | +22% |
| DEF | +12% |
| EXP and gold | +50% |
