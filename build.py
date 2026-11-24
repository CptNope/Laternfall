import pathlib
root=pathlib.Path(__file__).parent
order=['core','data','art','maps','party','field','interior','battle','menu','crafts','story']
js='\n'.join((root/'src'/f'{n}.js').read_text() for n in order)
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Lanternfall — A Tale of the Four Flames</title>
<style>
html,body{{margin:0;height:100%;background:#05040c;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}}
body{{display:flex;align-items:center;justify-content:center}}
canvas{{display:block;image-rendering:auto;box-shadow:0 0 60px rgba(120,90,200,.25)}}
#touch{{display:none;position:fixed;inset:0;pointer-events:none}}
#touch .b{{position:absolute;pointer-events:auto;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.35);color:rgba(255,255,255,.8);font:bold 18px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;border-radius:12px;touch-action:none}}
#touch .b.on{{background:rgba(255,255,255,.35)}}
#touch .d{{width:54px;height:54px}}
#touch .r{{width:66px;height:66px;border-radius:50%}}
</style>
</head>
<body>
<canvas id="game" width="640" height="480"></canvas>
<div id="touch">
  <div class="b d" data-a="up" style="left:70px;bottom:136px">▲</div>
  <div class="b d" data-a="left" style="left:14px;bottom:80px">◀</div>
  <div class="b d" data-a="right" style="left:126px;bottom:80px">▶</div>
  <div class="b d" data-a="down" style="left:70px;bottom:24px">▼</div>
  <div class="b r" data-a="ok" style="right:20px;bottom:90px">A</div>
  <div class="b r" data-a="cancel" style="right:96px;bottom:40px">B</div>
</div>
<script>
{js}
</script>
</body>
</html>
'''
(root/'index.html').write_text(html)
print(len(html))
