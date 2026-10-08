/**
 * 实验：窄视口下右侧栏 max-w 收窄的可行区间
 * 运行时覆盖 aside.style.maxWidth，测各档宽度下的
 *   - 道历/五行八卦面板高度（折行会显著变高）
 *   - 是否溢出视口
 *   - 读数面板右缘是否仍与右栏重叠
 *
 * 用法：MEAS_VP=1024x768 node scripts/probe-aside-width.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const [w, h] = (process.env.MEAS_VP || '1024x768').split('x').map(Number);
const WIDTHS = (process.env.PROBE_W || '360,340,320,300,280,260').split(',').map(Number);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

for (const vw of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: 1024, height: h } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(2200);
  const pause = page.locator('button[title*="暂停天行自转"]');
  if (await pause.count()) await pause.click();
  await page.waitForTimeout(300);

  const r = await page.evaluate((mw) => {
    const aside = document.querySelector('aside');
    aside.style.maxWidth = mw + 'px';
    // 强制回流
    void aside.offsetHeight;
    const pick = (find) =>
      [...document.querySelectorAll('div')].find(
        (d) => d.textContent?.includes(find) && d.className.includes('rounded')
      );
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const cal = pick('道历天象玄历');
    const sel = pick('五行生克');
    const ro = pick('周天方位');

    // 统计长文案是否折行
    const folds = [];
    const walker = document.createTreeWalker(aside, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const raw = (n.nodeValue || '').trim();
      if (!raw) continue;
      const el = n.parentElement;
      if (el.childElementCount > 0) continue;
      const rge = document.createRange();
      rge.selectNodeContents(el);
      const lines = Array.from(rge.getClientRects()).filter((x) => x.height > 1).length;
      if (lines > 1) folds.push(`${raw.slice(0, 12)}(${lines}行)`);
    }

    const roR = ro.getBoundingClientRect().right;
    const asideL = aside.getBoundingClientRect().left;
    return {
      cal: box(cal), sel: box(sel), readoutR: Math.round(roR),
      asideL: Math.round(asideL), gap: Math.round(asideL - roR),
      asideB: Math.round(aside.getBoundingClientRect().bottom),
      folds,
    };
  }, vw);

  console.log(`max-w=${String(vw).padStart(3)}px | 道历 h=${String(r.cal?.h).padStart(3)} 选器 h=${String(r.sel?.h).padStart(3)} 栏底=${r.asideB}(vh=${h}) | 读数右缘=${r.readoutR} 栏左缘=${r.asideL} 间隙=${r.gap > 0 ? '+' + r.gap : r.gap} | 折行 ${r.folds.length} 处 ${r.folds.slice(0, 3).join(', ')}`);
  await page.close();
}

await browser.close();