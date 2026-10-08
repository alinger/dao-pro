/**
 * 精确量：圆盘本体直径（排除四角天门方块）+ 上下 HUD 面板的遮挡带。
 * 思路：圆盘是正圆，取「中心 70% 区域」内的金色密度，并用 4 条中轴线扫描定极值。
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const SRC = process.argv[2];
const b64 = readFileSync(SRC).toString('base64');
const mime = SRC.endsWith('.png') ? 'image/png' : 'image/jpeg';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 300, height: 200 } });

const r = await page.evaluate(async ({ b64, mime }) => {
  const img = new Image();
  img.src = `data:${mime};base64,${b64}`;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const isGold = (i) => d[i] > 150 && d[i + 1] > 120 && d[i + 2] < d[i] - 45 && d[i] - d[i + 2] > 45;

  // 1) 粗定位：金色整体包围盒 -> 估圆心（四角方块会让盒子略大，但中心仍准）
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = (y * W + xx) * 4;
    if (isGold(i)) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  // 2) 沿 4 条中轴（水平±、垂直±）从圆心向外扫，找盘沿最后一个金色像素
  //    探测半径要够大（0.75 倍），否则量到的只是"金框盒"而不是真实盘沿
  const R = 0.75 * Math.min(maxX - minX, maxY - minY);
  const scan = (dx, dy) => {
    let last = 0;
    for (let r = R; r > 0; r -= 0.5) {
      const px = Math.round(cx + dx * r), py = Math.round(cy + dy * r);
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      if (isGold((py * W + px) * 4)) { last = r; break; }
    }
    return last;
  };
  const radL = scan(-1, 0), radR = scan(1, 0), radT = scan(0, -1), radB = scan(0, 1);

  // 3) HUD 遮挡带：找出顶部与底部连续「非盘面暗棕」的彩色/深色面板行
  //    简化：统计每行在中心 50% 宽度内的亮像素（面板底是 #1a1a1a 附近，亮度低）
  const rowBright = [];
  for (let y = 0; y < H; y++) {
    let s = 0, n = 0;
    for (let xx = Math.floor(W * 0.25); xx < W * 0.75; xx++) {
      const i = (y * W + xx) * 4;
      s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++;
    }
    rowBright.push(Math.round(s / n));
  }
  // 面板 = 明显暗于盘面主体（盘面棕底亮度约 60~90）
  const topBarEnd = rowBright.findIndex((v, i) => i > 6 && v > 20);
  let botBarStart = rowBright.length - 1;
  for (let y = rowBright.length - 1; y > 6; y--) { if (rowBright[y] > 20) { botBarStart = y; break; } }

  return {
    W, H, cx, cy, box: { minX, maxX, minY, maxY },
    radL, radR, radT, radB,
    diaH: radL + radR, diaV: radT + radB,
    topPanel: { endY: topBarEnd, h: topBarEnd },
    botPanel: { startY: botBarStart, h: H - botBarStart },
  };
}, { b64, mime });

console.log('窗口          :', r.W, 'x', r.H, ' aspect=', (r.W / r.H).toFixed(3));
console.log('金框包围盒    :', JSON.stringify(r.box));
console.log('估圆心        : (%.1f, %.1f)', r.cx, r.cy);
console.log('四向半径      : 左%.0f 右%.0f 上%.0f 下%.0f  (px)', r.radL, r.radR, r.radT, r.radB);
console.log('圆盘直径      : 水平 %.0f  垂直 %.0f', r.diaH, r.diaV);
console.log('圆盘上缘 y    : %.0f  下缘 y: %.0f', r.cy - r.radT, r.cy + r.radB);
console.log('上缘距窗口顶  : %.0f px', r.cy - r.radT);
console.log('下缘距窗口底  : %.0f px', r.H - (r.cy + r.radB));
console.log('垂直占比      : %.1f%%', (r.diaV / r.H * 100).toFixed(1));
console.log('水平占比      : %.1f%%', (r.diaH / r.W * 100).toFixed(1));
console.log('顶部暗面板带  : 0 ~', r.topPanel.endY, `(高 ${r.topPanel.h}px)`);
console.log('底部暗面板带  :', r.botPanel.startY, '~', r.H, `(高 ${r.botPanel.h}px)`);
console.log('盘面在两面板之间的净空高 :', r.botPanel.startY - r.topPanel.endY);
console.log('若要盘面不压面板，需直径 <=', r.botPanel.startY - r.topPanel.endY);

await browser.close();
