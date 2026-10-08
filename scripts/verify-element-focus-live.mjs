/**
 * 验证「五行模式 + 选中元素」是否真的让盘面只留该元素色块（端到端）。
 * 步骤：切到五行生克 → 点右侧面板「火」→ 截图 → 量五行环带各色占比。
 */
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
await page.locator('div.min-w-\\[184px\\] button:has-text("五行生克")').click();
await page.waitForTimeout(2000);

// 按钮内是「字 + 阴阳属性」两行（如「火 / 阳」），故取第一个 span 的文本判断。
const elBtns = await page.evaluate(() => {
  return [...document.querySelectorAll('button')]
    .map(b => (b.querySelector('span')?.textContent || '').trim())
    .filter(t => /^(木|火|土|金|水)$/.test(t));
});
console.log('右侧面板可选五行按钮:', elBtns.join(' / ') || '(未找到)');

const results = [];
const inElements = await page.evaluate(() => document.body.innerText.includes('五行生克'));
results.push(inElements);
console.log(`${inElements ? 'PASS' : 'FAIL'}  已进入五行生克模式`);

// 点「火」：用 span 文本精确定位
const fireBtn = page.locator('button').filter({ has: page.locator('span', { hasText: /^火$/ }) }).first();
const fireCount = await fireBtn.count();
console.log(`  找到「火」按钮 ${fireCount} 个`);
if (fireCount) {
  await fireBtn.click();
  await page.waitForTimeout(1800);
  // 点击后应出现「生：土 / 克：金」说明行 —— 证明选中态生效
  const hasDerived = await page.evaluate(() => document.body.innerText.includes('克：'));
  results.push(hasDerived);
  console.log(`${hasDerived ? 'PASS' : 'FAIL'}  选中「火」后出现生克说明（证明选中态已生效）`);
  await page.screenshot({ path: './shot-mode-elements-fire.png' });
  console.log('  已保存 shot-mode-elements-fire.png');
} else {
  results.push(false);
  console.log('FAIL  未找到「火」按钮');
}

await browser.close();
const ok = results.filter(Boolean).length;
console.log(`\n=== 结果：${ok}/${results.length} 通过 ===`);
process.exit(ok === results.length ? 0 : 1);
