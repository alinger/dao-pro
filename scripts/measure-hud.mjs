/**
 * 单视口 HUD 盒模型测量（排查用）
 * 用法：MEAS_VP=1024x768 node scripts/measure-hud.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const [w, h] = (process.env.MEAS_VP || '1024x768').split('x').map(Number);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2500);
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(400);

const data = await page.evaluate(() => {
  const pick = (find) =>
    [...document.querySelectorAll('div')].find(
      (d) => d.textContent?.includes(find) && d.className.includes('rounded')
    );
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      l: Math.round(r.left), t: Math.round(r.top),
      r: Math.round(r.right), b: Math.round(r.bottom),
      w: Math.round(r.width), h: Math.round(r.height),
    };
  };
  const readoutInner = document.evaluate(
    "//div[contains(@class,'backdrop-blur')][contains(.,'周天方位')]",
    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
  ).singleNodeValue;

  const aside = document.querySelector('aside');
  const main = document.querySelector('main');

  return {
    readout: box(pick('周天方位')),
    readoutPanel: box(readoutInner),
    gauge: box(pick('气场共鸣仪')),
    calendar: box(pick('道历天象玄历')),
    selector: box(pick('五行生克')),
    aside: box(aside),
    asideMaxW: aside ? getComputedStyle(aside).maxWidth : null,
    readoutWrap: (() => {
      const el = pick('周天方位');
      const p = el?.parentElement?.parentElement;
      return p ? { cls: p.className, ...box(p) } : null;
    })(),
    main: box(main),
    vw: window.innerWidth, vh: window.innerHeight,
  };
});

console.log(JSON.stringify(data, null, 2));

await page.screenshot({ path: process.env.MEAS_OUT || './out-measure.png' });
await browser.close();