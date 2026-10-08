"""验证假设：用户看到的"两个环 + 错位" = 五行环扇区色 带 vs 相邻节气环文字色 撞色

节气环文字配色（textureGenerator.ts:363-365）
  春 #4ade80(绿)  夏 #ff7875(粉红)  秋 #fde047(黄)  冬 #60a5fa(蓝)
五行环扇区填充（textureGenerator.ts:297-301，alpha 0.16）
  木 rgba(52,211,153)  火 rgba(239,68,68)  土 rgba(245,158,11)
  金 rgba(248,250,252) 水 rgba(56,189,248)

关键：节气的「季节」与五行的「五行」是两套独立语义，但配色几乎一一对应，
      且两个环在盘面上物理相邻（r1..r2 五行 / r2..r3 节气）。
"""

terms = [
    ('冬至', 0, '冬'), ('小寒', 15, '冬'), ('大寒', 30, '冬'),
    ('立春', 45, '春'), ('雨水', 60, '春'), ('惊蛰', 75, '春'),
    ('春分', 90, '春'), ('清明', 105, '春'), ('谷雨', 120, '春'),
    ('立夏', 135, '夏'), ('小满', 150, '夏'), ('芒种', 165, '夏'),
    ('夏至', 180, '夏'), ('小暑', 195, '夏'), ('大暑', 210, '夏'),
    ('立秋', 225, '秋'), ('处暑', 240, '秋'), ('白露', 255, '秋'),
    ('秋分', 270, '秋'), ('寒露', 285, '秋'), ('霜降', 300, '秋'),
    ('立冬', 315, '冬'), ('小雪', 330, '冬'), ('大雪', 345, '冬'),
]

SEASON_COLOR = {'春': (74, 222, 128), '夏': (255, 120, 117),
                '秋': (253, 224, 71), '冬': (96, 165, 250)}
SEASON_HEX = {'春': '#4ade80', '夏': '#ff7875', '秋': '#fde047', '冬': '#60a5fa'}

# 五行主弧（wuxingArc.ts 实测输出）
WUXING = [('wood', '木', 60, 120), ('fire', '火', 150, 210),
          ('earth', '土', 30, 60), ('metal', '金', 240, 300),
          ('water', '水', 330, 390)]
WUXING_COLOR = {'木': (52, 211, 153), '火': (239, 68, 68), '土': (245, 158, 11),
                '金': (248, 250, 252), '水': (56, 189, 248)}
ALPHA = 0.16
BG = (29, 20, 14)


def arc_of(deg):
    """返回该数据角度落在哪个五行主弧"""
    for el, name, s, e in WUXING:
        d = deg % 360
        rel = (d - s) % 360
        if rel < (e - s):
            return name
    return None


def rgb_after_alpha(c, a, bg):
    return tuple(round(a * c[i] + (1 - a) * bg[i]) for i in range(3))


print('=' * 78)
print('角度   节气(外环文字色)      五行(内环扇区色)      两色是否易混')
print('=' * 78)

confusions = []
for name, deg, season in terms:
    el = arc_of(deg)
    sc = SEASON_COLOR[season]
    wc = WUXING_COLOR[el] if el else None
    # 内环扇区实际显示色（0.16 alpha 叠底色）
    shown = rgb_after_alpha(wc, ALPHA, BG) if wc else None
    # 相似度：外环文字色 vs 内环扇区显示色
    if shown:
        dist = sum((a - b) ** 2 for a, b in zip(sc, shown)) ** 0.5
    else:
        dist = 999
    same_family = (el == {'春': '木', '夏': '火', '秋': '金', '冬': '水'}[season])
    tag = '★ 同色系!' if same_family else ''
    print('%3d°  %-4s %-16s %-4s %-16s 欧氏距离=%5.1f %s' % (
        deg, name, SEASON_HEX[season], el,
        'rgb%s' % (shown,), dist, tag))
    if same_family:
        confusions.append((deg, name, season, el))

print()
print('=' * 78)
print('结论：以下位置的「节气环文字」与「五行环扇区」是同一个色系，')
print('      而两环在盘面上紧邻（r1..r2 / r2..r3），肉眼会读成')
print('      「一个颜色被切成内外两条带」→ 这就是用户说的"分割成2个环"')
print('=' * 78)
for deg, name, season, el in confusions:
    print('  %3d°  %s(%s) 与 五行%s 同色  -> %s / %s' % (
        deg, name, season, el, SEASON_HEX[season],
        {'春': '#4ade80 绿', '夏': '#ff7875 粉', '秋': '#fde047 黄', '冬': '#60a5fa 蓝'}[season]))
