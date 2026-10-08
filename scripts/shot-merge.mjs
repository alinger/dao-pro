/**
 * 融合后 UI 状态截图（逐态成图，确保动画完成后再截）。
 * 用法：node scripts/shot-merge.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(2000);

const closeOverlays = async () => {
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0').forEach((el) => {
      if (el.getAttribute('aria-hidden') === 'true') el.click();
    });
  });
  await page.waitForTimeout(400);
};

// 1) 顶栏特写
await page.locator('header').screenshot({ path: './shot-bar.png' });
console.log('已保存 shot-bar.png');

// 2) 视角菜单展开（截顶栏 + 菜单区域）
await page.locator('button[title="切换视角模式"]').click();
await page.waitForTimeout(700);
await page.screenshot({ path: './shot-viewmenu.png', clip: { x: 0, y: 0, width: 760, height: 300 } });
console.log('已保存 shot-viewmenu.png');
await closeOverlays();

// 3) 操盘抽屉展开（截顶栏右侧 + 抽屉区域）
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(700);
const drawerBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) =>
    d.className.includes('w-[276px]')
  );
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
await page.screenshot({
  path: './shot-drawer.png',
  clip: {
    x: Math.max(0, (drawerBox?.x ?? 1100) - 40),
    y: 0,
    width: 480,
    height: Math.min(900, (drawerBox?.y ?? 60) + (drawerBox?.height ?? 220) + 24),
  },
});
console.log('已保存 shot-drawer.png  drawerBox=', drawerBox);
await closeOverlays();

// 4) 1024 窄视口顶栏
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(1200);
await page.locator('header').screenshot({ path: './shot-bar-1024.png' });
console.log('已保存 shot-bar-1024.png');

// 5) 1440 顶栏（1290~1535 区间，验证「操盘」仅图标态）
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(1200);
await page.locator('header').screenshot({ path: './shot-bar-1440.png' });
console.log('已保存 shot-bar-1440.png');

await browser.close();
