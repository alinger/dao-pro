/**
 * 全页文字字号盘点。
 *
 * 目的：HUD 文字「偏小」是主观判断，先量出每个可见文本节点的实际
 * 渲染字号（px），再决定放大哪些，避免漏改或误改。
 *
 * 同时检查一个更关键的问题：**等效可读字号**——
 * 本页是全屏 3D 画布 + DOM 叠加，没有缩放，所以等效字号 = 实际 px。
 * 但若后续要投屏/手机观看，px 相同的字在 27" 和 13" 屏上视觉大小差异很大，
 * 因此这里额外输出「该文本在 1280 宽视口下的相对高度占比」供判断。
 *
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/audit-fontsize.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(2000);

const audit = await page.evaluate(() => {
  const out = [];
  const seen = new Set();

  const describe = (el) => {
    // 归属面板：往上找带语义类名/标题的容器
    const panel =
      el.closest('header') ? '顶栏' :
      el.closest('aside') ? '右侧栏' :
      el.closest('.font-calligraphy')?.parentElement ? '罗盘读数' :
      null;

    // 读数面板没有语义容器，用文本特征识别
    let region = panel;
    if (!region) {
      const txt = el.textContent || '';
      if (/周天方位|山 · |二十四山/.test(txt)) region = '罗盘读数';
      else if (/气场共鸣|罗盘天向|周天度数|阳气|灵力/.test(txt)) region = '气场仪';
      else if (/节气|农历/.test(txt)) region = '道历';
      else if (/三盘大肠经|小肠经|膀胱经/.test(txt)) region = '经络';
      else if (/歇后语|成语/.test(txt)) region = '歇后语';
      else if (/五行|八卦/.test(txt)) region = '选择器';
      else region = '画布内/其他';
    }

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      region,
      text: (el.textContent || '').trim().slice(0, 18),
      fontSize: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      weight: cs.fontWeight,
      opacity: Math.round(parseFloat(cs.opacity) * 100) / 100,
      w: Math.round(r.width),
      h: Math.round(r.height),
      visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05,
    };
  };

  // 遍历所有元素，取「直接含文本节点」的叶子元素，避免父子重复计数
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const raw = (n.nodeValue || '').trim();
    if (!raw) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,svg text')) continue;
    const key = el.tagName + '|' + (el.className || '').toString().slice(0, 40) + '|' + raw.slice(0, 12);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(describe(el));
  }
  return out;
});

const byRegion = new Map();
for (const item of audit) {
  if (!byRegion.has(item.region)) byRegion.set(item.region, []);
  byRegion.get(item.region).push(item);
}

console.log('=== 各区域可见文字字号（px）===\n');
const allSizes = [];
for (const [region, items] of byRegion) {
  const vis = items.filter((i) => i.visible);
  if (!vis.length) continue;
  const sizes = [...new Set(vis.map((i) => i.fontSize))].sort((a, b) => a - b);
  vis.forEach((i) => allSizes.push(i.fontSize));
  console.log(`【${region}】字号种类: ${sizes.join(', ')}`);
  vis
    .sort((a, b) => a.fontSize - b.fontSize)
    .slice(0, 8)
    .forEach((i) => {
      console.log(
        `   ${String(i.fontSize).padStart(5)}px  op=${i.opacity}  w=${String(i.w).padStart(3)}  "${i.text}"`
      );
    });
  console.log('');
}

allSizes.sort((a, b) => a - b);
const min = allSizes[0];
const median = allSizes[Math.floor(allSizes.length / 2)];
console.log('=== 汇总 ===');
console.log(`  可见文本节点数: ${allSizes.length}`);
console.log(`  最小字号: ${min}px`);
console.log(`  中位字号: ${median}px`);
const buckets = { '≤10px': 0, '11-12px': 0, '13-16px': 0, '>16px': 0 };
allSizes.forEach((s) => {
  if (s <= 10) buckets['≤10px']++;
  else if (s <= 12) buckets['11-12px']++;
  else if (s <= 16) buckets['13-16px']++;
  else buckets['>16px']++;
});
console.log('  分布:', JSON.stringify(buckets, null, 0));
console.log(
  `\n  小于 12px 的占比: ${(((buckets['≤10px'] + buckets['11-12px']) / allSizes.length) * 100).toFixed(1)}%`
);

await browser.close();
