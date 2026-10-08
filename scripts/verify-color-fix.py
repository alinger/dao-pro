"""改后验证：五行环 0.42 alpha 是否真的可辨？且与中性色节气环是否还撞色？"""

BG = (29, 20, 14)          # 五行环内木纹底色（实测）
ALPHA = 0.42

WUXING = {
    '木': (52, 211, 153),
    '火': (239, 68, 68),
    '土': (245, 158, 11),
    '金': (226, 232, 240),   # 已从 248,250,252 调为略偏冷的白，避免与"秋黄"混淆
    '水': (56, 189, 248),
}
SEASON = {           # 改后：中性米白两档
    'major': (255, 243, 196),
    'minor': (232, 220, 192),
}


def blend(c, a, bg=BG):
    return tuple(round(a * c[i] + (1 - a) * bg[i]) for i in range(3))


def sat(c):
    mx, mn = max(c), min(c)
    return (mx - mn) / mx if mx else 0


print('=' * 74)
print('一、改后五行环实际显示色（0.42 alpha 叠底色）')
print('=' * 74)
print('  五行  源色             实际显示色        亮度  饱和度  与底色亮度差')
print('-' * 74)
shown = {}
for el, c in WUXING.items():
    o = blend(c, ALPHA)
    shown[el] = o
    d = sum(abs(o[i] - BG[i]) for i in range(3)) / 3
    print('  %-4s %-16s rgb%-14s %3d   %.2f    %5.1f' % (
        el, str(c), str(o), round(sum(o) / 3), sat(o), d))

print()
print('  旧值(0.16 alpha)对比：')
for el, c in WUXING.items():
    o = blend(c, 0.16)
    print('    %-4s rgb%-16s 亮度=%3d 饱和度=%.2f' % (el, str(o), round(sum(o) / 3), sat(o)))

print()
print('=' * 74)
print('二、判定：0.42 下五色是否互相可区分')
print('=' * 74)
els = list(shown)
worst = None
for i in range(len(els)):
    for j in range(i + 1, len(els)):
        a, b = shown[els[i]], shown[els[j]]
        dist = sum((a[k] - b[k]) ** 2 for k in range(3)) ** 0.5
        if worst is None or dist < worst[0]:
            worst = (dist, els[i], els[j])
        print('  %s vs %s  欧氏距离=%6.1f %s' % (
            els[i], els[j], dist, '  <-- 最接近的一对' if (dist, els[i], els[j]) == worst else ''))
print()
print('  最小间距 = %.1f（%s vs %s）' % worst)
print('  判定：%s' % ('足够区分' if worst[0] >= 40 else '仍偏近，建议再调'))

print()
print('=' * 74)
print('三、撞色复查：改后是否还有"同色被切成两半"的格')
print('=' * 74)
# 五行显示色 vs 节气中性色
print('  五行环显示色都是高饱和（sat>=%.2f），节气环是低饱和米白（sat<=%.2f）：' % (
    min(sat(v) for v in shown.values()), max(sat(v) for v in SEASON.values())))
print()
clash = 0
for el, o in shown.items():
    for sk, sc in SEASON.items():
        dist = sum((o[k] - sc[k]) ** 2 for k in range(3)) ** 0.5
        if dist < 40:
            clash += 1
            print('  !! %s vs %s 距离 %.1f' % (el, sk, dist))
if clash == 0:
    print('  ✓ 五行环与节气环之间已无近距离撞色（最小距离均 >= 40）')
print()
print('  24 格中，五行显示色与节气文字色的最小距离：')
mn = 999
for el, o in shown.items():
    for sk, sc in SEASON.items():
        d = sum((o[k] - sc[k]) ** 2 for k in range(3)) ** 0.5
        mn = min(mn, d)
print('    %.1f  →  %s' % (mn, '安全' if mn >= 40 else '仍有风险'))
