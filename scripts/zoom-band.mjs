/**
 * 高倍放大指定角度区间的五行环，输出到 PNG
 * 直接调 createCompassDialTexture 拿 2048 原始贴图，按几何精确裁剪
 */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = process.env.OUT || './out-band-zoom.png';
// 角度列表
const ANGLES = (process.env.ANGLES || '135,120,90,270').split(',').map(Number);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

const png = await page.evaluate(async (angles) => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const tex = mod.createCompassDialTexture();
  const S = tex.image.width;              // 2048
  const src = tex.image;

  const MAXR = S * 0.485;
  const r0 = MAXR * 0.25, r1 = MAXR * 0.38, r2 = MAXR * 0.49, r3 = MAXR * 0.63;
  const cx = S / 2, cy = S / 2;

  // 每格：宽 520，高 420，放大 3.4x
  const CW = 520, CH = 420, K = 3.4;
  const cv = document.createElement('canvas');
  cv.width = CW * angles.length;
  cv.height = CH;
  const x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#000';
  x.fillRect(0, 0, cv.width, cv.height);

  angles.forEach((deg, i) => {
    // 取该角度的扇区中心（稍偏向内半径）
    const rMid = (r1 + r2) / 2;
    const a = (deg * Math.PI) / 180 - Math.PI / 2;
    const px = cx + Math.cos(a) * rMid;
    const py = cy + Math.sin(a) * rMid;

    // 取一块方形区域：宽 = 弧长(±25°)，高 = 整个环带 + 一点余量
    const halfW = Math.max(60, (28 * Math.PI / 180) * rMid);
    const halfH = (r3 - r0) * 0.32;

    const sx = px - halfW, sy = py - halfH, sw = halfW * 2, sh = halfH * 2;
    const ox = i * CW, oy = 0;
    x.drawImage(src, sx, sy, sw, sh, ox, oy, CW, CH);

    // 标出 r1 / r2 边界（金线），红=五行内边界，绿=五行外边界
    const toY = (r) => oy + (r - (py - halfH)) / sh * CH;
    const y1 = toY(r1), y2 = toY(r2), y3 = toY(r3);
    x.strokeStyle = 'rgba(255,0,0,0.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(ox, y1); x.lineTo(ox + CW, y1); x.stroke();
    x.strokeStyle = 'rgba(0,255,0,0.9)';
    x.beginPath(); x.moveTo(ox, y2); x.lineTo(ox + CW, y2); x.stroke();
    x.strokeStyle = 'rgba(0,180,255,0.7)';
    x.beginPath(); x.moveTo(ox, y3); x.lineTo(ox + CW, y3); x.stroke();
    // 中径
    x.strokeStyle = 'rgba(255,255,0,0.5)'; x.setLineDash([6, 6]);
    const ym = toY(rMid);
    x.beginPath(); x.moveTo(ox, ym); x.lineTo(ox + CW, ym); x.stroke();
    x.setLineDash([]);

    x.fillStyle = '#0f0'; x.font = 'bold 20px monospace';
    x.fillText(deg + 'deg  r1(red)/r2(green)/r3(cyan)  rmid(yellow-dash)', ox + 8, 26);
  });

  return cv.toDataURL('image/png');
}, ANGLES);

fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
console.log('saved', OUT);

try {
  await Promise.race([browser.close(), new Promise((_, r) => setTimeout(() => r(new Error('t')), 8000))]);
} catch { console.log('close timeout'); }
