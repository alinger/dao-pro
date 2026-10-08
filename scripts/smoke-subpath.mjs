/** 子路径部署冒烟：加载 /dao-pro/ 下构建产物，检查无 JS 错误、canvas 已渲染。 */
import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://[::1]:4173/dao-pro/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);

const canvasBox = await page.locator('canvas').first().boundingBox();
const title = await page.title();
const headerText = await page.evaluate(() => document.querySelector('header')?.innerText?.replace(/\s+/g,' ').trim() || '');

console.log('页面标题:', title);
console.log('顶栏文本:', headerText.slice(0, 60));
console.log('canvas 尺寸:', canvasBox ? `${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)}` : '未找到');

const results = [];
results.push(['canvas 已挂载且可见', !!canvasBox && canvasBox.width > 100]);
results.push(['顶栏品牌字已渲染', headerText.includes('道韵乾坤')]);
results.push(['无 JS 运行时错误', errors.length === 0]);
results.push(['无 4xx/5xx 资源请求', failed.length === 0]);

for (const [n, ok] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}`);
if (errors.length) console.log('  错误:', errors.slice(0, 5).join(' | '));
if (failed.length) console.log('  失败请求:', failed.slice(0, 5).join(' | '));

await page.screenshot({ path: './out-subpath-smoke.png' });
await browser.close();
const ok = results.filter(([, v]) => v).length;
console.log(`\n=== ${ok}/${results.length} 通过 ===`);
process.exit(ok === results.length ? 0 : 1);
