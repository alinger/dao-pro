/**
 * 罗盘盘面俯视截图：用于目视确认五行环与八卦环落位
 * 用法：node scripts/shot-dial.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
// 视口可用 SHOT_W / SHOT_H 覆盖：复现用户的窄窗口（891×776，aspect 1.148）时必须一致，
// 否则固定 1600×1000（aspect 1.6）会掩盖「窄视口下铜环压字 / 外框被裁」的问题。
const VW = Number(process.env.SHOT_W || 1600);
const VH = Number(process.env.SHOT_H || 1000);
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(500);

// 直接把生成的贴图画到一个独立 canvas 并截它 —— 得到无透视变形的正俯视图
const dataUrl = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const tex = mod.createCompassDialTexture();
  const cv = document.createElement('canvas');
  cv.width = 1000; cv.height = 1000;
  cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000';
  const ctx = cv.getContext('2d');
  ctx.drawImage(tex.image, 0, 0, 1000, 1000);
  document.body.appendChild(cv);
  return cv.toDataURL('image/png');
});

const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
const fs = await import('fs');
fs.writeFileSync(process.env.SHOT_OUT || './out-dial-flat.png', buf);
console.log('俯视图已保存:', process.env.SHOT_OUT || './out-dial-flat.png');

// 同时截一张实际 3D 场景
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3000);
const p2 = page.locator('button[title*="暂停天行自转"]');
if (await p2.count()) await p2.click();
await page.waitForTimeout(600);
await page.screenshot({ path: process.env.SHOT_OUT_3D || './out-dial-3d.png' });
console.log('3D 场景图已保存:', process.env.SHOT_OUT_3D || './out-dial-3d.png');

try {
  await Promise.race([browser.close(), new Promise((_, r) => setTimeout(() => r(new Error('t')), 8000))]);
} catch { console.log('browser.close() 超时，已强杀'); }