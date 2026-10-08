/**
 * 实测节气环 24 个字的「径向落点」。
 * 若各字落点差异大，说明排版有 bug；若一致，说明"看起来错位"来自
 * 「字随格旋转」在密格环里产生的锯齿观感（视觉问题，非布局问题）。
 *
 * 做法：逐个节气，在其中心角方向上扫描亮度，找峰值半径。
 */
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const res = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const calMod = await import('/src/data/taoCalendar.ts');
  const t = mod.createCompassDialTexture();
  const size = t.image.width;
  const maxR = size * 0.485;
  const r2 = maxR * 0.515, r3 = maxR * 0.63;
  const midR = (r2 + r3) / 2;

  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const c = cv.getContext('2d');
  c.drawImage(t.image, 0, 0);
  const d = c.getImageData(0, 0, size, size).data;
  const lum = (x, y) => {
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  };

  const terms = calMod.SOLAR_TERMS_24;
  const out = [];
  for (const it of terms) {
    const cand = [];
    // 沿 ±3° 内的 7 条线，各自找亮度峰半径
    for (let k = -3; k <= 3; k++) {
      const deg = it.angle + k;
      const rad = (deg * Math.PI) / 180 - Math.PI / 2;
      let best = { r: 0, v: -1 };
      for (let r = r2 + 2; r <= r3 - 2; r += 0.5) {
        const x = size / 2 + Math.cos(rad) * r;
        const y = size / 2 + Math.sin(rad) * r;
        const v = lum(x, y);
        if (v > best.v) best = { r, v };
      }
      cand.push(best.r);
    }
    const avg = cand.reduce((s, v) => s + v, 0) / cand.length;
    const spread = Math.max(...cand) - Math.min(...cand);
    out.push({ name: it.name, angle: it.angle, r: avg, spread });
  }
  return { out, r2, r3, midR };
});

console.log(`节气环 r2=${res.r2.toFixed(1)}  r3=${res.r3.toFixed(1)}  midR=${res.midR.toFixed(1)}  带宽=${(res.r3 - res.r2).toFixed(1)}\n`);
console.log('节气   角度   字心半径   偏差(vs midR)   内部离散');
let minR = 1e9, maxR = -1e9;
for (const t of res.out) {
  minR = Math.min(minR, t.r); maxR = Math.max(maxR, t.r);
  const dev = t.r - res.midR;
  console.log(
    `${t.name.padEnd(4)} ${String(t.angle).padStart(4)}°  ${t.r.toFixed(1).padStart(7)}   ${(dev >= 0 ? '+' : '') + dev.toFixed(1)}`.padEnd(44) +
    `${t.spread.toFixed(1).padStart(6)}`
  );
}
console.log(`\n全部 24 字的字心半径范围: ${minR.toFixed(1)} ~ ${maxR.toFixed(1)}  (跨度 ${(maxR - minR).toFixed(1)}px，环带宽 ${(res.r3 - res.r2).toFixed(1)}px)`);
console.log(maxR - minR > 25 ? '★ 跨度偏大 → 存在真正的径向错位' : '≈ 跨度很小 → 字心在同一半径上，"错位"来自旋转锯齿观感');
await browser.close();
