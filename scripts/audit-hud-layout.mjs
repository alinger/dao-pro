/**
 * 全站 HUD 面板排版审计
 * =====================
 *
 * 背景
 * ----
 * 2026-10-07 一次性放大了所有常驻面板的文字（9px→14px 起），
 * 字号放大必然带来连带风险：换行、溢出、面板互相重叠、控件撑破容器。
 * 这些问题肉眼看单个面板看不出来，必须逐视口量化。
 *
 * 检查项（每视口）
 *   1. 全站可见文字 ≥ 13px
 *   2. 各面板未超出视口
 *   3. 面板之间无重叠
 *   4. 顶栏高度 = 65px（与 App.tsx 中 main 的 calc(100vh-65px) 硬编码一致）
 *   5. 页面未被内容撑高
 *   6. 关键单行文案不折行
 *
 * 用法：SHOT_URL=http://127.0.0.1:3000/ node scripts/audit-hud-layout.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:3000/';
const MIN_PX = 13;
const OUT = process.env.SHOT_OUT || './out-hud-audit.png';

const VIEWPORTS = [
  { w: 1920, h: 1080, name: '1920x1080' },
  { w: 1600, h: 900, name: '1600x900' },
  { w: 1440, h: 900, name: '1440x900' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 1024, h: 768, name: '1024x768' },
];

// 面板识别：以稳定的语义 class / 特征文本定位，避免依赖 DOM 层级（重构即失效）
const PANELS = [
  { key: 'readout', name: '罗盘读数', find: '周天方位' },
  { key: 'gauge', name: '气场共鸣仪', find: '气场共鸣仪' },
  { key: 'calendar', name: '道历玄历', find: '道历天象玄历' },
  { key: 'selector', name: '五行八卦', find: '五行生克' },
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
  await page.waitForTimeout(2500);
  const pause = page.locator('button[title*="暂停天行自转"]');
  if (await pause.count()) await pause.click();
  await page.waitForTimeout(500);

  console.log(`\n=== ${vp.name} ===`);

  const data = await page.evaluate((panelDefs) => {
    // 收集所有可见文本叶子节点
    const texts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const raw = (n.nodeValue || '').trim();
      if (!raw) continue;
      const el = n.parentElement;
      if (!el || el.closest('script,style')) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      const hasChild = el.childElementCount > 0;
      let lines = 1;
      if (!hasChild) {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        lines = Math.max(1, Array.from(rg.getClientRects()).filter((x) => x.height > 1).length);
      }
      texts.push({ t: raw.slice(0, 14), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10, lines, nested: hasChild });
    }

    // 定位各面板
    const boxes = {};
    for (const p of panelDefs) {
      const el = [...document.querySelectorAll('div')].find(
        (d) => d.textContent?.includes(p.find) && d.className.includes('rounded')
      );
      if (!el) { boxes[p.key] = null; continue; }
      const r = el.getBoundingClientRect();
      boxes[p.key] = { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) };
    }

    // 顶栏 / 容器
    const header = document.querySelector('header');
    const root = document.querySelector('div.relative.w-screen');
    const main = document.querySelector('main');

    return {
      texts,
      boxes,
      headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
      rootH: root ? Math.round(root.getBoundingClientRect().height) : 0,
      mainTop: main ? Math.round(main.getBoundingClientRect().top) : 0,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
    };
  }, PANELS);

  // 1. 字号下限
  const minFs = Math.min(...data.texts.map((x) => x.fs));
  const tooSmall = data.texts.filter((x) => x.fs < MIN_PX);
  check(vp.name, `所有文字 ≥ ${MIN_PX}px`, tooSmall.length === 0,
    tooSmall.length ? `最小 ${minFs}px，${tooSmall.length} 处偏小：${tooSmall.slice(0,3).map(x=>`"${x.t}"${x.fs}px`).join(', ')}` : `最小 ${minFs}px，共 ${data.texts.length} 个节点`);

  // 2. 顶栏高度与 main 假设一致
  check(vp.name, '顶栏高度 = 65px', data.headerH === 65, data.headerH === 65 ? '65px' : `实测 ${data.headerH}px`);

  // 3. 页面未撑高
  check(vp.name, '页面未被撑高', data.rootH <= data.innerH + 1, `${data.rootH}px vs 视口 ${data.innerH}px`);

  // 4. 各面板在视口内
  for (const p of PANELS) {
    const b = data.boxes[p.key];
    if (!b) { check(vp.name, `${p.name} 存在`, false, '未找到面板'); continue; }
    const inside = b.l >= -1 && b.r <= data.innerW + 1 && b.t >= -1 && b.b <= data.innerH + 1;
    check(vp.name, `${p.name} 未越界`, inside, inside ? `l=${b.l} r=${b.r} t=${b.t} b=${b.b}` : `l=${b.l} r=${b.r}(vw=${data.innerW}) t=${b.t} b=${b.b}(vh=${data.innerH})`);
  }

  // 5. 面板两两不重叠
  const active = PANELS.filter((p) => data.boxes[p.key]).map((p) => ({ name: p.name, b: data.boxes[p.key] }));
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i].b, c = active[j].b;
      const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l);
      const oy = Math.min(a.b, c.b) - Math.max(a.t, c.t);
      const ov = ox > 2 && oy > 2;
      check(vp.name, `${active[i].name} 不压 ${active[j].name}`, !ov, ov ? `重叠 ${ox}x${oy}px` : '无重叠');
    }
  }

  // 6. 关键单行文案不折行（排除嵌套结构）
  const KEY = ['周天方位', '二十四山', '气场共鸣仪', '道历天象玄历', '拨动罗盘', '镜像翻转文字'];
  const folded = data.texts.filter((x) => x.lines > 1 && !x.nested && KEY.some((k) => x.t.includes(k)));
  check(vp.name, '关键文案不折行', folded.length === 0,
    folded.length ? folded.map((f) => `"${f.t}"(${f.lines}行)`).join(', ') : '全部单行');

  if (vp.name === '1440x900') await page.screenshot({ path: OUT });

  // ---- 展开态 / 弹窗态覆盖率（此前只测默认态，道历弹窗内的文字从未被审计）----
  if (vp.name === '1440x900' || vp.name === '1024x768') {
    // 注意：两个入口必须用互不重叠的精确定位，否则会点开同一个弹窗
    //（实测踩过：'button[title*="万年图谱"]' 恰好就是「图谱」按钮，
    //   误当成「今日详情」，导致两个标签审计的是同一份内容、数字完全一样）
    for (const [label, opener] of [
      ['道历·今日详情弹窗', 'button:has(> span:text-is("今日详情"))'],
      ['道历·节气图谱弹窗', 'button[title="打开二十四节气万年图谱"]'],
    ]) {
      const loc = page.locator(opener).first();
      if (await loc.count()) {
        await loc.click().catch(() => {});
        await page.waitForTimeout(700);
        const st = await page.evaluate((minPx) => {
          const texts = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            const raw = (n.nodeValue || '').trim();
            if (!raw) continue;
            const el = n.parentElement;
            if (!el || el.closest('script,style')) continue;
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) continue;
            if (parseFloat(cs.opacity) < 0.05) continue;
            texts.push({ t: raw.slice(0, 12), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10 });
          }
          // 弹窗盒模型：结构是「fixed 遮罩层 > max-w-3xl 内容层」，
          // fixed 在遮罩、rounded 在内容层，没有单个 div 同时具备两个类名，
          // 所以必须先找遮罩再取其子元素（实测踩过：写成单 div 匹配导致恒为 null，
          // 「未越界」这项被静默跳过，看起来像通过）。
          const overlay = [...document.querySelectorAll('div')].find(
            (d) => d.className.includes('fixed') && d.className.includes('inset-0') && d.className.includes('z-50')
          );
          const content = overlay?.querySelector('div');
          const mb = content ? content.getBoundingClientRect() : null;
          return {
            n: texts.length,
            min: Math.min(...texts.map((x) => x.fs)),
            small: texts.filter((x) => x.fs < minPx),
            modal: mb
              ? { l: Math.round(mb.left), r: Math.round(mb.right), t: Math.round(mb.top), b: Math.round(mb.bottom) }
              : null,
            vw: window.innerWidth, vh: window.innerHeight,
          };
        }, MIN_PX);
        check(vp.name, `${label} 文字 ≥ ${MIN_PX}px`, st.small.length === 0,
          st.small.length ? `${st.small.length}/${st.n} 处偏小，最小 ${st.min}px：${st.small.slice(0, 3).map((x) => `"${x.t}"${x.fs}px`).join(', ')}`
                        : `最小 ${st.min}px，共 ${st.n} 个节点`);
        if (st.modal) {
          const inside = st.modal.l >= -1 && st.modal.r <= st.vw + 1 && st.modal.t >= -1 && st.modal.b <= st.vh + 1;
          check(vp.name, `${label} 未越界`, inside,
            inside ? `l=${st.modal.l} r=${st.modal.r} t=${st.modal.t} b=${st.modal.b}` : `溢出 l=${st.modal.l} r=${st.modal.r}(vw=${st.vw}) b=${st.modal.b}(vh=${st.vh})`);
        } else {
          // 弹窗没找到必须判FAIL：否则这项会被静默跳过，
          // 留下「看起来全绿、实际没测」的假象（本次已踩过一次）
          check(vp.name, `${label} 弹窗已打开`, false, '未找到弹窗容器，无法审计');
        }
        if (vp.name === '1440x900') await page.screenshot({ path: OUT.replace('.png', '-modal.png') });
        // 关闭弹窗，避免影响后续审计
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(400);
        const stillOpen = await page.evaluate(() =>
          [...document.querySelectorAll('div')].some((d) => d.className.includes('inset-0') && d.className.includes('z-50') && d.textContent?.includes('道历玄宪'))
        );
        if (stillOpen) await page.locator('button[title*="关闭"]').first().click().catch(() => {});
        await page.waitForTimeout(400);
        const closed = await page.evaluate(() =>
          ![...document.querySelectorAll('div')].some((d) => d.className.includes('inset-0') && d.className.includes('z-50') && d.textContent?.includes('道历玄宪'))
        );
        check(vp.name, `${label} 可关闭`, closed, closed ? '已关闭' : '关闭失败，会污染后续断言');
      }
    }
  }
  await page.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n=== 汇总：${results.length - failed.length}/${results.length} 通过 ===`);
failed.forEach((f) => console.log(`  FAIL [${f.vp}] ${f.name} — ${f.detail}`));
console.log(`截图: ${OUT}`);

await browser.close();
process.exit(failed.length ? 1 : 0);
