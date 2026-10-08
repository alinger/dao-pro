/**
 * 把 createCompassDialTexture() 生成的 2048 贴图直接落盘，
 * 用于「二维层面」逐环核验（不必进 3D、不受相机/遮挡干扰）。
 *
 * 用法：node scripts/dump-dial-texture.mjs
 * 输出：out-tex-dial-raw.png（贴图原样） + out-tex-dial-annot.png（叠加半径标尺）
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 2200, height: 2200 } });

page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// 在页面上下文里重建同一张贴图：直接调用 vite 已加载模块
const dataUrl = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const tex = mod.createCompassDialTexture();
  return tex.image.toDataURL('image/png');
});

const raw = path.join(ROOT, 'out-tex-dial-raw.png');
fs.writeFileSync(raw, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', raw);

// 叠加半径标尺（标出 r0..r6 的像素位置）
const size = 2048;
const maxR = size * 0.485;
const coef = [0.25, 0.355, 0.515, 0.63, 0.79, 0.91, 1.0];
const labels = ['r0 天池', 'r1 八卦', 'r2 五行', 'r3 节气', 'r4 廿四山', 'r5 廿八宿', 'r6 周天'];

const annot = await page.evaluate(
  async ({ dataUrl, size, maxR, coef, labels }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const c = cv.getContext('2d');
    c.drawImage(img, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    c.lineWidth = 3;
    c.font = 'bold 30px monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';

    coef.forEach((k, i) => {
      const r = maxR * k;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.strokeStyle = i % 2 === 0 ? 'rgba(0,255,255,0.95)' : 'rgba(255,0,255,0.95)';
      c.stroke();
      // 右侧水平引线 + 标签
      c.beginPath();
      c.moveTo(cx + r, cy);
      c.lineTo(cx + r + 60, cy - 40 - i * 44);
      c.stroke();
      const tx = cx + r + 64;
      const ty = cy - 40 - i * 44;
      c.fillStyle = 'rgba(0,0,0,0.8)';
      c.fillRect(tx - 4, ty - 20, 320, 40);
      c.fillStyle = i % 2 === 0 ? '#00ffff' : '#ff00ff';
      c.fillText(`${labels[i]} = ${r.toFixed(1)}px`, tx, ty);
    });

    return cv.toDataURL('image/png');
  },
  { dataUrl, size, maxR, coef, labels }
);

const annotPath = path.join(ROOT, 'out-tex-dial-annot.png');
fs.writeFileSync(annotPath, Buffer.from(annot.split(',')[1], 'base64'));
console.log('wrote', annotPath);

await browser.close();
