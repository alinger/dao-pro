/**
 * 多视角截图回归：确认调整默认相机参数后，其余 viewMode 未被破坏。
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/shot-modes.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const PREFIX = process.env.SHOT_PREFIX || './out-mode';

const MODES = [
  { label: '天元总览', name: 'compass' },
  { label: '浑天演象', name: 'armillary' },
  { label: '五行生克', name: 'elements' },
  { label: '八卦推演', name: 'bagua' },
  { label: '分层透视', name: 'exploded' },
  { label: '阴阳吐纳', name: 'meditation' },
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

const nav = page.locator('header nav button');

for (let i = 0; i < MODES.length; i++) {
  const m = MODES[i];
  await nav.nth(i).click();
  // 相机是指数插值，给足时间收敛（lerp 0.05/帧 @60fps → 约 1.5s 到 99%）
  await page.waitForTimeout(3000);

  const reading = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find(
      (d) => d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
    );
    if (!panel) return null;
    return {
      deg: panel.querySelector('span.font-mono span')?.textContent,
      char: panel.querySelector('span.font-calligraphy')?.textContent,
    };
  });

  // 页面错误累积检查
  await page.screenshot({ path: `${PREFIX}-${m.name}.png` });
  console.log(`  ${m.name.padEnd(10)} 读数 ${reading?.char} ${reading?.deg}  → ${PREFIX}-${m.name}.png`);
}

await browser.close();
