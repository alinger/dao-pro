/**
 * 组合验证脚本（一次浏览器启动，跑完全部核对）：
 *  1) 落盘修复后的贴图（原图 + 半径标尺标注图）
 *  2) 贴图极坐标径向亮字率剖面（判断每环是否单峰）
 *  3) 3D 纯净盘面截图（隐藏 HUD，供目视）
 *
 * 用法：node scripts/verify-round4.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const VW = Number(process.env.SHOT_W || 1000);
const VH = Number(process.env.SHOT_H || 1000);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
page.setDefaultTimeout(60000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(2500);

// ---------- 1) 贴图落盘 ----------
const size = 2048;
const maxR = size * 0.485;
const coef = [0.25, 0.355, 0.515, 0.63, 0.79, 0.91, 1.0];
const labels = ['r0 天池', 'r1 八卦', 'r2 五行', 'r3 节气', 'r4 廿四山', 'r5 廿八宿', 'r6 周天'];

const tex = await page.evaluate(
  async ({ size, maxR, coef, labels }) => {
    const mod = await import('/src/utils/textureGenerator.ts');
    const t = mod.createCompassDialTexture();
    const raw = t.image.toDataURL('image/png');

    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    c.drawImage(t.image, 0, 0);
    const cx = size / 2, cy = size / 2;
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
      c.beginPath();
      c.moveTo(cx + r, cy);
      c.lineTo(cx + r + 60, cy - 40 - i * 44);
      c.stroke();
      const tx = cx + r + 64, ty = cy - 40 - i * 44;
      c.fillStyle = 'rgba(0,0,0,0.85)';
      c.fillRect(tx - 4, ty - 20, 330, 40);
      c.fillStyle = i % 2 === 0 ? '#00ffff' : '#ff00ff';
      c.fillText(`${labels[i]} = ${r.toFixed(1)}px`, tx, ty);
    });
    return { raw, annot: cv.toDataURL('image/png') };
  },
  { size, maxR, coef, labels }
);

fs.writeFileSync(path.join(ROOT, 'out-tex-dial-raw.png'), Buffer.from(tex.raw.split(',')[1], 'base64'));
fs.writeFileSync(path.join(ROOT, 'out-tex-dial-annot.png'), Buffer.from(tex.annot.split(',')[1], 'base64'));
console.log('① 贴图已落盘: out-tex-dial-raw.png / out-tex-dial-annot.png');

// ---------- 2) 贴图径向剖面 ----------
const prof = await page.evaluate(
  async ({ size, maxR, coef }) => {
    const mod = await import('/src/utils/textureGenerator.ts');
    const t = mod.createCompassDialTexture();
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    c.drawImage(t.image, 0, 0);
    const d = c.getImageData(0, 0, size, size).data;
    const lum = (x, y) => {
      const i = (y * size + x) * 4;
      return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    };
    const cx = size / 2, cy = size / 2;
    const NB = 400;
    const hit = new Float64Array(NB), tot = new Float64Array(NB);
    for (let a = 0; a < 1440; a++) {
      const th = (a / 1440) * Math.PI * 2;
      const dx = Math.cos(th), dy = Math.sin(th);
      for (let r = 1; r < maxR; r++) {
        const x = Math.round(cx + dx * r), y = Math.round(cy + dy * r);
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const bi = Math.min(NB - 1, Math.floor((r / maxR) * NB));
        tot[bi]++;
        if (lum(x, y) > 150) hit[bi]++;
      }
    }
    const out = [];
    for (let i = 0; i < NB; i++) out.push(tot[i] ? (hit[i] / tot[i]) * 100 : 0);
    return out;
  },
  { size, maxR, coef }
);

const names = ['天池边', '八卦环', '五行环', '节气环', '廿四山', '廿八宿', '周天环'];
console.log('\n② 贴图径向亮字率（每带切 8 子段；★ = 显著高于带内均值 → 一个文字层）');
for (let i = 0; i < coef.length - 1; i++) {
  const a = Math.floor(coef[i] * 400), b = Math.floor(coef[i + 1] * 400);
  let sum = 0, n = 0;
  for (let k = a; k < b; k++) { sum += prof[k]; n++; }
  const avg = n ? sum / n : 0;
  const seg = [];
  for (let s = 0; s < 8; s++) {
    const s0 = a + Math.floor(((b - a) * s) / 8), s1 = a + Math.floor(((b - a) * (s + 1)) / 8);
    let ss = 0, nn = 0;
    for (let k = s0; k < s1; k++) { ss += prof[k]; nn++; }
    const v = nn ? ss / nn : 0;
    seg.push(`${v.toFixed(1).padStart(5)}${v > avg * 1.5 && v > 2 ? '★' : ' '}`);
  }
  console.log(`  ${names[i + 1].padEnd(6)} ${String(a).padStart(3)}~${String(b).padStart(3)}  均${avg.toFixed(1).padStart(5)}%  [${seg.join('|')}]`);
}

// ---------- 3) 3D 纯净截图 ----------
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(500);
await page.evaluate(() => {
  document.querySelectorAll('body *').forEach((el) => {
    if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if (el.querySelector && el.querySelector('canvas')) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') el.style.visibility = 'hidden';
  });
});
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(ROOT, 'out-clean.png') });
console.log('\n③ 3D 纯净盘面: out-clean.png', `${VW}x${VH}`);

await browser.close();
