/**
 * 核对：五行环色块的角度区间，是否与「该角度上二十四山的五行归属」逐度一致。
 */
import fs from 'node:fs';
const src = fs.readFileSync('src/data/taoData.ts', 'utf8');
const s = src.indexOf('export const MOUNTAINS_24');
const e = src.indexOf('];', s);
const seg = src.slice(s, e);
const re = /name:\s*'([^']+)',\s*angle:\s*(-?[\d.]+),\s*type:\s*'([^']+)',\s*element:\s*'(\w+)'/g;
const mountains = [];
let m;
while ((m = re.exec(seg))) mountains.push({ name: m[1], angle: +m[2], element: m[4] });
console.log('山位解析:', mountains.length, '条');

function buildArcs(element) {
  const a = mountains.filter((x) => x.element === element).map((x) => x.angle).sort((x, y) => x - y);
  if (!a.length) return [];
  const raw = [];
  let st = a[0], pv = a[0];
  for (let i = 1; i < a.length; i++) {
    if (a[i] === pv + 15) { pv = a[i]; continue; }
    raw.push({ element, startDeg: st, endDeg: pv + 15 });
    st = a[i]; pv = a[i];
  }
  raw.push({ element, startDeg: st, endDeg: pv + 15 });
  if (raw.length > 1) {
    const f = raw[0], l = raw[raw.length - 1];
    if (f.startDeg === 0 && l.endDeg === 360) {
      raw.pop();
      raw[0] = { element, startDeg: l.startDeg, endDeg: f.endDeg + 360 };
    }
  }
  return raw;
}
const ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
const arcs = ORDER.flatMap(buildArcs);

let bad = 0;
const rows = [];
// 跨 0° 的弧（如 water 330~390）要按「模 360 区间包含」判断，
// 不能直接用 d >= start && d < end —— 否则 0~29° 全部漏配（曾误报 30 处不一致）。
const inArc = (a, d) => {
  const span = a.endDeg - a.startDeg;
  const off = (((d - a.startDeg) % 360) + 360) % 360;
  return off < span;
};
for (let d = 0; d < 360; d++) {
  const arc = arcs.find((a) => inArc(a, d));
  const arcEl = arc ? arc.element : null;
  const cell = Math.floor(d / 15) * 15;
  const mt = mountains.find((x) => x.angle === cell);
  const mtEl = mt ? mt.element : null;
  if (arcEl !== mtEl) { bad++; rows.push(`  ${d}° 弧=${arcEl} 山(${mt ? mt.name : '?'})=${mtEl}`); }
}
console.log(`\n逐度核对 360 个角度：不一致 ${bad} 处`);
if (rows.length) console.log(rows.slice(0, 30).join('\n'));
else console.log('✓ 五行环色块与二十四山五行归属逐度完全一致');

console.log('\n五行弧段：');
for (const a of arcs) {
  const w = a.endDeg - a.startDeg;
  console.log(`  ${a.element.padEnd(6)} ${String(a.startDeg).padStart(4)}~${String(a.endDeg).padStart(4)}  宽${w}°  中点${(a.startDeg + a.endDeg) / 2 % 360}°`);
}
