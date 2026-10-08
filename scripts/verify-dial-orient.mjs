/**
 * 验证盘面朝向与 HUD 读数是否一致。
 *
 * 原理：盘面贴图上「子」在 0°（贴图正上方），顺时针排列。
 * 读取 HUD 的读数角度，然后采样「该角度应对应的盘面位置」的颜色，
 * 与「反向位置」作对比 —— 若字确实在正确一侧，说明盘面方向对。
 *
 * 更稳的判据：把盘面 0°（子）位置与 180°（午）位置的像素与已知色做比对。
 * 这里改用「找亮度最高的金色文字块质心方位」来反推盘面实际朝向。
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(500);

// 隐藏 HUD，露出完整盘面
await page.evaluate(() => {
  document.querySelectorAll('body *').forEach((el) => {
    if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if (el.querySelector('canvas')) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') el.style.visibility = 'hidden';
  });
});
await page.waitForTimeout(500);

const res = await page.evaluate(async () => {
  const cv = document.querySelector('canvas');
  const w = cv.width, h = cv.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  const d = x.getImageData(0, 0, w, h).data;

  // 盘心：图中心
  const cx = w / 2, cy = h / 2;
  // 盘面半径：沿 4 方向找最后一个非黑像素
  const isOn = (px, py) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return false;
    const i = (py * w + px) * 4;
    return d[i] + d[i + 1] + d[i + 2] > 90;
  };
  let R = 0;
  for (let r = 1; r < Math.min(w, h) / 2; r++) {
    if (isOn(cx + r, cy) || isOn(cx - r, cy) || isOn(cx, cy + r) || isOn(cx, cy - r)) R = r;
  }

  // 在「五行环」半径带内，按方位角统计金色文字像素密度
  // 五行环 r1..r2 = 0.355..0.515 of maxR，maxR 对应盘面半径
  const rIn = R * 0.355, rOut = R * 0.515;
  const bins = new Array(360).fill(0);
  for (let deg = 0; deg < 360; deg++) {
    const a = (deg - 90) * Math.PI / 180; // 0° 在正上
    let cnt = 0;
    for (let rr = rIn; rr < rOut; rr += 1) {
      for (let t = -3; t <= 3; t += 1) {
        const px = Math.round(cx + Math.cos(a) * rr + Math.cos(a + Math.PI / 2) * t);
        const py = Math.round(cy + Math.sin(a) * rr + Math.sin(a + Math.PI / 2) * t);
        if (px < 0 || px >= w || py < 0 || py >= h) continue;
        const i = (py * w + px) * 4;
        const r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];
        const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0);
        // 金色/亮色文字：亮度高且饱和度不低
        if (mx > 170 && mx - mn > 40) cnt++;
      }
    }
    bins[deg] = cnt;
  }
  // 找密度最高的 5 个方位（应落在「子」「午」等主段字心）
  const top = bins.map((v, i) => ({ deg: i, v })).sort((a, b) => b.v - a.v).slice(0, 8);
  return { w, h, R, top, bins };
});

console.log(`canvas ${res.w}x${res.h}  盘面半径≈${res.R} px`);
console.log('\n五行环金色文字密度最高的方位（贴图坐标，0°=子/正上）:');
for (const t of res.top) {
  console.log(`  ${String(t.deg).padStart(3)}°  密度 ${t.v}`);
}
console.log('\n预期：主段字心应落在 五行主段中点');
console.log('  水 330~30 → 0°    土 30~60 → 45°');
console.log('  木 60~120 → 90°   火150~210 → 180°   金240~300 → 270°');

await browser.close().catch(() => {});
