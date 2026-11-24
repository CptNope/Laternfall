"""Regenerates docs/GAME_GUIDE.md from tools/game_guide.tpl.md and the game data.

Usage:  python3 tools/gentables.py
Needs:  node (to read src/data.js via tools/extract.js)

Every {{name}} placeholder in the template is replaced by a generated markdown table.
Edit the template for prose and src/data.js for numbers; never edit docs/GAME_GUIDE.md by hand."""
import json, re, subprocess, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.loads(subprocess.check_output(['node', str(ROOT / 'tools' / 'extract.js')]))
H, S, I, M, E = D['HEROES'], D['SPELLS'], D['ITEMS'], D['MONSTERS'], D['ENCOUNTERS']
out = {}
def tbl(head, rows): return '| ' + ' | '.join(head) + ' |\n| ' + ' | '.join('---' for _ in head) + ' |\n' + '\n'.join('| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows) + '\n'
nm = lambda k: I[k]['name'] if k in I else k
cap = lambda s: s[0].upper() + s[1:] if s else s
def elems(d):
    """'Weak to' and 'Resists' cells: resist halves damage, absorb (shown as 'absorbs X') heals the monster"""
    w = ', '.join(map(cap, d.get('weak', []))) or '—'
    r = ', '.join([*map(cap, d.get('resist', [])), *(f'absorbs {e}' for e in d.get('absorb', []))]) or '—'
    return w, r
def steal(d):
    s = nm(d['steal']) if d.get('steal') else '—'
    if d.get('rare'): s += f" · ★ {nm(d['rare'][0])} ({round(d['rare'][1] * 100)}%)"
    return s
AI = {'weakest': 'Hunts the wounded', 'magehunter': 'Hunts casters', 'healer': 'Heals allies'}

# heroes
rows = []
for k, h in H.items():
    b, g = h['base'], h['grow']
    st = lambda s: f"{b[s]} → {int(b[s] + g[s] * 49)}"
    rows.append([f"**{h['name']}**", h['cls'], h['skill'], st('hp'), st('mp'), st('str'), st('def'), st('mag'), st('spd')])
out['heroes'] = tbl(['Hero', 'Class', 'Skill menu', 'HP', 'MP', 'ATK', 'DEF', 'MAG', 'SPD'], rows)
for k, h in H.items():
    rows = []
    for sp, lv in h['spells']:
        s = S[sp]; tgt = {'enemy': 'One foe', 'enemies': 'All foes', 'ally': 'One ally', 'allies': 'All allies', 'self': 'Self'}[s['target']]
        rows.append([lv, f"**{s['name']}**", s['mp'] or '—', cap(s.get('elem', '') if s.get('elem') not in (None, 'none') else '—'), tgt, s['desc']])
    out['spells_' + k] = tbl(['Lv', 'Skill', 'MP', 'Element', 'Target', 'Effect'], rows)
# combos
rows = [[f"**{c['name']}**", ' + '.join(H[m]['name'] for m in c['members']), ' / '.join(map(str, c['mp'])), 'All foes' if c['target'] == 'enemies' else 'One foe', cap(c.get('elem') or 'none'), c['desc'] + (' *(learned in Lastlight)*' if c.get('flag') else '')] for c in D['COMBOS']]
out['combos'] = tbl(['Combo', 'Members', 'MP each', 'Target', 'Element', 'Effect'], rows)
# monsters by area
AREAS = [('r1', 'Brightwater plains (west of the river)'), ('d1', 'Whisperwood Hollow'), ('r2', 'Eastern lowlands (Port Halden)'), ('d2', 'Sunken Shrine'), ('sea', 'Open sea'),
         ('r3', 'Northern continent (Ironhold, Frostmere)'), ('d3', 'Emberdeep Mines'), ('r5', 'Sunscar Desert and the Aerie valley'), ('d6', 'Tomb of the First King'),
         ('r4', 'Isle of Dusk'), ('d4', 'Hollow Spire'), ('d5', 'Starfall Observatory'), ('r6', 'Ashen Isle'), ('d7', 'Crownfall Abyss'),
         ('d8', 'Ember Caves (Lyra\'s quest)'), ('d9', 'Sea Mother\'s Grotto (Oswin\'s quest)'), ('d10', 'The Undercity (Kestrel\'s quest)')]
parts = []
for code, title in AREAS:
    ids = []
    for g in E[code]:
        for m in g['g']:
            if m not in ids: ids.append(m)
    rows = []
    for m in ids:
        d = M[m]
        drops = ', '.join(filter(None, [d.get('drop') and f"{nm(d['drop'][0])} ({int(d['drop'][1]*100)}%)", d.get('mat') and f"{nm(d['mat'][0])} ({int(d['mat'][1]*100)}%)"])) or '—'
        w, r = elems(d)
        rows.append([d['name'] + (f" *({AI[d['ai']]})*" if d.get('ai') else ''), d['hp'], d['atk'], d['mag'], w, r, steal(d), drops, d['xp'], d['gold']])
    parts.append(f"#### {title}\n\n" + tbl(['Monster', 'HP', 'ATK', 'MAG', 'Weak to', 'Resists', 'Steal', 'Drops', 'EXP', 'Gold'], rows))
out['monsters'] = '\n'.join(parts)
WHERE = {'gloomcap': 'Whisperwood Hollow 2F', 'warden': 'Sunken Shrine 2F', 'vesper': 'Emberdeep Mines 3F', 'leviathan': 'Whirlpool, open sea (bounty)', 'firstking': 'Tomb of the First King 3F',
         'wyrm': 'Starfall Observatory 3F (optional)', 'king': 'Hollow Spire 3F (phase 1)', 'king2': 'Hollow Spire 3F (phase 2)', 'crown': 'Crownfall Abyss 4F (phase 1)', 'orun': 'Crownfall Abyss 4F (phase 2)',
         'lampeater': 'The last roadside lamp (Arin)', 'hearthwarden': 'Ember Caves 2F (Lyra)', 'abbot': "Sea Mother's Grotto 2F (Oswin)", 'vane': 'The Undercity 2F (Kestrel)', 'echo': "Selene's dream, solo (Selene)"}
def phase(d):
    if not d.get('phases'): return '—'
    out_ = []
    for ph in d['phases']:
        base = {a['a'] for a in d.get('acts', [])}
        new = [S[a['a']]['name'] for a in ph['acts'] if a['a'] != 'attack' and a['a'] not in base]
        out_.append(f"Below {round(ph['hp'] * 100)}% HP" + (f", {ph['actions']} turns" if ph.get('actions') else '') + (': adds ' + ', '.join(new) if new else ': more aggressive'))
    return '; '.join(out_)
rows = [[f"**{M[b]['name']}**", w, M[b]['hp'], M[b]['atk'], M[b]['mag'], M[b]['spd'], M[b].get('actions', 1), *elems(M[b]), steal(M[b]), ', '.join(S[a['a']]['name'] for a in M[b].get('acts', []) if a['a'] != 'attack'), phase(M[b])] for b, w in WHERE.items()]
out['bosses'] = tbl(['Boss', 'Where', 'HP', 'ATK', 'MAG', 'SPD', 'Turns', 'Weak to', 'Resists', 'Steal', 'Special attacks', 'When hurt'], rows)
# Lantern Board
BN, BH, BS, PS = D['BOARD_NODES'], D['BOARD_HERO'], D['BOARD_STATS'], D['PASSIVES']
SN = {'hp': 'Max HP', 'mp': 'Max MP', 'str': 'ATK', 'def': 'DEF', 'mag': 'MAG', 'spd': 'SPD'}
NODE_NAME = {'hp': 'Vigor', 'mp': 'Focus', 'atk': 'Might', 'mag': 'Insight', 'def': 'Ward', 'spd': 'Swiftness', 'big': 'Great Flame', 'p1': 'Passive I', 'p2': 'Passive II', 'p3': 'Passive III', 'cap': '★ Capstone'}
def node_eff(n):
    if n in BS: st, v = BS[n]; return f"{SN[st]} +{round(v * 100)}%" if v < 1 else f"{SN[st]} +{v}"
    if n == 'big': return '+20 to the hero\'s main stat (see below)'
    return 'A passive (see below)'
rows = [[f"**{NODE_NAME[n]}**", BN[n]['cost'], node_eff(n), ', '.join(NODE_NAME[l] for l in BN[n]['links'] if l != 'spark') + (', the Spark' if 'spark' in BN[n]['links'] else '')] for n in BN if n != 'spark']
out['board_nodes'] = tbl(['Node', 'Embers', 'Effect', 'Linked to'], rows)
rows = [[f"**{H[k]['name']}**", SN[v['big']] + ' +20', *[f"{PS[v[p]]['name']}: {PS[v[p]]['desc']}" for p in ('p1', 'p2', 'p3')], f"**{PS[v['cap']]['name']}**: {PS[v['cap']]['desc']}"] for k, v in BH.items()]
out['board_heroes'] = tbl(['Hero', 'Great Flame', 'Passive I', 'Passive II', 'Passive III', 'Capstone'], rows)
# meals
rows = [[f"**{m['name']}**", ', '.join(f"{nm(f)} ×{n}" for f, n in m['needs'].items()), m['desc']] for m in D['MEALS'].values()]
out['meals'] = tbl(['Meal', 'Ingredients', f"Effect (next {D['MEAL_BATTLES']} battles)"], rows)
# limits
L = D['LIMITS']
QUEST = {'arin': "The Lamplighter's Road", 'lyra': "Mother's Grimoire", 'oswin': 'The Drowned Priesthood', 'kestrel': 'Old Debts', 'selene': 'Echo of Vesper'}
out['limits'] = tbl(['Hero', 'Limit', 'Target', 'Effect', 'Learned from'], [[f"**{H[k]['name']}**", f"★ {v['name']}", 'One foe' if v['target'] == 'enemy' else 'All foes', v['desc'], QUEST[k]] for k, v in L.items()])
# equipment
def eqrow(k, it):
    stats = ' '.join(filter(None, [it.get('atk') and f"ATK+{it['atk']}", it.get('def') and f"DEF+{it['def']}", it.get('mag') and f"MAG+{it['mag']}", it.get('spd') and f"SPD+{it['spd']}", it.get('all') and f"All+{it['all']}"]))
    return stats
src = {}
for sh, lst in D['SHOPS'].items():
    for k in lst: src.setdefault(k, []).append(sh.split('_')[0].capitalize() + ' shop')
for r in D['RECIPES']: src.setdefault(r['out'], []).append("Orrin's forge")
for k, h in H.items():
    rows = []
    for ik, it in I.items():
        if it['kind'] == 'weapon' and k in it.get('who', []):
            rows.append([f"**{it['name']}**", eqrow(ik, it), it['price'] or '—', ', '.join(src.get(ik, [])) or 'Chest, quest or boss', it['desc']])
    rows.sort(key=lambda r: (I[[x for x in I if I[x]['name'] == r[0].strip('*')][0]].get('atk', 0) + I[[x for x in I if I[x]['name'] == r[0].strip('*')][0]].get('mag', 0)))
    out['weapons_' + k] = tbl(['Weapon', 'Stats', 'Price', 'Where', 'Notes'], rows)
rows = []
for ik, it in I.items():
    if it['kind'] == 'armor':
        rows.append([f"**{it['name']}**", ', '.join(H[w]['name'] for w in it['who']), eqrow(ik, it), it['price'] or '—', ', '.join(src.get(ik, [])) or 'Chest, quest or boss'])
rows.sort(key=lambda r: int(r[2].split('DEF+')[1].split()[0]))
out['armor'] = tbl(['Armor', 'Who', 'Stats', 'Price', 'Where'], rows)
rows = []
for ik, it in I.items():
    if it['kind'] == 'acc':
        rows.append([f"**{it['name']}**", it['desc'], it['price'] or '—', ', '.join(src.get(ik, [])) or 'Quest, chest or prize'])
out['acc'] = tbl(['Accessory', 'Effect', 'Price', 'Where'], rows)
rows = [[f"**{it['name']}**", it['price'] or '—', it['desc']] for ik, it in I.items() if it['kind'] == 'use']
out['items'] = tbl(['Item', 'Price', 'Effect'], rows)
rows = [[f"**{it['name']}**", it['desc']] for ik, it in I.items() if it['kind'] == 'key']
out['keys'] = tbl(['Key item', 'Description'], rows)
# shops
SHOPN = {'brightwater': 'Brightwater', 'halden': 'Port Halden', 'ironhold': 'Ironhold', 'mirage': 'Mirage', 'aerie': 'Aerie', 'frostmere': 'Frostmere', 'lastlight': 'Lastlight'}
rows = []
for t, n in SHOPN.items():
    rows.append([f"**{n}**", ', '.join(nm(k) for k in D['SHOPS'][t + '_items']), ', '.join(nm(k) for k in D['SHOPS'][t + '_arms'])])
out['shops'] = tbl(['Town', 'Item shop', 'Arms and trinkets'], rows)
# forge
rows = [[f"**{nm(r['out'])}**", I[r['out']]['kind'].replace('acc', 'accessory'), ', '.join(f"{nm(m)} ×{n}" for m, n in r['mats'].items()), f"{r['gold']} G", eqrow(r['out'], I[r['out']]) or I[r['out']]['desc']] for r in D['RECIPES']]
out['forge'] = tbl(['Forges', 'Type', 'Materials', 'Gold', 'Stats'], rows)
matsrc = {}
for mk, md in M.items():
    if md.get('mat'): matsrc.setdefault(md['mat'][0], []).append(md['name'])
rows = [[f"**{it['name']}**", it['price'], ', '.join(matsrc.get(ik, []))] for ik, it in I.items() if it['kind'] == 'mat']
out['mats'] = tbl(['Material', 'Value (shops pay half)', 'Dropped by'], rows)
# fish
SPOTN = {'brightwater': "Brightwater pond", 'halden': 'Port Halden harbor', 'sea': 'Open sea (from the shore)', 'river': 'The river', 'frostmere': 'Frostmere pond', 'mirage': 'Mirage oasis', 'shrine': "Sunken Shrine pools", 'lastlight': 'Lastlight pond', 'ash': 'Ashen Isle shore'}
fishwhere = {}
for sp, lst in D['FISH_SPOTS'].items():
    tot = sum(x['w'] for x in lst)
    for x in lst: fishwhere.setdefault(x['f'], []).append(f"{SPOTN[sp]} ({round(100 * x['w'] / tot)}%)")
fishwhere['koi'] = ['Anywhere, 3% per cast, after the ending']
rows = [[f"**{I[f]['name']}**", '★' * D['FISH'][f]['diff'], D['FISH'][f]['diff'] + 1, I[f]['price'], '<br>'.join(fishwhere[f])] for f in D['FISH']]
out['fish'] = tbl(['Fish', 'Difficulty', 'Reel hits', 'Value (shops pay half)', 'Where'], rows)
# arena
rows = [[f"**{c['name']}**", f"{c['level']}+", len(c['rounds']), ' → '.join(' + '.join(M[m]['name'] for m in r) for r in c['rounds']), nm(c['prize']), c['gold']] for c in D['ARENA_CUPS']]
out['arena'] = tbl(['Cup', 'Level', 'Rounds', 'Opponents', 'Prize', 'Gold'], rows)
# dungeons
DN = D['DUNGEONS']
rows = []
for k, d in DN.items():
    loot = sorted({x for fl in d['loot'] for x in fl if not x.startswith('gold:')}, key=lambda x: nm(x))
    gold = sum(int(x[5:]) for fl in d['loot'] for x in fl if x.startswith('gold:'))
    rows.append([f"**{d['name']}**", d['floors'], M[d['boss']]['name'], cap(d['lantern']) + ' Lantern' if d.get('lantern') else '— (hero quest)', ', '.join(nm(x) for x in loot) + (f", {gold} gold" if gold else '')])
out['dungeons'] = tbl(['Dungeon', 'Floors', 'Boss', 'Lantern', 'Treasure'], rows)
# xp
xp = D['xp']
out['xp'] = tbl(['Level', *[str(l) for l in (5, 10, 15, 20, 25, 30, 35, 40, 45, 50)]], [['Total EXP', *[f"{xp[l-1]:,}" for l in (5, 10, 15, 20, 25, 30, 35, 40, 45, 50)]]])
out['xpchart'] = 'xychart-beta\n    title "Total EXP needed per level"\n    x-axis [' + ', '.join(str(l) for l in range(5, 51, 5)) + ']\n    y-axis "EXP" 0 --> 65000\n    bar [' + ', '.join(str(xp[l-1]) for l in range(5, 51, 5)) + ']\n    line [' + ', '.join(str(xp[l-1]) for l in range(5, 51, 5)) + ']'
tpl = (ROOT / 'tools' / 'game_guide.tpl.md').read_text()
missing = set(re.findall(r'\{\{(\w+)\}\}', tpl)) - set(out)
if missing: raise SystemExit(f'unknown placeholders: {missing}')
guide = re.sub(r'\{\{(\w+)\}\}', lambda m: out[m.group(1)].rstrip('\n'), tpl)
(ROOT / 'docs' / 'GAME_GUIDE.md').write_text(guide)
print(f'wrote docs/GAME_GUIDE.md ({len(guide.splitlines())} lines, {len(out)} tables)')
