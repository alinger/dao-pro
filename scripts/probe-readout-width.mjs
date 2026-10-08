/**
 * 实测读数面板各子块的自然宽度，为窄视口压缩方案提供依据
 * 用法：MEAS_VP=1024x768 node scripts/probe-readout-width.mjs
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
await page.waitForTimeout(2200);
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(300);

const r = await page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find(
    (d) => d.textContent?.includes('周天方位') && d.className.includes('backdrop-blur')
  );
  const cs = getComputedStyle(panel);
  const dial = panel.querySelector('div[style*="width"]');
  const textCol = [...panel.children].find((c) => c.className.includes('min-w'));

  // 逐行文字的自然宽度（去掉 min-w 约束后的真实所需宽度）
  const lineNatural = [...textCol.children].map((s) => {
    const range = document.createRange();
    range.selectNodeContents(s);
    const rects = Array.from(range.getClientRects());
    return {
      text: s.textContent.trim().slice(0, 16),
      fs: getComputedStyle(s).fontSize,
      natural: Math.ceil(Math.max(...rects.map((x) => x.width))),
      box: Math.round(s.getBoundingClientRect().width),
      lines: rects.filter((x) => x.height > 1).length,
    };
  });

  return {
    panelW: Math.round(panel.getBoundingClientRect().width),
    padding: `${cs.paddingLeft}/${cs.paddingRight}`,
    gap: cs.gap,
    border: `${cs.borderLeftWidth}/${cs.borderRightWidth}`,
    dialW: dial ? Math.round(dial.getBoundingClientRect().width) : null,
    textColMinW: getComputedStyle(textCol).minWidth,
    textColBox: Math.round(textCol.getBoundingClientRect().width),
    lineNatural,
  };
});

console.log(JSON.stringify(r, null, 2));
await browser.close();