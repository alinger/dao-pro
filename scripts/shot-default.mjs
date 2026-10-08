/**
 * 默认第一视角快速截图，用于视觉迭代。
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/shot-default.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const OUT = process.env.SHOT_OUT || '../out-default-facing.png';
// 载入后可选先点暂停，这样盘面角度固定在接近 0°，截图可比
const FREEZE = process.env.SHOT_FREEZE !== '0';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1500);

if (FREEZE) {
  const pause = page.locator('button[title*="暂停天行自转"]');
  if (await pause.count()) await pause.click();
  await page.waitForTimeout(700);
}

const readDeg = () =>
  page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find(
      (d) => d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
    );
    if (!panel) return null;
    return {
      deg: parseFloat(panel.querySelector('span.font-mono span')?.textContent || 'NaN'),
      char: (panel.querySelector('span.font-calligraphy')?.textContent || '').trim(),
    };
  });

console.log('读数:', await readDeg());
await page.screenshot({ path: OUT });
console.log('已保存', OUT);
await browser.close();
