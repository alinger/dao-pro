/**
 * 量用户截图里罗盘的实际像素范围，并导出红框区域的放大裁剪。
 * 用浏览器 canvas 解码（--dump-dom 不等 img.onload，Playwright 才可靠）。
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const SRC = process.argv[2];
const OUT = process.argv[3] || './out-user-measure.png';

const b64 = readFileSync(SRC).toString('base64');
const mime = SRC.endsWith('.png') ? 'image/png' : 'image/jpeg';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });

const result = await page.evaluate(async ({ b64, mime }) => {
  const img = new Image();
  img.src = `data:${mime};base64,${b64}`;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;

  // 金色描边/环线判据：r,g 高，b 明显低
  const isGold = (i) => d[i] > 150 && d[i + 1] > 120 && d[i + 2] < d[i] - 45 && d[i] - d[i + 2] > 45;

  // 1) 全图金色包围盒
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (isGold(i)) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }

  // 2) 逐行/逐列的金色像素数，找盘的上下左右极值（盘沿是长弧，计数会突然抬升）
  const colCount = new Int32Array(W), rowCount = new Int32Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (isGold(i)) { colCount[x]++; rowCount[y]++; }
  }
  const TH = Math.max(8, Math.floor(H * 0.05));
  let dialL = -1, dialR = -1, dialT = -1, dialB = -1;
  for (let x = 0; x < W; x++) if (colCount[x] >= TH) { dialL = x; break; }
  for (let x = W - 1; x >= 0; x--) if (colCount[x] >= TH) { dialR = x; break; }
  for (let y = 0; y < H; y++) if (rowCount[y] >= TH) { dialT = y; break; }
  for (let y = H - 1; y >= 0; y--) if (rowCount[y] >= TH) { dialB = y; break; }

  return {
    W, H,
    goldBox: { minX, maxX, minY, maxY },
    dial: { l: dialL, r: dialR, t: dialT, b: dialB, w: dialR - dialL, h: dialB - dialT },
    rowTop: Array.from(rowCount.slice(0, 12)),
    rowBot: Array.from(rowCount.slice(H - 12)),
  };
}, { b64, mime });

console.log('截图尺寸      :', result.W, 'x', result.H, ' aspect=', (result.W / result.H).toFixed(3));
console.log('金色包围盒    :', JSON.stringify(result.goldBox));
console.log('盘沿(密度法)  :', JSON.stringify(result.dial));
const d = result.dial;
console.log('盘沿直径      : 宽', d.w, '高', d.h);
console.log('距上边留白    :', d.t, '  距下边留白:', result.H - 1 - d.b);
console.log('垂直占比      :', (d.h / result.H * 100).toFixed(1) + '%');
console.log('水平占比      :', (d.w / result.W * 100).toFixed(1) + '%');
console.log('顶部行计数    :', result.rowTop.join(','));
console.log('底部行计数    :', result.rowBot.join(','));

// 3) 导出上下缘各 90px 的放大裁剪（看是否被切）
const strips = await page.evaluate(async ({ b64, mime, dial }) => {
  const img = new Image();
  img.src = `data:${mime};base64,${b64}`;
  await img.decode();
  const mk = (sy, sh, label) => {
    const c = document.createElement('canvas');
    c.width = 900; c.height = Math.round((sh / img.naturalWidth) * 900 * (img.naturalHeight / img.naturalHeight) * (900 / 900));
    const s = 900 / img.naturalWidth;
    c.height = Math.round(sh * s);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, c.width, c.height);
    return { label, data: c.toDataURL('image/png'), w: c.width, h: c.height };
  };
  return [
    mk(Math.max(0, dial.t - 30), 110, 'top'),
    mk(Math.max(0, dial.b - 80), 110, 'bottom'),
  ];
}, { b64, mime, dial: result.dial });

console.log('\n--- 上下缘裁剪 ---');
for (const s of strips) {
  const buf = Buffer.from(s.data.split(',')[1], 'base64');
  const { writeFileSync } = await import('node:fs');
  const fn = `${OUT.replace(/\.png$/, '')}-${s.label}.png`;
  writeFileSync(fn, buf);
  console.log(s.label, '->', fn, s.w + 'x' + s.h);
}

await browser.close();
