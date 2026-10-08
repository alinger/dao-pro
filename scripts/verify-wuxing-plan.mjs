/**
 * 五行环重绘方案的离线验证（纯 Node）
 * 确认「按山位逐格上色 + 字落在最宽连续段中点」能让四正精确落在子午卯酉。
 */
const D2R = Math.PI / 180, R2D = 180 / Math.PI;

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

const CELL = 15;
const Hanzi = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const CARD = { 0: '子·正北', 90: '卯·正东', 180: '午·正南', 270: '酉·正西' };

// 1) 逐格按五行分组（每格占 [angle, angle+15)）
const cells = { wood: [], fire: [], earth: [], metal: [], water: [] };
for (const m of MOUNTAINS_24) cells[m.element].push(m.angle);

// 2) 求环形连续段
function runs(angles) {
  if (!angles.length) return [];
  const sorted = [...angles].sort((a, b) => a - b);
  const out = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + CELL) { prev = sorted[i]; continue; }
    out.push([start, prev + CELL]);
    start = sorted[i]; prev = sorted[i];
  }
  out.push([start, prev + CELL]);
  // 首尾相接则合并（跨越 0°）
  if (out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (f[0] === 0 && l[1] === 360) {
      out.pop();
      out[0] = [l[0], f[1] + 360];
    }
  }
  return out;
}

console.log('=== 各五行的连续段与字位 ===');
const result = {};
for (const k of ['water', 'fire', 'wood', 'metal', 'earth']) {
  const rs = runs(cells[k]);
  const widest = rs.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
  const mid = ((widest[0] + widest[1]) / 2) % 360;
  const midName = CARD[Math.round(mid / 90) * 90 % 360] || '';
  result[k] = { runs: rs, glyphDeg: mid };
  console.log(
    `${Hanzi[k]}  段数=${rs.length}  ${rs.map((r) => `[${r[0]}~${r[1] % 360})`.padEnd(12)).join('')}`.padEnd(52) +
    `字位 ${String(mid.toFixed(1)).padStart(6)}°  ${midName}`
  );
}

console.log('\n=== 断言：四正是否精确落在子午卯酉 ===');
const allRuns = Object.values(result).flatMap((r) => r.runs.map((x) => [x[0], x[1]]));
const checks = [
  ['water', 0, '水居正北(子)'], ['wood', 90, '木居正东(卯)'],
  ['fire', 180, '火居正南(午)'], ['metal', 270, '金居正西(酉)'],
];
let allOk = true;
for (const [k, want, label] of checks) {
  const got = result[k].glyphDeg;
  const diff = Math.abs(((got - want + 540) % 360) - 180);
  const ok = diff < 0.5;
  if (!ok) allOk = false;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label} — 期望 ${want}° 实际 ${got}° 偏差 ${diff}°`);
}

// 覆盖完整性：每格必须被恰好一个段覆盖
console.log('\n=== 覆盖完整性（每格恰好一次） ===');
let covered = 0, overlap = 0, missing = [];
// 注意：跨 0° 的段（如水 330~390）区间端点可能 >360，
// 必须用环形距离判断「格中心是否落在段内」，不能直接比 d>=a && d<b，
// 否则 0°/15° 会被误判为漏格（第一版就踩了这个坑）。
const inRun = (d, [a, b]) => {
  const len = b - a;
  const rel = (((d - a) % 360) + 360) % 360;
  return rel < len;
};
for (let d = 0; d < 360; d += CELL) {
  const n = allRuns.filter((r) => inRun(d, r)).length;
  if (n === 1) covered++;
  else if (n > 1) overlap++;
  else missing.push(d);
}
console.log(`被恰好覆盖 ${covered}/24 格，重叠 ${overlap} 格，遗漏 ${24 - covered - overlap} 格 ${missing.join(',')}`);
console.log(covered === 24 && overlap === 0 ? '[PASS] 覆盖完整无重叠' : '[FAIL] 覆盖有问题');
console.log(allOk && covered === 24 && overlap === 0 ? '\n总判定：方案可行' : '\n总判定：方案需调整');