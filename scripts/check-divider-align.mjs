/**
 * 环间「分隔线对齐」核查。
 *
 * 用户反复反馈「断层 / 断成2个环 / 被切到一个圆环」。
 * 二维内容已核实无误，因此怀疑是**分隔线在相邻环之间错开半格**
 * （每环的分隔线都画在自己那一段半径上、角度基准又各不相同），
 * 视觉上把连续的一段区域切成几个不对齐的条带 → 读成"断层"。
 *
 * 本脚本列出每环分隔线的角度集合，并指出哪些相邻环之间存在错位。
 */
const CELL = 15;   // 廿四山 / 节气 每格 15°
const degs = (n, offset = 0) => Array.from({ length: n }, (_, i) => (i * 360 / n + offset + 720) % 360).sort((a, b) => a - b);

// 各环分隔线角度（按 textureGenerator.ts 的实际画法）
//   RING1 八卦：8 卦，画在 (angleLater - 22.5°)
const baguaAngles = [0, 45, 90, 135, 180, 225, 270, 315];       // 卦的**中心角**
const baguaDiv = baguaAngles.map((a) => (a - 22.5 + 720) % 360).sort((a, b) => a - b);
//   RING2 五行：10 段，画在每段的 startDeg
const wuxingDiv = [60, 135, 150, 30, 120, 210, 300, 240, 315, 330].sort((a, b) => a - b);
//   RING3 节气：24 格，画在 (angle - 7.5°)
const termDiv = Array.from({ length: 24 }, (_, i) => (i * 15 - 7.5 + 720) % 360).sort((a, b) => a - b);
//   RING4 廿四山：24 格，画在 (angle - 7.5°)  —— 与节气相同
const mountDiv = termDiv.slice();
//   RING5 廿八宿：28 格，画在 (i*360/28 - 360/56)
const manDiv = Array.from({ length: 28 }, (_, i) => ((i * 360 / 28) - 360 / 56 + 720) % 360).sort((a, b) => a - b);

const fmt = (arr) => arr.map((v) => v.toFixed(1)).join(', ');
console.log('各环分隔线角度：');
console.log('  R1 先天八卦(8 条) :', fmt(baguaDiv));
console.log('  R2 五行(10 条)    :', fmt(wuxingDiv));
console.log('  R3 节气(24 条)    :', fmt(termDiv));
console.log('  R4 廿四山(24 条)  :', fmt(mountDiv));
console.log('  R5 廿八宿(28 条)  :', fmt(manDiv));

function mismatches(a, b) {
  // 对 a 中每条线，找 b 中最接近的角度，差的绝对值
  return a.map((x) => {
    let best = 999;
    for (const y of b) {
      const d = Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
      if (d < best) best = d;
    }
    return +best.toFixed(1);
  });
}

const pairs = [
  ['R1 八卦 → R2 五行', baguaDiv, wuxingDiv],
  ['R2 五行 → R3 节气', wuxingDiv, termDiv],
  ['R3 节气 → R4 廿四山', termDiv, mountDiv],
  ['R4 廿四山 → R5 廿八宿', mountDiv, manDiv],
];
console.log('\n相邻环分隔线错位量（度）：');
for (const [name, a, b] of pairs) {
  const ms = mismatches(a, b);
  const avg = ms.reduce((s, v) => s + v, 0) / ms.length;
  const max = Math.max(...ms);
  console.log(`  ${name.padEnd(20)} 平均错位 ${avg.toFixed(1)}°  最大 ${max.toFixed(1)}°   ${avg > 3 ? '★ 明显错开' : '基本对齐'}`);
}
console.log('\n关键：R3 节气 与 R4 廿四山 的分隔线角度集合完全相同 → 这两环是「同心同格」的。');
console.log('      R2 五行(10 段不等宽) 与 R3/R4(24 等格) 天然不可能对齐 —— 这是设计使然。');
console.log('      但若两环的**边框线**颜色相近、半径又紧邻，错开的竖线会被读成"断层"。');
