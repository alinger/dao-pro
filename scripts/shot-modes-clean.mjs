/**
 * 三个视角模式的纯净截图（真正隐藏 HUD），用于人工比对画面差异。
 * 用法：node scripts/shot-modes-clean.mjs
 */
import { chromium } from 'playwright';
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(2000);

// 只保留 canvas：把 main 下除 canvas 容器外的一切隐藏
const hideHUD = () => page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return;
  [...main.children].forEach((el) => {
    if (!el.querySelector('canvas')) el.style.visibility = 'hidden';
  });
});
const showHUD = () => page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return;
  [...main.children].forEach((el) => { el.style.visibility = 'visible'; });
});

await hideHUD();
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) { await showHUD(); await pause.click(); await page.waitForTimeout(500); await hideHUD(); }
await page.waitForTimeout(1200);

for (const label of ['天元总览', '五行生克', '八卦推演', '分层透视']) {
  await showHUD();
  await page.locator('button[title="切换视角模式"]').click();
  await page.waitForTimeout(400);
  await page.locator(`div.min-w-\\[184px\\] button:has-text("${label}")`).click();
  await page.waitForTimeout(1800);
  await hideHUD();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `./shot-mode-${label}.png` });
  console.log(`已保存 shot-mode-${label}.png`);
}
await browser.close();
