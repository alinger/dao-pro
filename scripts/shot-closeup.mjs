/**
 * 盘面特写截图：隐藏两侧 HUD 面板、让罗盘充满画面。
 * 用于检查盘面细节（铜环缝隙是否漏色、五行字是否被切）。
 * 用法: SHOT_W=1600 SHOT_H=900 node scripts/shot-closeup.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const VW = Number(process.env.SHOT_W || 1600);
const VH = Number(process.env.SHOT_H || 900);
const OUT = process.env.SHOT_OUT || './out-closeup.png';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

// 暂停自转，取稳定帧
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(400);

// 隐藏所有覆盖在 canvas 上的 HUD 面板，露出完整盘面
await page.evaluate(() => {
  const keep = new Set(['CANVAS']);
  document.querySelectorAll('body *').forEach((el) => {
    if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    // 根容器（挂 canvas 的）保留
    if (el.querySelector('canvas')) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') {
      el.style.visibility = 'hidden';
    }
  });
});
await page.waitForTimeout(600);

await page.screenshot({ path: OUT });
console.log('特写已保存:', OUT, `${VW}x${VH}`);

await browser.close().catch(() => {});
