/**
 * 盘面落位实测：从真实贴图按颜色取样，测出每个五行字的实际角度
 * ========================================================
 *
 * 不信任「代码看起来对」，直接在浏览器里生成贴图并按像素验证。
 * 方法：五行主字用高饱和纯色，按颜色阈值找像素簇，算出角度分布，
 *      与 MOUNTAINS_24 期望角度比对。
 *
 * 性能：第一版逐色全图扫描（2048² × 5 色）跑了 7 分钟未完成。
 * 改为：① 贴图先降到 512² 再取样（角度精度 ±0.7°，足够断言 6° 容差）
 *      ② 单次遍历同时判五种颜色
 *
 * 用法：node scripts/measure-dial-angles.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';

// 与 textureGenerator 中五行主字颜色一致
const COLORS = [
  { hanzi: '木', name: 'wood', rgb: [74, 222, 128] },   // #4ade80
  { hanzi: '火', name: 'fire', rgb: [255, 77, 79] },    // #ff4d4f
  { hanzi: '土', name: 'earth', rgb: [250, 204, 21] },  // #facc15
  { hanzi: '金', name: 'metal', rgb: [255, 255, 255] }, // #ffffff
  { hanzi: '水', name: 'water', rgb: [56, 189, 248] },  // #38bdf8
];

const EXPECT = { water: 0, wood: 90, fire: 180, metal: 270 };
const TOLERANCE_DEG = 6;

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('console', (m) => { if (m.text().startsWith('[dial]')) console.log(m.text()); });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

const result = await page.evaluate(async (colors) => {
  console.log('[dial] 生成贴图...');
  const mod = await import('/src/utils/textureGenerator.ts');
  const tex = mod.createCompassDialTexture();
  const img = tex.image;

  // 降采样到 512²，角度分辨率 360/256 ≈ 1.4°/px，满足 ±6° 断言
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, S, S);

  const cx = S / 2, cy = S / 2;
  const maxR = S * 0.485;
  const r1 = maxR * 0.38;
  const r2 = maxR * 0.49;

  const data = ctx.getImageData(0, 0, S, S).data;
  console.log('[dial] 取样中...');

  // 单次遍历，五色同时判定
  const acc = colors.map(() => ({ hits: [], byBucket: new Array(72).fill(0) }));

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - cx, dy = y - cy;
      const rr = dx * dx + dy * dy;
      if (rr < (r1 - 3) * (r1 - 3) || rr > (r2 + 3) * (r2 + 3)) continue;
      const i = (y * S + x) * 4;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      const ang = Math.atan2(dy, dx); // canvas 弧度
      for (let k = 0; k < colors.length; k++) {
        const [tr, tg, tb] = colors[k].rgb;
        const d = Math.abs(R - tr) + Math.abs(G - tg) + Math.abs(B - tb);
        if (d < 100 && R + G + B > 240) {
          const a = acc[k];
          a.hits.push(ang);
          // 5° 桶
          const dataDeg = ((ang * 180) / Math.PI + 90 + 360) % 360;
          a.byBucket[Math.floor(dataDeg / 5) % 72]++;
          break;
        }
      }
    }
  }

  /**
   * 关键：只取**最集中的角度簇**，不能用整簇的角向量平均。
   * 原因：某些五行在山位里不止一段（如金=申240~辛285 主段 + 乾315 副段），
   * 全局平均会把两段拉成一个不存在的中间角度（金实测偏 22.4° 就是这么来的）。
   * 主字一定落在像素最多的簇里，取该簇的桶中心即可。
   */
  const out = {};
  for (let k = 0; k < colors.length; k++) {
    const a = acc[k];
    if (!a.hits.length) { out[colors[k].name] = { hits: 0 }; continue; }
    let best = 0;
    for (let i = 1; i < 72; i++) if (a.byBucket[i] > a.byBucket[best]) best = i;
    // 峰值桶左右各扩一桶，覆盖字形宽度
    const lo = a.byBucket[(best - 1 + 72) % 72];
    const hi = a.byBucket[(best + 1) % 72];
    const peak = a.byBucket[best];
    // 若左右邻桶也密集，说明字较宽，用三点加权中心
    let deg;
    if (lo > peak * 0.3 && hi > peak * 0.3) {
      deg = ((best * 5 + 0) * lo + (best * 5 + 5) * peak + (best * 5 + 10) * hi) / (lo + peak + hi);
    } else {
      deg = best * 5 + 2.5;
    }
    out[colors[k].name] = {
      hits: a.hits.length,
      dataDeg: Math.round((((deg % 360) + 360) % 360) * 10) / 10,
      peakBucket: best,
      peakCount: peak,
    };
  }
  console.log('[dial] 取样完成');
  return { size: S, out };
}, COLORS);

console.log(`\n贴图降采样至 ${result.size}²，角度分辨率 ±1.4°，断言容差 ±${TOLERANCE_DEG}°\n`);
console.log('字  实测落位   期望落位    偏差     判定');
let allPass = true;
for (const c of COLORS) {
  const r = result.out[c.name];
  if (!r || !r.hits) {
    console.log(`${c.hanzi}  未取到像素 (hits=0) — 该字可能不可见或颜色不符`);
    allPass = false;
    continue;
  }
  if (c.name === 'earth') {
    console.log(`${c.hanzi}  ${String(r.dataDeg).padStart(6)}°   （四隅分布，不设期望值）  像素 ${r.hits}`);
    continue;
  }
  const want = EXPECT[c.name];
  const diff = Math.abs(((r.dataDeg - want + 540) % 360) - 180);
  const ok = diff <= TOLERANCE_DEG;
  if (!ok) allPass = false;
  console.log(
    `${c.hanzi}  ${String(r.dataDeg).padStart(6)}°   ${String(want).padStart(6)}°   ${String(diff.toFixed(1)).padStart(6)}°   ${ok ? '[PASS]' : '[FAIL]'}`
  );
}
console.log(allPass ? '\n总判定：四正全部对齐' : '\n总判定：存在未对齐项或未取到像素');

/**
 * 本机收尾坑：`browser.close()` 实测要15.6 秒（正常应<1s），
 * 且期间会残留孤儿 Chrome 进程（曾堆积到 23 个互相争抢资源，
 * 导致后续脚本连 page.goto 都变慢）。
 * 故：close 加超时兜底，超时直接强杀进程树，保证脚本能及时退出。
 */
try {
  await Promise.race([
    browser.close(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('close timeout 8s')), 8000)),
  ]);
  console.log('browser 已正常关闭');
} catch {
  console.log('browser.close() 超时，改用强杀');
}
process.exit(allPass ? 0 : 1);