/**
 * 按用户截图上的红框坐标裁剪放大，输出 PNG。
 * 用法: node scripts/crop-regions.mjs <srcImg> <outPrefix> <x,y,w,h> [<x,y,w,h> ...]
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const [src, prefix, ...rects] = process.argv.slice(2);
const b64 = readFileSync(src).toString('base64');
const mime = src.endsWith('.png') ? 'image/png' : 'image/jpeg';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 300, height: 200 } });

const outs = await page.evaluate(async ({ b64, mime, rects, targetW }) => {
  const img = new Image();
  img.src = `data:${mime};base64,${b64}`;
  await img.decode();
  return rects.map((r, i) => {
    const [x, y, w, h] = r.split(',').map(Number);
    const s = targetW / w;
    const c = document.createElement('canvas');
    c.width = targetW; c.height = Math.round(h * s);
    const x2 = c.getContext('2d');
    x2.imageSmoothingEnabled = false;
    x2.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return { i, data: c.toDataURL('image/png'), w: c.width, h: c.height, rect: r };
  });
}, { b64, mime, rects, targetW: 820 });

for (const o of outs) {
  const fn = `${prefix}-${o.i + 1}.png`;
  writeFileSync(fn, Buffer.from(o.data.split(',')[1], 'base64'));
  console.log(`区域${o.i + 1} (${o.rect}) -> ${fn}  ${o.w}x${o.h}  放大${(820 / Number(o.rect.split(',')[2])).toFixed(1)}x`);
}
await browser.close();
