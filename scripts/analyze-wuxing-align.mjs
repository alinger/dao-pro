/**
 * 五行环与二十四山五行一致性分析（纯 Node，无浏览器）
 *
 * 问题：用户反馈「罗盘上的金木水火土好像显示有错位」。
 * 本脚本回答一个客观问题：五行环上每个字占据的角度区间，
 * 与二十四山里该五行实际所在的山位区间，是否一致。
 *
 * 贴图约定（src/utils/textureGenerator.ts）：
 *   canvas 角度 a = 数据角度(deg) * PI/180 - PI/2
 *   即数据 0°（子/正北）落在 canvas -90°（正上方），顺时针为正。
 *   五行环用 startA = i*2PI/5 - PI/2，即第一个扇区从 -90°（正上方）开始。
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// 方位名（数据角度体系：0=子/北，顺时针）
function bearingName(deg) {
  const names = [
    '子/正北', '癸/北偏东', '丑/东北', '艮/东北', '寅/东偏北', '甲/东偏北',
    '卯/正东', '乙/东偏南', '辰/东南', '巽/东南', '巳/南偏东', '丙/南偏东',
    '午/正南', '丁/南偏西', '未/西南', '坤/西南', '申/西偏南', '庚/西偏南',
    '酉/正西', '辛/西偏北', '戌/西北', '乾/西北', '亥/北偏西', '壬/北偏西',
  ];
  const i = Math.round(((deg % 360) + 360) % 360 / 15) % 24;
  return names[i];
}

const MOUNTAINS_24 = [
  { name: '子', angle: 0, element: 'water' }, { name: '癸', angle: 15, element: 'water' },
  { name: '丑', angle: 30, element: 'earth' }, { name: '艮', angle: 45, element: 'earth' },
  { name: '寅', angle: 60, element: 'wood' }, { name: '甲', angle: 75, element: 'wood' },
  { name: '卯', angle: 90, element: 'wood' }, { name: '乙', angle: 105, element: 'wood' },
  { name: '辰', angle: 120, element: 'earth' }, { name: '巽', angle: 135, element: 'wood' },
  { name: '巳', angle: 150, element: 'fire' }, { name: '丙', angle: 165, element: 'fire' },
  { name: '午', angle: 180, element: 'fire' }, { name: '丁', angle: 195, element: 'fire' },
  { name: '未', angle: 210, element: 'earth' }, { name: '坤', angle: 225, element: 'earth' },
  { name: '申', angle: 240, element: 'metal' }, { name: '庚', angle: 255, element: 'metal' },
  { name: '酉', angle: 270, element: 'metal' }, { name: '辛', angle: 285, element: 'metal' },
  { name: '戌', angle: 300, element: 'earth' }, { name: '乾', angle: 315, element: 'metal' },
  { name: '亥', angle: 330, element: 'water' }, { name: '壬', angle: 345, element: 'water' },
];

// === 当前实现：五行环扇区（贴图第 273-312 行）===
const elementKeys = ['wood', 'fire', 'earth', 'metal', 'water'];
const Hanzi = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const current = elementKeys.map((k, i) => {
  const startDeg = (i * 360) / 5;      // -PI/2 抵消后，即数据角度 0,72,144,216,288
  const endDeg = ((i + 1) * 360) / 5;
  const midDeg = (startDeg + endDeg) / 2;
  return { key: k, hanzi: Hanzi[k], startDeg, endDeg, midDeg };
});

console.log('=== 当前实现：五行环扇区落位（数据角度体系，0=子/正北） ===');
console.log('字扇区(°)      字中点方位        该扇区覆盖的 15° 山位格');
for (const e of current) {
  const cells = [];
  for (let d = 0; d < 360; d += 15) {
    const c = ((d - e.startDeg) % 360 + 360) % 360;
    if (c < e.endDeg - e.startDeg) cells.push(`${d}°${bearingName(d)}`);
  }
  console.log(
    `${e.hanzi}  [${String(e.startDeg).padStart(3)}°~${String(e.endDeg % 360).padStart(3)}°)`.padEnd(20) +
    `${String(e.midDeg).padStart(5)}° ${bearingName(e.midDeg)}`.padEnd(24) +
    cells.length
  );
}

// === 二十四山里各五行的实际分布 ===
console.log('\n=== 二十四山数据里各五行的实际山位 ===');
const byElem = {};
for (const m of MOUNTAINS_24) {
  (byElem[m.element] ||= []).push(m);
}
for (const k of elementKeys) {
  const list = byElem[k] || [];
  const degs = list.map((m) => m.angle);
  console.log(
    `${Hanzi[k]}  ${String(list.length).padStart(2)} 个山位  角度[${degs.join(',')}]`.padEnd(58) +
    `跨度数 ${Math.max(...degs) - Math.min(...degs) + 15}`
  );
}

console.log('\n=== 结论：字中点 vs 该五行山位中心 ===');
for (const k of elementKeys) {
  const e = current.find((x) => x.key === k);
  const list = byElem[k] || [];
  // 环形中心
  let sin = 0, cos = 0;
  for (const m of list) { sin += Math.sin(m.angle * D2R); cos += Math.cos(m.angle * D2R); }
  const center = ((Math.atan2(sin, cos) * R2D) + 360) % 360;
  let diff = ((e.midDeg - center + 540) % 360) - 180;
  const flag = Math.abs(diff) <= 6 ? '对齐' : Math.abs(diff) <= 20 ? '略偏' : '明显错位';
  console.log(
    `${Hanzi[k]}  字中点 ${String(e.midDeg).padStart(5)}°  山位中心 ${String(center.toFixed(1)).padStart(6)}°  偏差 ${String(diff.toFixed(1)).padStart(7)}°  → ${flag}`
  );
}