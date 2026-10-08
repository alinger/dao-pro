import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1000);
const info = await page.evaluate(() => {
  const out = [];
  const header = document.querySelector('header');
  out.push({ tag: 'HEADER', x: 0, w: Math.round(header.getBoundingClientRect().width), right: Math.round(header.getBoundingClientRect().right), text: '' });
  header.querySelectorAll(':scope > div').forEach((d) => {
    const r = d.getBoundingClientRect();
    out.push({ tag: 'ZONE', x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), text: (d.textContent||'').trim().slice(0,26) });
  });
  header.querySelectorAll('button').forEach((b) => {
    const r = b.getBoundingClientRect();
    out.push({ tag: 'BTN', x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), text: (b.textContent||'').trim().slice(0,20) });
  });
  return out;
});
console.log('viewport=1024');
info.forEach(i => console.log(`${i.tag.padEnd(7)} x=${String(i.x).padStart(5)} w=${String(i.w).padStart(4)} r=${String(i.right).padStart(5)}  ${i.text}`));
await browser.close();
