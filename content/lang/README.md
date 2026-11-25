# Languages

Lanternfall is written in English, and every line a player reads can be translated (2.0, EN-6). A language is one file here, `<code>.json`; `python3 build.py` puts every language in the game, and Settings → **Language** switches between them (the game restarts in the new language).

No translation ships yet. This is how to make one.

## Translating

1. Run `node tools/strings.js` to bring [`template.json`](template.json) up to date: every line in the game, grouped by the file it's in (about 2,200 lines).
2. Copy it to your language's code: `es.json`, `fr.json`, `pt-BR.json`.
3. Set `"name"` to the language's own name (`"Español"`), which is what Settings shows.
4. Fill in the lines you translate. Leave a line empty, or delete it, to keep the English: a half-done translation works.

```json
{
  "name": "Español",
  "strings": {
    "New Game": "Nueva partida",
    "{0} reached level {1}!": "¡{0} alcanza el nivel {1}!",
    "{0} found {1} gold!": "¡{1} de oro para {0}!"
  }
}
```

- **`{0}`, `{1}`, …** are values: a name, a number, an item. Keep every one, in any order. The build stops if a translation drops or adds one.
- **Keys are the English**, so when a line's English changes, its old translation stops matching. `node tools/strings.js --check` says how many lines each language has and how many no longer match anything.
- **Names**: heroes, places, monsters and items are lines too; translate or keep them.
- A few lines end in a space or a colon (`"Weak: "`, `"Lv "`): a label before a value. Keep the space where the language needs one.
- Text is drawn in the game's fonts; scripts that need other fonts (CJK, Arabic) will show whatever the browser substitutes.

## Testing a translation

Open `index.html?lang=es` to play in it without changing the saved setting. `?lang=pseudo` is a test language that changes every translated line into accented, longer text (`⟦Ñéŵ Ĝåɱé···⟧`): English left on screen is a line the game doesn't translate yet, and text that overflows its box will overflow in a long language too. The `i18n` play-test plays in it and fails on any untranslated line it sees.

## As a mod

A mod can carry languages in its own `lang/` folder, built in with `python3 build.py --mod mods/<name>`. A mod's `lang/en.json` rewords the English: its lines replace the game's. See [mods/README.md](../../mods/README.md).
