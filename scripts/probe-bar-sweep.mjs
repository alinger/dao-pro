import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1500);
const widths = [2560, 1920, 1600, 1536, 1440, 1280, 1100, 1024, 900, 820, 768];
console.log('width | 顶栏高 | 溢出控件 | 最右元素');
for (const w of widths) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const h = document.querySelector('header');
    const hb = h.getBoundingClientRect();
    const btns = [...h.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0);
    const over = btns.filter(b => b.getBoundingClientRect().right > window.innerWidth + 1).map(b => (b.textContent||'').trim().slice(0,10));
    const maxRight = Math.max(...btns.map(b => Math.round(b.getBoundingClientRect().right)));
    return { h: Math.round(hb.height), over, maxRight };
  });
  console.log(`${String(w).padStart(5)} | ${String(r.h).padStart(5)}px | ${(r.over.join(',')||'无').padEnd(24)} | ${r.maxRight}`);
}
await browser.close();
