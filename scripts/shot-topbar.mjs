/**
 * 顶栏 Zone 3 特写截图，用于检查按钮是否被挤压/溢出。
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/shot-topbar.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const OUT = process.env.SHOT_OUT || './out-topbar.png';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1200);

// 报告 Zone 3 内每个按钮的实际盒模型，检查是否溢出视口
const boxes = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('header button')];
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    return {
      text: (b.textContent || '').trim().slice(0, 20),
      title: b.getAttribute('title')?.slice(0, 24) || '',
      x: Math.round(r.x),
      w: Math.round(r.width),
      right: Math.round(r.right),
      overflow: r.right > window.innerWidth,
    };
  });
});
console.log('视口宽 1440，按钮盒模型：');
boxes.forEach((b) =>
  console.log(
    `  x=${String(b.x).padStart(4)} w=${String(b.w).padStart(4)} right=${String(b.right).padStart(4)}` +
      ` overflow=${b.overflow ? 'YES <<<' : 'no '}  "${b.text}"  [${b.title}]`
  )
);
const nav = await page.evaluate(() => {
  const n = document.querySelector('header nav');
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width) };
});
console.log('  导航栏:', nav);

await page.locator('header').screenshot({ path: OUT });
console.log('已保存', OUT);
await browser.close();
