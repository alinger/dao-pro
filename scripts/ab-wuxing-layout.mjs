/**
 * 五行环径向排版 A/B 对比。
 *
 * 目的：用实拍图回答「元素名该在外还是在内、季字该在哪」，
 *       而不是靠推导（历史上我在这个正负号上翻过车）。
 *
 * 做法：把每个方案「直接画在 2048 贴图上、然后绕盘心极坐标重采样成直角图」，
 *       完全绕开 3D 与 HUD，纯二维对账。
 *
 * 用法：node scripts/ab-wuxing-layout.mjs
 * 输出：out-ab-wuxing.png（四宫格：A 现状 / B 交换 / C 收拢居中 / D 只名不留季）
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const png = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const size = 2048;
  const maxR = size * 0.485;
  const r1 = maxR * 0.355;
  const r2 = maxR * 0.515;

  // 用真实贴图作为底（含色块与边框线）
  const baseTex = mod.createCompassDialTexture();
  const baseCv = document.createElement('canvas');
  baseCv.width = size; baseCv.height = size;
  baseCv.getContext('2d').drawImage(baseTex.image, 0, 0);

  // 角度 → canvas 弧度（贴图约定：0° 在正上方 = -90° 起始）
  const A = (deg) => (deg * Math.PI) / 180 - Math.PI / 2;

  // 在贴图上以「径向下标」重画五行环文字。
  // 传入 dict: { nameY, nameFS, seasonY, seasonFS }
  function paintLayout(cv, layout, showName = true, showSeason = true) {
    const c = cv.getContext('2d');
    const midR = (r1 + r2) / 2;
    const arcs = [
      { el: 'wood', s: 60, e: 120, main: true },
      { el: 'wood', s: 135, e: 150, main: false },
      { el: 'fire', s: 150, e: 210, main: true },
      { el: 'earth', s: 30, e: 60, main: true },
      { el: 'earth', s: 120, e: 135, main: false },
      { el: 'earth', s: 210, e: 240, main: false },
      { el: 'earth', s: 300, e: 315, main: false },
      { el: 'metal', s: 240, e: 300, main: true },
      { el: 'metal', s: 315, e: 330, main: false },
      { el: 'water', s: 330, e: 390, main: true },
    ];
    const NAME = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    const SEASON = { wood: '立春', fire: '立夏', earth: '立秋', metal: '立冬', water: '冬藏' };

    for (const a of arcs) {
      const midDeg = (a.s + a.e) / 2;
      const rad = A(midDeg);
      const px = size / 2 + Math.cos(rad) * midR;
      const py = size / 2 + Math.sin(rad) * midR;
      c.save();
      c.translate(px, py);
      c.rotate(rad + Math.PI / 2);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';

      const draw = (txt, y, font, fill, ow) => {
        c.font = font;
        c.strokeStyle = '#000';
        c.lineWidth = ow;
        c.strokeText(txt, 0, y);
        c.fillStyle = fill;
        c.fillText(txt, 0, y);
      };

      if (showName) draw(NAME[a.el], layout.nameY, `bold ${layout.nameFS}px "Ma Shan Zheng","Noto Serif SC",serif`, '#ffd54f', 5);
      if (showSeason) draw(SEASON[a.el], layout.seasonY, `bold ${layout.seasonFS}px "Noto Serif SC",serif`, '#fffbe6', 3.5);
      c.restore();
    }
  }

  // 极坐标展开：取一条 30° 的楔形（water 水·冬藏 附近，-15°~+15°），
  // 沿径向 r=r1-40 .. r2+40 重采样成「径向 × 切向」直角图，便于看清分层。
  function unwrap(cv) {
    const OUT_W = 560, OUT_H = 260;            // 宽=切向, 高=径向
    const out = document.createElement('canvas');
    out.width = OUT_W; out.height = OUT_H;
    const oc = out.getContext('2d');
    const src = cv.getContext('2d').getImageData(0, 0, size, size).data;
    const cxs = size / 2, cys = size / 2;
    const rA = r1 - 30, rB = r2 + 30;          // 覆盖整条环带 + 少量邻带
    const spanDeg = 30;
    const cA = 0 - spanDeg / 2;                // 以 0°（水·正北）为中心
    for (let oy = 0; oy < OUT_H; oy++) {
      const r = rA + ((rB - rA) * oy) / (OUT_H - 1);
      for (let ox = 0; ox < OUT_W; ox++) {
        const deg = cA + (spanDeg * ox) / (OUT_W - 1);
        const rad = (deg * Math.PI) / 180 - Math.PI / 2;
        const sx = Math.round(cxs + Math.cos(rad) * r);
        const sy = Math.round(cys + Math.sin(rad) * r);
        const si = (sy * size + sx) * 4;
        const di = (oy * OUT_W + ox) * 4;
        const od = oc.createImageData(1, 1).data;
        od[0] = src[si]; od[1] = src[si + 1]; od[2] = src[si + 2]; od[3] = 255;
        oc.putImageData(new ImageData(new Uint8ClampedArray([od[0], od[1], od[2], 255]), 1, 1), ox, oy);
      }
    }
    return out;
  }

  const variants = [
    { title: 'A 现状(名外21/季内38)', nameY: -21, nameFS: 66, seasonY: 38, seasonFS: 30 },
    { title: 'B 交换(名内/季外)', nameY: 21, nameFS: 66, seasonY: -38, seasonFS: 30 },
    { title: 'C 收拢居中', nameY: -18, nameFS: 66, seasonY: 35, seasonFS: 30 },
    { title: 'D 名居中/季内侧紧贴', nameY: -6, nameFS: 66, seasonY: 30, seasonFS: 30 },
  ];

  // 组装四宫格
  const COLS = 2, ROWS = 2;
  const CW = 560, CHH = 260, PAD = 34, LABEL = 40;
  const grid = document.createElement('canvas');
  grid.width = COLS * CW + (COLS + 1) * PAD;
  grid.height = ROWS * (CHH + LABEL) + (ROWS + 1) * PAD;
  const gc = grid.getContext('2d');
  gc.fillStyle = '#0b0d10';
  gc.fillRect(0, 0, grid.width, grid.height);

  variants.forEach((v, i) => {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    cv.getContext('2d').drawImage(baseCv, 0, 0);
    paintLayout(cv, v);
    const uw = unwrap(cv);
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = PAD + col * (CW + PAD);
    const y = PAD + row * (CHH + LABEL + PAD);

    // 标出 r1 / r2 在展开图中的横向位置
    const rA = r1 - 30, rB = r2 + 30;
    const yFor = (r) => ((r - rA) / (rB - rA)) * (CHH - 1);
    gc.drawImage(uw, 0, 0, CW, CHH, x, y, CW, CHH);
    gc.strokeStyle = '#00e5ff'; gc.lineWidth = 1.5;
    gc.beginPath(); gc.moveTo(x, y + yFor(r1)); gc.lineTo(x + CW, y + yFor(r1)); gc.stroke();
    gc.strokeStyle = '#ff00e5';
    gc.beginPath(); gc.moveTo(x, y + yFor(r2)); gc.lineTo(x + CW, y + yFor(r2)); gc.stroke();
    gc.fillStyle = '#00e5ff'; gc.font = 'bold 15px monospace';
    gc.fillText('r1 (内界)', x + 6, y + yFor(r1) - 5);
    gc.fillStyle = '#ff00e5';
    gc.fillText('r2 (外界)', x + 6, y + yFor(r2) - 5);
    gc.fillStyle = '#e8dcb8'; gc.font = 'bold 19px monospace';
    gc.fillText(v.title, x + 6, y + CHH + 26);
  });

  return grid.toDataURL('image/png');
});

const out = path.join(ROOT, 'out-ab-wuxing.png');
fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
console.log('wrote', out);
await browser.close();
