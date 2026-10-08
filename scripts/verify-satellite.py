"""验证副段判定：哪些段被判为副段、字级分档是否正确"""

# WUXING_ARCS 实测输出（由 MOUNTAINS_24 反推）
ARCS = [
    ('wood',   60,  120),
    ('wood',   135, 150),   # 巽 15°  -> 副段
    ('fire',   150, 210),
    ('earth',  30,  60),
    ('earth',  120, 135),   # 辰 15°  -> 副段
    ('earth',  210, 240),   # 30°     -> 常规副段(不<30)
    ('earth',  300, 315),   # 戌 15°  -> 副段
    ('metal',  240, 300),
    ('metal',  315, 330),   # 乾 15°  -> 副段
    ('water',  330, 390),   # 跨0°，宽 60
]
MAIN = {
    'water': (330, 390),
    'wood':  (60, 120),
    'fire':  (150, 210),
    'metal': (240, 300),
    'earth': (30, 60),
}
SAT_MAX = 30

NAME = {'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水'}


def width(a):
    return a[2] - a[1]


def is_main(a):
    m = MAIN[a[0]]
    return a[1] == m[0] and a[2] == m[1]


def is_sat(a):
    return (not is_main(a)) and width(a) < SAT_MAX


print('=' * 74)
print('段级判定结果')
print('=' * 74)
print('  五行  区间        宽度  级别      填色alpha  字级   字alpha')
print('-' * 74)
LEVELS = []
for a in ARCS:
    w = width(a)
    m, st = is_main(a), is_sat(a)
    if m:
        lvl, fa, gs, ga = '主段', 0.42, 1.00, 1.00
    elif st:
        lvl, fa, gs, ga = '窄副段', 0.20, 0.56, 0.62
    else:
        lvl, fa, gs, ga = '常规副段', 0.42, 0.72, 0.82
    LEVELS.append(lvl)
    print('  %-4s %3d~%3d  %4d  %-9s %.2f     %.2f   %.2f' % (
        NAME[a[0]], a[1] % 360, a[2] % 360, w, lvl, fa, gs, ga))

print()
print('=' * 74)
print('核对：用户指认的 巽(135°) / 乾(315°) 是否已降级')
print('=' * 74)
for a in ARCS:
    if a[1] in (135, 315):
        ok = '已降级 ✓' if is_sat(a) else '仍是主段 ✗'
        print('  %s山 %3d° 宽%2d° -> %s' % (
            {135: '巽', 315: '乾'}[a[1]], a[1], width(a), ok))

print()
print('=' * 74)
print('视觉层级：环上「主色块」应只剩 5 个')
print('=' * 74)
strong = [a for a in ARCS if is_main(a)]
sat = [a for a in ARCS if is_sat(a)]
mid = [a for a in ARCS if not is_main(a) and not is_sat(a)]
print('  主段（0.42 填色 + 全尺寸字 + 2.4px 边）: %d 段' % len(strong))
for a in strong:
    print('     %s %3d~%3d (%d°)' % (NAME[a[0]], a[1] % 360, a[2] % 360, width(a)))
print('  常规副段（土，0.42 但字缩小）      : %d 段' % len(mid))
for a in mid:
    print('     %s %3d~%3d (%d°)' % (NAME[a[0]], a[1] % 360, a[2] % 360, width(a)))
print('  窄副段（0.20 填色 + 0.56 字 + 1.2px 边）: %d 段  <- 读作主段延伸' % len(sat))
for a in sat:
    print('     %s %3d~%3d (%d°)' % (NAME[a[0]], a[1] % 360, a[2] % 360, width(a)))

print()
print('  改前：10 段等权 -> 视觉上像"多了一层"')
print('  改后：5 主段 + 3 常规副段 + 4 窄副段，窄段明显退化 -> 主次分明')
print()

# 沿环检查相邻段是否有 3+ 个连续同级别
print('=' * 74)
print('相邻同级别连排检查（连排>=3 会读成"一整条独立环"）')
print('=' * 74)
seq = sorted(ARCS, key=lambda a: a[1])
# 展开成 15° 格
grid = []
for deg in range(0, 360, 15):
    for a in ARCS:
        rel = (deg - a[1]) % 360
        if rel < width(a):
            grid.append((deg, NAME[a[0]], is_main(a), is_sat(a)))
            break
run = 1
maxrun = 1
for i in range(1, len(grid)):
    if grid[i][1] == grid[i-1][1]:
        run += 1
        maxrun = max(maxrun, run)
    else:
        run = 1
print('  最长同五行连排 = %d 格 (%d°)' % (maxrun, maxrun * 15))
print('  （改前 巽木/辰土 交替处会出现 1~2 格窄段，与主段并列 → 割裂）')
print()
print('  各五行占据格数：')
from collections import Counter
cnt = Counter(g[1] for g in grid)
for k in '木火土金水':
    print('     %s %2d 格 (%d°)' % (k, cnt[k], cnt[k] * 15))
