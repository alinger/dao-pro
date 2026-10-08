/**
 * 纯净盘面截图：隐藏所有 HUD 覆盖层，只留 3D canvas。
 * 弥补 profile-dial-radial 沿 360° 均摊时被 HUD 遮住的角度的统计失真。
 * 用法: SHOT_W=1000 SHOT_H=1000 node scripts/shot-clean.mjs
 */
import { chromium } from 'playwright';
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const VW = Number(process.env.SHOT_W || 1000);
const VH = Number(process.env.SHOT_H || 1000);
const OUT = process.env.SHOT_OUT || './out-clean.png';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(2500);
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(400);
await page.evaluate(() => {
  document.querySelectorAll('body *').forEach((el) => {
    if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if (el.querySelector && el.querySelector('canvas')) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') el.style.visibility = 'hidden';
  });
});
await page.waitForTimeout(500);
await page.screenshot({ path: OUT });
console.log('纯净盘面:', OUT, `${VW}x${VH}`);
await browser.close().catch(() => {});
