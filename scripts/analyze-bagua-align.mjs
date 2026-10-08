/**
 * 八卦环与二十四山一致性核对
 * ========================
 *
 * 背景：五行环被证实硬编码为「5 等分 72°、起点正北、首字木」，
 * 导致正北子位落在水/木分界线上。本脚本同理核对八卦环。
 *
 * 贴图约定（textureGenerator.ts）：
 *   TRIGRAMS[i] 的 angle = i*2PI/8 - PI/2 → 数据角度 = i*45
 *   即 TRIGRAMS[0](乾) 落在数据 0°（正北子位）
 *
 * 对照 MOUNTAINS_24：卦名对应的山位角度是权威落位
 *   乾 315°  兑 225°? -> 查数据  坤 225°  艮 45°
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const TRIGRAMS = [
  { name: '乾', dirLater: '正北' },
  { name: '兑', dirLater: '正西' },
  { name: '离', dirLater: '正南' },
  { name: '震', dirLater: '正东' },
  { name: '巽', dirLater: '东南' },
  { name: '坎', dirLater: '正北' },
  { name: '艮', dirLater: '东北' },
  { name: '坤', dirLater: '西南' },
];

// MOUNTAINS_24 里出现的卦山（gua 型）
const GUA_MOUNTAINS = [
  { name: '艮', angle: 45, element: 'earth' },
  { name: '巽', angle: 135, element: 'wood' },
  { name: '坤', angle: 225, element: 'earth' },
  { name: '乾', angle: 315, element: 'metal' },
];

function bearingName(deg) {
  const names = [
    '子/正北', '癸/北偏东', '丑/东北', '艮/东北', '寅/东偏北', '甲/东偏北',
    '卯/正东', '乙/东偏南', '辰/东南', '巽/东南', '巳/南偏东', '丙/南偏东',
    '午/正南', '丁/南偏西', '未/西南', '坤/西南', '申/西偏南', '庚/西偏南',
    '酉/正西', '辛/西偏北', '戌/西北', '乾/西北', '亥/北偏西', '壬/北偏西',
  ];
  const i = Math.round((((deg % 360) + 360) % 360) / 15) % 24;
  return names[i];
}

console.log('=== 八卦环当前落位（TRIGRAMS[i] → 数据角度 i*45） ===');
TRIGRAMS.forEach((t, i) => {
  const deg = i * 45;
  console.log(`${t.name}  数据 ${String(deg).padStart(3)}°  ${bearingName(deg)}`.padEnd(46) + `数据表标注方位: ${t.dirLater}`);
});

console.log('\n=== 二十四山里的卦山（权威落位） ===');
GUA_MOUNTAINS.forEach((m) => {
  console.log(`${m.name}  数据 ${String(m.angle).padStart(3)}°  ${bearingName(m.angle)}  五行=${m.element}`);
});

console.log('\n=== 差异 ===');
const guaAngle = Object.fromEntries(GUA_MOUNTAINS.map((m) => [m.name, m.angle]));
for (const [name, authoritative] of Object.entries(guaAngle)) {
  const i = TRIGRAMS.findIndex((t) => t.name === name);
  const current = i * 45;
  let diff = ((current - authoritative + 540) % 360) - 180;
  console.log(
    `${name}  当前 ${String(current).padStart(3)}°  应在 ${String(authoritative).padStart(3)}°  偏差 ${String(diff).padStart(5)}°`
  );
}