# Content

Lanternfall's items, monsters, shops and random battles are data files here, not code (2.0, EN-1). `build.py` checks them and writes them into `index.html`, so the game is still one file.

| File | What's in it | The game reads it as |
| --- | --- | --- |
| [`items.json`](items.json) | Every item: consumables, weapons, armour, accessories, forging materials, fish, key items | `ITEMS` |
| [`monsters.json`](monsters.json) | Every monster and boss: stats, weaknesses, moves, drops, boss phases | `MONSTERS` |
| [`shops.json`](shops.json) | What each shop sells. A town's map names its shops (`shop: 'halden_items'` in `src/maps.js`) | `SHOPS` |
| [`encounters.json`](encounters.json) | Random battles: `day` tables for every region and dungeon, and `night` tables that replace half of a region's battles after dark | `ENCOUNTERS`, `NIGHT_ENC` |
| [`schema/`](schema) | A [JSON Schema](https://json-schema.org/) for each file: every field, its type and what it means | |

Moves (`SPELLS`), heroes, recipes, fish spots, meals and the arena stay in `src/data.js` for now; they can follow the same way.

## The format

```json
{
  "$schema": "./schema/monsters.schema.json",
  "monsters": {
    "slime": {"name": "Green Slime", "fam": "slime", "c": ["#5fd16a", "#2f8a3a"], "hp": 22, "atk": 13, "def": 2, "mag": 4, "spd": 5, "xp": 6, "gold": 5, "weak": ["fire"], "drop": ["potion", 0.12], "steal": "potion"},
    "// 1.9 Living world: creatures that only come out at night": "",
    "moonmoth": {"name": "Moonmoth", "...": "..."}
  }
}
```

- **One entry per line.** Lay it out however you like; the build doesn't care. One line each keeps a pull request's diff to the lines that changed.
- **Ids** are lower case letters, digits and `_`, starting with a letter: `ember_ring`, `d11`.
- **Comments:** JSON has none, so a key that starts with `//` is a comment. The build drops it. Use it to head a section.
- **Order matters.** The bestiary lists monsters in file order, and the game guide lists both files in order.
- **`$schema`** points editors at the schema. VS Code and most editors then underline mistakes and show what each field means as you type.

## Checking

`python3 build.py` checks the content before it builds anything, and stops with a list of problems:

```text
content: 1 problem(s)
  shops.json: shops.brightwater_items[3]: "tnet" isn't an item in content/items.json
build.py: fix the content problems above; nothing was built
```

Run the check alone with `node tools/content.js`. It needs [Node](https://nodejs.org/); without it, `build.py` skips the check and warns, and CI always runs it. It checks:

1. **Shape**, against the schemas: required fields, types, known field names, allowed values (elements, statuses, AI styles), colours as `#rrggbb`, chances between 0 and 1, a weapon naming who can wield it.
2. **References**: every item a monster drops or a shop sells exists, every monster in an encounter group exists, every move is in `SPELLS`, every hero in `who` exists, every monster family has a drawing, and every night table has a day table. It also checks what code names: a town's `shop`, a dungeon's `enc`, the monsters in a `startBattle([...])`, items in `addItem('…')` / `hasItem('…')`, and the items in recipes, treasure maps, fish, meals, the arena and the black market.

`node tools/content.js --selftest` plants 15 typical mistakes (a misspelt drop, a removed item still in a recipe, a shop a town uses deleted, …) and fails unless each is caught. CI runs it too.

## Adding a field

A field the schema doesn't list is an error, so a typo can't slip through. To add a real one, add it to the schema with a `description`, then read it in the code (`src/battle.js` for monsters, `src/menu.js` and `src/party.js` for items).

See [docs/MODDING.md](../docs/MODDING.md) for walk-throughs: adding a monster, an item, a shop or a dungeon.
