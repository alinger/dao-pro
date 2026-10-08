/**
 * 八卦环落位实测（定点取样版）
 * =============================
 *
 * 第一版用「峰值聚类」找卦名位置，扩展循环的条件写错，
 * 8 个簇被合并成 1 个 → 假 FAIL。教训：聚类算法的边界条件很难一次写对。
 *
 * 改用更稳的方案：**已知期望角度，直接在各期望角度附近统计暖白像素**。
 * 若某卦确实落在该角度，附近必然有像素；没有则说明未对齐。
 * 这样不依赖任何聚类假设。
 *
 * 用法：node scripts/measure-bagua-angles.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';

// 后天（文王）八卦：0=子/正北，顺时针
const EXPECT = [
  { name: '坎', deg: 0 }, { name: '艮', deg: 45 }, { name: '震', deg: 90 }, { name: '巽', deg: 135 },
  { name: '离', deg: 180 }, { name: '坤', deg: 225 }, { name: '兑', deg: 270 }, { name: '乾', deg: 315 },
];
const WINDOW = 12; // ±12° 窗口

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

const res = await page.evaluate(async (cfg) => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const tex = mod.createCompassDialTexture();
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(tex.image, 0, 0, S, S);
  const cx = S / 2, cy = S / 2, maxR = S * 0.485;
  const r0 = maxR * 0.25, r1 = maxR * 0.38;
  const data = ctx.getImageData(0, 0, S, S).data;

  const isWarmWhite = (i) => {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    return R > 235 && G > 228 && B > 190 && B < 248 && Math.abs(R - G) < 25;
  };

  const out = [];
  for (const want of cfg.expect) {
    // 在期望角度 ±WINDOW 内，统计暖白像素的角度加权中心
    let wsum = 0, asum = 0;
    const buckets = new Array(24).fill(0); // 1° 桶，覆盖 ±12°
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy;
        const rr = Math.hypot(dx, dy);
        if (rr < r0 - 2 || rr > r1 + 2) continue;
        const i = (y * S + x) * 4;
        if (!isWarmWhite(i)) continue;
        const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
        let rel = ((deg - want.deg + 540) % 360) - 180;
        if (Math.abs(rel) > cfg.window) continue;
        const b = Math.floor((rel + cfg.window) * (24 / (cfg.window * 2)));
        if (b >= 0 && b < 24) buckets[b]++;
        wsum++; asum += deg;
      }
    }
    if (wsum === 0) { out.push({ name: want.name, want: want.deg, hits: 0 }); continue; }
    // 取像素最多的 1° 桶中心（字最密处），避免扇区内其他亮元素拉偏
    let peak = 0;
    for (let i = 1; i < 24; i++) if (buckets[i] > buckets[peak]) peak = i;
    const deg = want.deg - cfg.window + (peak + 0.5) * (cfg.window * 2 / 24);
    out.push({ name: want.name, want: want.deg, hits: wsum, deg: Math.round(deg * 10) / 10 });
  }
  return out;
}, { expect: EXPECT, window: WINDOW });

console.log(`八卦环落位实测（±${WINDOW}° 窗口内暖白像素峰值）\n`);
console.log('卦  期望角度   实测角度    偏差      像素   判定');
let allPass = true;
for (const r of res) {
  if (!r.hits) {
    console.log(`${r.name}  ${String(r.want).padStart(5)}°   （窗口内无像素）  —— 未对齐`);
    allPass = false;
    continue;
  }
  let diff = Math.abs(((r.deg - r.want + 540) % 360) - 180);
  const ok = diff <= 5;
  if (!ok) allPass = false;
  console.log(
    `${r.name}  ${String(r.want).padStart(5)}°   ${String(r.deg).padStart(6)}°   ${String(diff.toFixed(1)).padStart(6)}°   ${String(r.hits).padStart(6)}   ${ok ? '[PASS]' : '[FAIL]'}`
  );
}
console.log(allPass ? '\n总判定：八卦八卦全部对齐后天方位' : '\n总判定：八卦存在错位');

try {
  await Promise.race([browser.close(), new Promise((_, r) => setTimeout(() => r(new Error('t')), 8000))]);
} catch { console.log('browser.close() 超时，已强杀'); }
process.exit(allPass ? 0 : 1);