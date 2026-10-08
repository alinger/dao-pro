/**
 * 读数面板排版检查：字号、换行、溢出、重叠。
 *
 * 放大字号最容易引入的三类问题，逐项量化而不是靠看截图猜：
 * 1. 文本折行（行数 > 1）—— 单行文案折行会撑高面板、破坏节奏
 * 2. 元素超出视口 / 超出其定位容器
 * 3. 面板与罗盘盘心、左侧气场仪、右侧栏发生重叠
 *
 * 同时输出实际渲染字号，用于确认「×1.5」真的落到 CSS 上。
 *
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/audit-readout-layout.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const OUT = process.env.SHOT_OUT || './out-readout-layout.png';
const VIEWPORTS = [
  { w: 1920, h: 1080, name: '1920x1080' },
  { w: 1440, h: 900, name: '1440x900' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 1024, h: 768, name: '1024x768' },
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

const results = [];
const check = (vp, name, pass, detail) => {
  results.push({ vp, name, pass, detail });
  console.log(`    [${pass ? 'PASS' : 'FAIL'}] ${name} — ${detail}`);
};

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(2200);
  // 暂停自转，让截图与量测稳定
  const pause = page.locator('button[title*="暂停天行自转"]');
  if (await pause.count()) await pause.click();
  await page.waitForTimeout(600);

  console.log(`\n=== ${vp.name} ===`);

  const m = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find(
      (d) => d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
    );
    if (!panel) return null;
    const pr = panel.getBoundingClientRect();

    // 面板内所有文本叶子节点
    const texts = [];
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const raw = (n.nodeValue || '').trim();
      if (!raw) continue;
      const el = n.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();

      // 用 Range 拿实际行数：文本被折成几行。
      // 注意：range.selectNodeContents(el) 会把 el 内部所有子元素一起算进去，
      // 所以像「002.4°」这种由 <span>数字</span> + 文本「°」组成的结构，
      // 父 span 会得到 3 个 rect（数字 1 行 + ° 的 2 个碎片），
      // 属于假阳性折行。因此只有当 el 不含子元素时才判定行数。
      const hasElementChild = el.childElementCount > 0;
      let lineCount = 1;
      if (!hasElementChild) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter((x) => x.height > 1);
        lineCount = Math.max(1, rects.length);
      }
      texts.push({
        text: raw.slice(0, 20),
        fontSize: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        lineHeight: Math.round(r.height),
        lineCount,
        nested: hasElementChild,
        width: Math.round(r.width),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      });
    }

    // 刻度盘尺寸
    const dialBox = panel.querySelector('svg')?.parentElement?.getBoundingClientRect();

    // 其它 HUD 区域
    const gauge = document.querySelector('aside, .absolute.top-4.left-6');
    const right = document.querySelector('aside');
    const box = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
    };

    return {
      panel: { l: Math.round(pr.left), t: Math.round(pr.top), r: Math.round(pr.right), b: Math.round(pr.bottom), w: Math.round(pr.width), h: Math.round(pr.height) },
      dial: dialBox ? { w: Math.round(dialBox.width), h: Math.round(dialBox.height) } : null,
      texts,
      gauge: box(gauge),
      right: box(right),
      vw: window.innerWidth,
      vh: window.innerHeight,
      // 页面是否被内容撑高：最外层容器声明 h-screen，但若实际高度 > innerHeight
      // 说明子元素溢出了，此时百分比定位会参照一个比视口更高的盒子，
      // 导致「bottom:6%」算出的位置仍在视口之外。
      docOverflow: {
        innerHeight: window.innerHeight,
        rootH: Math.round(document.querySelector('div.relative.w-screen')?.getBoundingClientRect().height || 0),
        mainTop: Math.round(document.querySelector('main')?.getBoundingClientRect().top || 0),
        mainH: Math.round(document.querySelector('main')?.getBoundingClientRect().height || 0),
        bodyScrollH: document.body.scrollHeight,
      },
      // 关键：App.tsx 里 main 写的是 h-[calc(100vh-65px)]，硬编码假设顶栏 65px。
      // 若顶栏实际更高（窄屏 flex 换行），main 会被下推，
      // 所有以 main 为定位基准的 HUD 全部错位/越界。这是最常见的隐性故障源。
      headerH: Math.round(document.querySelector('header')?.getBoundingClientRect().height || 0),
    };
  });

  if (!m) {
    console.log('  未找到读数面板');
    await page.close();
    continue;
  }

  console.log(`  面板: ${m.panel.w}x${m.panel.h}  位置 top=${m.panel.t} bottom=${m.panel.b}  刻度盘 ${m.dial?.w}px`);
  const o = m.docOverflow;
  const overflowed = o.rootH > o.innerHeight + 1;
  console.log(
    `  视口高 ${o.innerHeight} | 根容器 ${o.rootH} | main top=${o.mainTop} h=${o.mainH} | bodyScrollH=${o.bodyScrollH}` +
      (overflowed ? '   ← 页面被撑高！' : '')
  );
  check(vp.name, '页面未被内容撑高', !overflowed, overflowed ? `根容器 ${o.rootH}px > 视口 ${o.innerHeight}px` : `${o.rootH}px = 视口 ${o.innerHeight}px`);
  // 顶栏高度必须等于 App.tsx 中 main 硬编码假设的 65px，否则所有 HUD 定位基准错位
  check(
    vp.name,
    '顶栏高度 = 65px（与 main 的 calc 一致）',
    m.headerH === 65,
    m.headerH === 65 ? '65px' : `实测 ${m.headerH}px，main 假设 65px（差 ${m.headerH - 65}px）`
  );

  // 1. 字号下限
  const minFs = Math.min(...m.texts.map((t) => t.fontSize));
  check(vp.name, '所有文字 ≥ 13px', minFs >= 13, `最小 ${minFs}px`);

  // 2. 无折行（单行文案应保持 1 行；含子元素的嵌套节点不参与判定）
  const wrapped = m.texts.filter((t) => t.lineCount > 1 && !t.nested);
  check(
    vp.name,
    '文案无折行',
    wrapped.length === 0,
    wrapped.length ? `折行 ${wrapped.length} 处：${wrapped.map((w) => `"${w.text}"(${w.lineCount}行)`).join(', ')}` : '全部单行'
  );

  // 3. 面板完整在视口内
  check(
    vp.name,
    '面板未超出视口',
    m.panel.l >= 0 && m.panel.r <= m.vw && m.panel.t >= 0 && m.panel.b <= m.vh,
    `left=${m.panel.l} right=${m.panel.r} (vw=${m.vw}), top=${m.panel.t} bottom=${m.panel.b} (vh=${m.vh})`
  );

  // 4. 不与左侧气场仪重叠
  if (m.gauge) {
    const overlapX = Math.min(m.panel.r, m.gauge.r) - Math.max(m.panel.l, m.gauge.l);
    const overlapY = Math.min(m.panel.b, m.gauge.b) - Math.max(m.panel.t, m.gauge.t);
    const overlap = overlapX > 0 && overlapY > 0;
    check(vp.name, '不压左侧气场仪', !overlap, overlap ? `重叠 ${overlapX}x${overlapY}px` : '无重叠');
  }

  // 5. 不与右侧栏重叠
  if (m.right) {
    const overlapX = Math.min(m.panel.r, m.right.r) - Math.max(m.panel.l, m.right.l);
    const overlapY = Math.min(m.panel.b, m.right.b) - Math.max(m.panel.t, m.right.t);
    const overlap = overlapX > 0 && overlapY > 0;
    check(vp.name, '不压右侧栏', !overlap, overlap ? `重叠 ${overlapX}x${overlapY}px` : '无重叠');
  }

  if (vp.name === '1440x900') {
    await page.screenshot({ path: OUT });
    console.log(`  截图: ${OUT}`);
  }
  await page.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== 汇总：${results.length - failed.length}/${results.length} 通过 ===`);
failed.forEach((f) => console.log(`  FAIL [${f.vp}] ${f.name} — ${f.detail}`));

await browser.close();
process.exit(failed.length ? 1 : 0);
