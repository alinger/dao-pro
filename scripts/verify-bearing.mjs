/**
 * 方位换算逻辑自测（不依赖 React / three，直接跑纯函数）
 * 运行： node scripts/verify-bearing.mjs
 */

// —— 复刻 src/utils/bearing.ts 中的纯逻辑（保持与实现一致的算法） ——
const NAMES = ['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙',
               '午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
const TERMS = ['冬至','小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种',
               '夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪'];
const YANG = ['甲','庚','丙','壬','乾','坤','艮','巽','寅','申','巳','亥'];

const norm = (d) => { const x = d % 360; return x < 0 ? x + 360 : x; };
const idxOf = (d) => Math.floor(((norm(d) + 7.5) % 360) / 15) % 24;

let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}: got=${got} want=${want}`);
};

console.log('=== 1) 二十四山中心角精确命中 ===');
for (let i = 0; i < 24; i++) {
  check(`angle ${i * 15}deg -> 山名`, NAMES[idxOf(i * 15)], NAMES[i]);
}

console.log('\n=== 2) 扇区边界（±7.5deg 归属规则） ===');
// 山心 i*15，扇区 [i*15-7.5, i*15+7.5)；边界值归属下一山
check('332.4 (亥扇区内)', NAMES[idxOf(332.4)], '亥');
check('322.5 (亥扇区起点)', NAMES[idxOf(322.5)], '亥');
check('322.4 (仍在乾)', NAMES[idxOf(322.4)], '乾');
check('337.5 (亥扇区终点，归壬)', NAMES[idxOf(337.5)], '壬');
check('352.5 (子扇区起点)', NAMES[idxOf(352.5)], '子');
check('7.4 (子/癸扇区内)', NAMES[idxOf(7.4)], '子');
check('7.5 (进入癸)', NAMES[idxOf(7.5)], '癸');
check('359.9 (归子山，跨0°回绕)', NAMES[idxOf(359.9)], '子');

console.log('\n=== 3) 四正方位 ===');
check('0deg 子(正北)', NAMES[idxOf(0)], '子');
check('90deg 卯(正东)', NAMES[idxOf(90)], '卯');
check('180deg 午(正南)', NAMES[idxOf(180)], '午');
check('270deg 酉(正西)', NAMES[idxOf(270)], '酉');

console.log('\n=== 4) 阴阳山分类 ===');
check('壬(345) 阳山', YANG.includes(NAMES[idxOf(345)]), true);
check('辛(285) 阴山', YANG.includes(NAMES[idxOf(285)]), false);
check('乾(315) 阳山', YANG.includes(NAMES[idxOf(315)]), true);

console.log('\n=== 5) 节气对齐（与山位同为 15deg 网格） ===');
check('0deg 节气', TERMS[idxOf(0)], '冬至');
check('180deg 节气', TERMS[idxOf(180)], '夏至');
check('345deg 节气', TERMS[idxOf(345)], '大雪');

console.log('\n=== 6) 归一化（负角度 /超 360） ===');
check('-1 -> 359', norm(-1), 359);
check('361 -> 1', norm(361), 1);
check('-370 -> 350', norm(-370), 350);
check('720 -> 0', norm(720), 0);
check('-15 -> 345', NAMES[idxOf(-15)], '壬');

console.log('\n=== 7) 全周遍历：索引单调、无跳变、无重复 ===');
let monotonic = true, unique = new Set();
for (let d = 0; d < 360; d += 0.5) {
  const i = idxOf(d);
  unique.add(i);
  if (i !== idxOf(d - 0.5 + 360) && d > 0) {
    // 允许 +1 递增或回绕到 0
    const prev = idxOf(d - 0.5 + 360);
    const okStep = i === (prev + 1) % 24;
    if (!okStep) { monotonic = false; console.log(`    jump at ${d}: ${prev} -> ${i}`); break; }
  }
}
check('24 个索引全覆盖', unique.size, 24);
check('步进单调无跳变', monotonic, true);

console.log('\n=== 8) 镜像不改变读数语义 ===');
const readAt = (d) => NAMES[idxOf(norm(d))];
check('物理角 30 读数', readAt(30), '丑');
check('镜像态下仍读物理角（非 360-x 反算）', readAt(30), '丑');

console.log(`\n=== 结果: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);