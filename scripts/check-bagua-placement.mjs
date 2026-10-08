/**
 * 八卦环落位核查。
 * 约定：0°=子/正北=屏幕上方，顺时针为正（90°=卯/正东=屏幕右）。
 * 后天八卦四正：坎0(北) 离180(南) 震90(东) 兑270(西)
 * 四维：艮45(东北) 巽135(东南) 坤225(西南) 乾315(西北)
 */
import fs from 'node:fs';
const src = fs.readFileSync('src/data/taoData.ts', 'utf8');
const start = src.indexOf('export const TRIGRAMS');
const end = src.indexOf('];', start);
const seg = src.slice(start, end);
// 逐条抓 name / angleLater
const re = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',[\s\S]*?angleLater:\s*(-?[\d.]+)/g;
const items = [];
let m;
while ((m = re.exec(seg))) items.push({ id: m[1], name: m[2], angle: +m[3] });
console.log('TRIGRAMS 解析到', items.length, '条\n');

// 期望落位
const expect = { 坎: 0, 艮: 45, 震: 90, 巽: 135, 离: 180, 坤: 225, 兑: 270, 乾: 315 };
const dirName = (d) => {
  const map = { 0: '正北', 45: '东北', 90: '正东', 135: '东南', 180: '正南', 225: '西南', 270: '正西', 315: '西北' };
  return map[d] ?? `${d}°`;
};
console.log('卦名  数据angleLater  期望  判定');
let ok = 0;
for (const it of items) {
  const e = expect[it.name];
  const good = e === it.angle;
  if (good) ok++;
  console.log(
    `${it.name}    ${String(it.angle).padStart(3)}°          ${String(e).padStart(3)}°   ${good ? '✓' : '★ 不符'}  (${dirName(it.angle)})`
  );
}
console.log(`\n${ok}/${items.length} 落位正确`);
console.log('\n绘制时：angle = angleLater*π/180 - π/2，再用 ctx.rotate(angle + π/2)');
console.log('→ 文字局部 +x 指向「切向」，+y 指向「径向内」；与五行环一致。');
