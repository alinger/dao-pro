/**
 * 帧率无关性证明。
 *
 * 背景：旧实现是 `angle += 0.0012`（每帧增量），角速度 ∝ 刷新率。
 * 144Hz 屏上会比 60Hz 屏快 2.4 倍——同一份代码在不同显示器上转速完全不同。
 *
 * 方法：在页面加载前把 requestAnimationFrame 换成 setTimeout(1000/hz)，
 * 从源头把整个应用（React + three.js）限速到目标 Hz。
 * 这模拟的是「真实显示器刷新率不同」，而不只是改动画函数。
 *
 * 预期：30 / 60 / 144 / 240 Hz 下实测角速度都应 ≈ 1.000 °/s。
 * 若实现仍是每帧增量，240Hz 会测到 ≈ 4.000 °/s。
 *
 * 用法：READOUT_URL=http://127.0.0.1:3000/ node scripts/verify-framerate.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.READOUT_URL || 'http://127.0.0.1:3000/';
const EXPECTED = 1.0;
const RATES = [30, 60, 144, 240];
// 采样时长（ms）。低 Hz 下同样时长内帧数少，量化误差占比更大，放宽容差。
const SAMPLE_MS = 14000;
const TOL = { 30: 0.2, 60: 0.12, 144: 0.25, 240: 0.35 };

const wrapDelta = (d) => (d < -180 ? d + 360 : d > 180 ? d - 360 : d);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

console.log('=== 帧率无关性：不同刷新率下的角速度应保持一致 ===');
const results = [];

for (const hz of RATES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript((targetHz) => {
    const gap = 1000 / targetHz;
    // 用 setTimeout 替代 rAF：真正把主循环限速到 targetHz。
    // 保留 cancelAnimationFrame / cancelTimeout 的配对语义，避免卸载泄漏。
    const timers = new Map();
    let seq = 0;
    window.requestAnimationFrame = (cb) => {
      const id = ++seq;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          cb(performance.now());
        }, gap)
      );
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      const t = timers.get(id);
      if (t !== undefined) {
        clearTimeout(t);
        timers.delete(id);
      }
    };
  }, hz);

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(3000);

  // 反推实际跑到的 fps：用 rAF 自身计数（已被限速，故反映真实值）
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          const dt = performance.now() - t0;
          if (dt >= 2000) res((n * 1000) / dt);
          else window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      })
  );

  const readDeg = () =>
    page.evaluate(() => {
      const panel = [...document.querySelectorAll('div')].find(
        (d) => d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
      );
      if (!panel) return null;
      return parseFloat(panel.querySelector('span.font-mono span')?.textContent || 'NaN');
    });

  const t0 = Date.now();
  const s0 = await readDeg();
  await page.waitForTimeout(SAMPLE_MS);
  const s1 = await readDeg();
  const dur = (Date.now() - t0) / 1000;
  const degPerSec = wrapDelta(s1 - s0) / dur;

  const pass = Math.abs(degPerSec - EXPECTED) <= TOL[hz];
  results.push({ hz, fps, degPerSec, pass });
  console.log(
    `  [${pass ? 'PASS' : 'FAIL'}] 限速 ${String(hz).padStart(3)}Hz → 实际 ${fps.toFixed(1).padStart(5)}fps，` +
      `角速度 ${degPerSec.toFixed(3)} °/s（期望 1.000 ±${(TOL[hz] * 100).toFixed(0)}%）`
  );

  await page.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== 汇总：${results.length - failed.length}/${results.length} 通过 ===`);
failed.forEach((f) => console.log(`  FAIL: 限速 ${f.hz}Hz 实测 ${f.degPerSec.toFixed(3)} °/s`));

const speeds = results.map((r) => r.degPerSec);
const spread = Math.max(...speeds) - Math.min(...speeds);
console.log(
  `\n角速度极差（max-min）: ${spread.toFixed(3)} °/s，占基准 ${((spread / EXPECTED) * 100).toFixed(1)}%`
);
console.log('（旧的每帧增量实现在此应接近 300%，即 1.0 → 4.0 °/s）');

await browser.close();
process.exit(failed.length ? 1 : 0);
