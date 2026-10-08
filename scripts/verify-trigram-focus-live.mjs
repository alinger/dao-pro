/** 验证八卦模式的卦聚焦：切到八卦推演 → 点某个卦 → 盘面只留该卦。 */
import { chromium } from 'playwright';
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(2200);
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) { await pause.click(); await page.waitForTimeout(500); }

await page.locator('button[title="切换视角模式"]').click();
await page.waitForTimeout(400);
await page.locator('div.min-w-\\[184px\\] button:has-text("八卦推演")').click();
await page.waitForTimeout(2200);

const results = [];
const inBagua = await page.evaluate(() => document.body.innerText.includes('八卦象数'));
results.push(inBagua);
console.log(`${inBagua ? 'PASS' : 'FAIL'}  已进入八卦推演模式（面板切到八卦象数 tab）`);

const tri = await page.evaluate(() => {
  const set = '乾坤震巽坎离艮兑';
  return [...document.querySelectorAll('button')]
    .map(b => (b.querySelector('span')?.textContent || '').trim())
    .filter(t => t.length === 1 && set.includes(t));
});
console.log('  可选卦:', tri.join(' / ') || '(未找到)');

// 点「离」卦
const liBtn = page.locator('button').filter({ has: page.locator('span', { hasText: /^离$/ }) }).first();
if (await liBtn.count()) {
  await liBtn.click();
  await page.waitForTimeout(2000);
  const hasDetail = await page.evaluate(() => document.body.innerText.includes('先天气数'));
  results.push(hasDetail);
  console.log(`${hasDetail ? 'PASS' : 'FAIL'}  选中「离」后详情卡出现（选中态生效）`);
  await page.screenshot({ path: './shot-mode-bagua-li.png' });
  console.log('  已保存 shot-mode-bagua-li.png');
} else {
  results.push(false);
  console.log('FAIL  未找到「离」卦按钮');
}
await browser.close();
const ok = results.filter(Boolean).length;
console.log(`\n=== 结果：${ok}/${results.length} 通过 ===`);
process.exit(ok === results.length ? 0 : 1);
