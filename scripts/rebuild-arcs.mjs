import fs from 'node:fs';
const src = fs.readFileSync('src/data/taoData.ts', 'utf8');
const start = src.indexOf('export const MOUNTAINS_24');
const end = src.indexOf('];', start);
const seg = src.slice(start, end);
// 严格单行匹配：{ name: '子', angle: 0, type: 'diZhi', element: 'water' }
const re = /name:\s*'([^']+)',\s*angle:\s*(-?[\d.]+),\s*type:\s*'([^']+)',\s*element:\s*'(\w+)'/g;
const items = [];
let m;
while ((m = re.exec(seg))) items.push({ name: m[1], angle: +m[2], type: m[3], element: m[4] });
console.log('MOUNTAINS_24 解析到', items.length, '条');
if (items.length < 24) {
  console.log(seg.slice(0, 2000));
  process.exit(0);
}
const byEl = {};
for (const it of items) (byEl[it.element] ||= []).push(it);
for (const el of ['water', 'wood', 'fire', 'metal', 'earth']) {
  const list = (byEl[el] || []).sort((a, b) => a.angle - b.angle);
  console.log(`\n${el.padEnd(6)}`, list.map((x) => `${x.name}${x.angle}`).join(' '));
}

// 重建 buildArcs
function buildArcs(element) {
  const angles = items.filter((x) => x.element === element).map((x) => x.angle).sort((a, b) => a - b);
  if (!angles.length) return [];
  const raw = [];
  let s = angles[0], p = angles[0];
  for (let i = 1; i < angles.length; i++) {
    if (angles[i] === p + 15) { p = angles[i]; continue; }
    raw.push({ element, startDeg: s, endDeg: p + 15 });
    s = angles[i]; p = angles[i];
  }
  raw.push({ element, startDeg: s, endDeg: p + 15 });
  if (raw.length > 1) {
    const f = raw[0], l = raw[raw.length - 1];
    if (f.startDeg === 0 && l.endDeg === 360) {
      raw.pop();
      raw[0] = { element, startDeg: l.startDeg, endDeg: f.endDeg + 360 };
    }
  }
  return raw;
}
console.log('\n=== WUXING_ARCS（含副段判定）===');
const ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
const all = ORDER.flatMap(buildArcs);
// 主段
const main = {};
for (const el of ORDER) {
  const arcs = all.filter((a) => a.element === el);
  main[el] = arcs.reduce((a, b) => (b.endDeg - b.startDeg > a.endDeg - a.startDeg ? b : a));
}
for (const a of all) {
  const w = a.endDeg - a.startDeg;
  const isMain = a.startDeg === main[a.element].startDeg && a.endDeg === main[a.element].endDeg;
  const isSat = !isMain && w < 30;
  const mid = ((a.startDeg + a.endDeg) / 2) % 360;
  console.log(
    `${a.element.padEnd(6)} ${String(a.startDeg).padStart(4)}~${String(a.endDeg).padStart(4)}  宽${String(w).padStart(3)}  中点${String(mid).padStart(4)}°  ${isMain ? '主段' : isSat ? '窄副段' : '常规副段'}`
  );
}
// 覆盖检查
const cover = new Array(360).fill(0);
for (const a of all) for (let d = a.startDeg; d < a.endDeg; d++) cover[((d % 360) + 360) % 360]++;
const gaps = cover.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
const dup = cover.map((v, i) => (v > 1 ? i : -1)).filter((i) => i >= 0);
console.log('\n覆盖检查：未覆盖角', gaps.length ? gaps.join(',') : '无', ' 重复覆盖角', dup.length ? dup.join(',') : '无');
