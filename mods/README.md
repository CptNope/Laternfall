# Mods

A mod adds to or changes Lanternfall's content without touching the game's own files. It's a folder here; building the game with it makes a separate copy of the game. `index.html` is never changed.

```bash
python3 build.py --mod mods/example                       # writes build/lanternfall-modded.html
python3 build.py --mod mods/example --mod mods/other      # several mods, applied in order
python3 build.py --mod mods/example --out my-game.html    # write it somewhere else
```

Open the file in a browser and play. The title screen says which mods are built in. Building with mods needs [Node](https://nodejs.org/), which merges and checks them.

[`example/`](example) is a complete mod, *The Ember Fox*: a new monster with its own drawing on the Ashen Isle, a new accessory sold in Lastlight, and Goblins carrying something better to steal. Copy it to start your own.

## What's in a mod

```text
mods/ember-fox/                  the folder's name is the mod's id: lower case, digits, - and _
  mod.json                       required: {"name": "The Ember Fox", "version": "1.0.0", "description": "…", "author": "…"}
  content/items.json             optional: changes to content/items.json
  content/monsters.json          optional: changes to content/monsters.json
  content/shops.json             optional: changes to content/shops.json
  content/encounters.json        optional: changes to content/encounters.json
  src/*.js                       optional: code, loaded after the whole game (new monster drawings)
```

A mod's content files look like the game's own ([content/README.md](../content/README.md)), but only list what changes.

## How changes merge

| In a mod's file | Does |
| --- | --- |
| A new item or monster id | Adds it, after the game's own |
| An existing item or monster with some fields: `"goblin": {"steal": "hipotion"}` | Changes only those fields |
| `"goblin": null` | Removes it (the checker complains if anything still uses it) |
| A shop or encounter table given as a list | Replaces the whole list |
| `"lastlight_arms": {"add": ["ember_tail"], "remove": ["ash_kris"]}` | Edits a shop's list |
| `"r6": {"add": [{"w": 2, "g": ["emberfox"]}], "remove": [0]}` | Edits an encounter table; `remove` takes group numbers, counting from 0 |
| A new shop or table id with a list | Adds it (a town's map has to name a shop for it to appear) |

Mods apply in the order given, so a later mod can change what an earlier one added. Encounter tables are under `"day"` and `"night"`, as in the game's file.

## Checking

The merged content goes through the same checker as the game's own, so a mod that misspells an item, names a move that doesn't exist, removes something still in use, or forgets a monster's drawing stops the build with the problem and the mod it came from:

```text
content: 1 problem(s)
  monsters.json: monsters.foxling.drop: "ehter" isn't an item in content/items.json  (from mod "ember-fox")
```

Check without building: `node tools/content.js --mod mods/ember-fox`.

## A new monster drawing

A monster's `fam` names its drawing. Use one of the game's ([`src/monsters/`](../src/monsters)), or put your own in the mod's `src/`, registered the same way:

```js
MONSTER_SIZE.emberfox = [80, 58];                     // [width, height] at size 1
MONSTER_ART.emberfox = (g, def, t, { shadow }) => {   // drawn at its feet, facing right; def.c is its palette
  shadow();
  ellipse(g, 0, -23, 24, 11, def.c[0], OUT, 2);
  // …
};
```

See [`example/src/emberfox.js`](example/src/emberfox.js), and the drawing helpers in [docs/MODDING.md](../docs/MODDING.md#add-a-new-monster-art-family). A mod's code loads after the whole game, so it can use anything the game defines; the build fails if it throws while loading.

## Saves

A save remembers the mods it was made with. Loading it in a game without them is safe: the mods' items are left out (gear goes back to the hero's starting gear) and the player is told. Saves are shared between copies of the game opened from the same place, so a modded copy and the real game see each other's saves.

## What mods can't do yet

Mods change items, monsters, shops and encounter tables, and add code. Maps, dialogue and moves are still code in `src/` (see the [roadmap](../ROADMAP.md#20--lantern-engine): the map editor and the string table are next), so changing those means editing the game itself.
