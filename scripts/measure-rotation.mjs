/**
 * 实测罗盘当前转速（度/秒）与默认朝向。
 * 通过监听页面内读数面板的度数文本，采样计算真实角速度。
 */
import { chromium } from 'playwright';

const URL = process.env.READOUT_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const readDeg = () => page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) =>
    d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
  );
  if (!panel) return null;
  const deg = panel.querySelector('span.font-mono span');
  const char = panel.querySelector('span.font-calligraphy');
  const v = parseFloat(deg?.textContent || 'NaN');
  return { deg: v, char: char?.textContent || '' };
});

// —— 采样 8 秒，计算真实角速度 ——
const samples = [];
const t0 = Date.now();
for (let i = 0; i < 16; i++) {
  samples.push({ t: (Date.now() - t0) / 1000, ...(await readDeg()) });
  await page.waitForTimeout(500);
}

console.log('=== 采样序列 ===');
samples.forEach((s) => console.log(`  t=${s.t.toFixed(1)}s  deg=${s.deg}  ${s.char}`));

// 用首尾差算总角速度（含跨 0 回绕）
const first = samples[0];
const last = samples[samples.length - 1];
let delta = last.deg - first.deg;
if (delta < -180) delta += 360;
if (delta > 180) delta -= 360;
const dur = last.t - first.t;
const degPerSec = delta / dur;
const secPerTurn = degPerSec !== 0 ? 360 / Math.abs(degPerSec) : Infinity;

console.log('\n=== 实测转速 ===');
console.log(`  采样时长: ${dur.toFixed(1)}s，角度变化: ${delta.toFixed(1)}°`);
console.log(`  角速度  : ${degPerSec.toFixed(3)} °/s`);
console.log(`  转一圈  : ${secPerTurn.toFixed(1)} 秒`);
console.log(`  转完24山(15°/山): ${(15 / Math.abs(degPerSec)).toFixed(2)} 秒`);

// 采样间隔内的抖动幅度（判断是匀速还是顿挫）
const steps = [];
for (let i = 1; i < samples.length; i++) {
  let d = samples[i].deg - samples[i - 1].deg;
  if (d < -180) d += 360;
  if (d > 180) d -= 360;
  steps.push(d);
}
const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
const maxJump = Math.max(...steps.map((s) => Math.abs(s - avg)));
console.log(`\n=== 平稳度（每 0.5s 步进） ===`);
console.log(`  平均步进: ${avg.toFixed(3)}°，最大抖动: ±${maxJump.toFixed(3)}°`);

console.log('\n=== 默认朝向 ===');
const s0 = await readDeg();
console.log(`  初始读数: ${s0.deg}° → ${s0.char}山`);
const camInfo = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c ? { w: c.clientWidth, h: c.clientHeight } : null;
});
console.log(`  画布尺寸: ${camInfo ? camInfo.w + 'x' + camInfo.h : 'n/a'}`);

await browser.close();
