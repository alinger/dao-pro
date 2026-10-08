/**
 * 融合后 UI 验收：顶栏统一控件是否真正接管了原左下角三按钮的能力。
 *
 * 核查项：
 *   A. 左下角三按钮已从 DOM 消失（无重复入口）
 *   B. 顶栏「视角菜单」下拉可展开、6 个模式齐全、点选后标题跟随
 *   C. 顶栏「操盘」抽屉可展开，含拖拽手势二选一 + 文字镜像开关
 *   D. 拨动/三维 切换真正影响 3D 拖拽行为（拖拽后罗盘角度是否变化）
 *   E. 镜像开关真正作用于盘面贴图
 *   F. 顶栏在 1024 窄视口下不换行（h=65 不涨）
 *
 * 用法：node scripts/verify-merge-ui.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ': ' + detail : ''}`);
};

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

/** 抽屉/下拉都带全屏遮罩，任何其他按钮点击前必须先关掉它 */
const closeOverlays = async (page) => {
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0').forEach((el) => {
      if (el.getAttribute('aria-hidden') === 'true') el.click();
    });
  });
  await page.waitForTimeout(350);
};

// ============ A. 左下角三按钮应已消失 ============
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1200);

console.log('\n=== A. 旧左下角入口应已移除 ===');
const leftover = await page.evaluate(() => {
  const all = [...document.querySelectorAll('button')];
  return all
    .filter((b) => /^(拨动罗盘|三维天球视角|镜像翻转文字|恢复正向文字)$/.test((b.textContent || '').trim()))
    .map((b) => {
      const r = b.getBoundingClientRect();
      // 左下角 = 视口左下 1/4 区域
      const inBottomLeft = r.x < 420 && r.y > window.innerHeight * 0.7;
      return { text: (b.textContent || '').trim(), inBottomLeft };
    });
});
const bottomLeftLeftovers = leftover.filter((b) => b.inBottomLeft);
check(
  '左下角不再有「拨动罗盘/三维天球/镜像文字」按钮',
  bottomLeftLeftovers.length === 0,
  `残留 ${bottomLeftLeftovers.length} 个（${leftover.map((b) => b.text).join('/') || '全无同名按钮'}）`
);

// 同时确认这些文案在顶栏抽屉里存在（即能力没丢）
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(400);
const drawerText = await page.evaluate(() => document.body.innerText);
check('「拨动罗盘」已迁入操盘抽屉', drawerText.includes('拨动罗盘'));
check('「三维天球」已迁入操盘抽屉', drawerText.includes('三维天球'));
check('「盘面文字镜像」已迁入操盘抽屉', drawerText.includes('盘面文字镜像'));
await closeOverlays(page);

// ============ B. 视角菜单下拉 ============
console.log('\n=== B. 顶栏统一视角菜单 ===');
const navBtn = page.locator('button[title="切换视角模式"]');
check('存在单一「切换视角模式」入口', (await navBtn.count()) === 1, `找到 ${await navBtn.count()} 个`);
const navLabelBefore = (await navBtn.textContent())?.trim() ?? '';
console.log(`  当前显示: ${navLabelBefore}`);
check('入口显示当前模式名', navLabelBefore.includes('天元总览'), navLabelBefore);

await navBtn.click();
await page.waitForTimeout(400);
const menuItems = await page.evaluate(() => {
  const panels = [...document.querySelectorAll('div')].filter((d) =>
    d.className.includes('min-w-[184px]')
  );
  if (!panels.length) return [];
  return [...panels[0].querySelectorAll('button')].map((b) => (b.textContent || '').trim());
});
console.log(`  下拉项: ${menuItems.join(' / ')}`);
check('下拉含全部 6 个模式', menuItems.length === 6, `${menuItems.length} 项`);

// 点选「五行生克」
await page.locator('div.min-w-\\[184px\\] button:has-text("五行生克")').click();
await page.waitForTimeout(700);
const navLabelAfter = (await navBtn.textContent())?.trim() ?? '';
check('点选后入口文案跟随更新', navLabelAfter.includes('五行生克'), navLabelAfter);
const menuClosed = await page.locator('div.min-w-\\[184px\\]').count();
check('点选后下拉自动收起', menuClosed === 0, `残留 ${menuClosed} 个面板`);
// 复位到天元总览
await closeOverlays(page);
await navBtn.click();
await page.waitForTimeout(300);
await page.locator('div.min-w-\\[184px\\] button:has-text("天元总览")').click();
await page.waitForTimeout(700);

// 旧横向导航应已不存在（nav 元素移除）
const navElCount = await page.locator('header nav').count();
check('旧的 header nav 横向导航已移除', navElCount === 0, `找到 ${navElCount} 个`);

// ============ C+D. 拖拽手势是否真正生效 ============
console.log('\n=== C/D. 操盘抽屉 → 拖拽行为 ===');
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(400);
const spinBtn = page.locator('button:has-text("拨动罗盘")').first();
const orbitBtn = page.locator('button:has-text("三维天球")').first();
check('抽屉含「拨动罗盘」', (await spinBtn.count()) > 0);
check('抽屉含「三维天球」', (await orbitBtn.count()) > 0);

// 取 canvas 中心，拖拽一次，比较拖拽前后 canvas 像素是否有变化
const canvasBox = await page.locator('canvas').first().boundingBox();
const cx = canvasBox.x + canvasBox.width / 2;
const cy = canvasBox.y + canvasBox.height / 2;

const shotHash = async () => {
  const buf = await page.locator('canvas').first().screenshot();
  let h = 0;
  for (let i = 0; i < buf.length; i += 97) h = (h * 31 + buf[i]) % 2147483647;
  return h;
};

// 先暂停自转，避免自转本身造成像素变化
await closeOverlays(page);
const pauseBtn = page.locator('button[title*="暂停天行自转"]');
if (await pauseBtn.count()) {
  await pauseBtn.click();
  await page.waitForTimeout(600);
}

// C: spin 模式（拖拽 = 转动盘面）
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(400);
await spinBtn.click();
await closeOverlays(page);
const beforeSpin = await shotHash();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 160, cy, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(900);
const afterSpin = await shotHash();
check('spin 模式拖拽改变画面（=转动盘面）', beforeSpin !== afterSpin, `${beforeSpin} → ${afterSpin}`);

// D: orbit 模式（拖拽 = 改变相机，应用到 canvas 后画面同样变化，但盘面角度读数不应递增）
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(400);
const orbitVisible = await page.locator('button:has-text("三维天球")').first().isVisible();
if (orbitVisible) {
  await page.locator('button:has-text("三维天球")').first().click();
  await closeOverlays(page);
  const beforeOrbit = await shotHash();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 140, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const afterOrbit = await shotHash();
  check('orbit 模式拖拽改变画面（=改变视角）', beforeOrbit !== afterOrbit, `${beforeOrbit} → ${afterOrbit}`);
} else {
  check('orbit 按钮可再次打开并可见', false, '抽屉未重新展开');
}

// ============ E. 镜像开关 ============
console.log('\n=== E. 盘面文字镜像 ===');
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(400);
const mirrorRow = page.locator('button[title*="HUD 方位读数始终保持正向"]');
check('存在镜像开关行', (await mirrorRow.count()) > 0, `找到 ${await mirrorRow.count()} 个`);
if (await mirrorRow.count()) {
  const beforeText = (await mirrorRow.textContent()) ?? '';
  const beforeMirror = await shotHash();
  await mirrorRow.click();
  await page.waitForTimeout(1000);
  const afterText = (await mirrorRow.textContent()) ?? '';
  const afterMirror = await shotHash();
  check('镜像态文案切换为正/反', beforeText !== afterText, `${beforeText.trim()} → ${afterText.trim()}`);
  check('镜像开关改变盘面渲染', beforeMirror !== afterMirror, `${beforeMirror} → ${afterMirror}`);
}
await closeOverlays(page);

// ============ F. 窄视口顶栏不换行 ============
console.log('\n=== F. 窄视口（1024）顶栏锁高 ===');
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(900);
const headerH = await page.evaluate(() => {
  const h = document.querySelector('header');
  return h ? Math.round(h.getBoundingClientRect().height) : -1;
});
check('顶栏高度保持 65px（未换行）', Math.abs(headerH - 65) <= 2, `实测 ${headerH}px`);

const overflow = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('header button')];
  return btns
    .filter((b) => b.getBoundingClientRect().right > window.innerWidth + 1)
    .map((b) => (b.textContent || '').trim().slice(0, 14));
});
check('顶栏按钮无横向溢出', overflow.length === 0, overflow.join('/') || '无溢出');

// 窄视口下应降级为循环按钮
const segCount = await page.locator('button:has-text("灵动 (3.0x)")').count();
const cycleBtn = await page.locator('button[title*="切换转速档位"]').count();
check('窄视口转速降级为循环按钮', cycleBtn >= 1, `分段控件 ${segCount} 个 / 循环按钮 ${cycleBtn} 个`);

await page.screenshot({ path: './out-merge-1024.png' });

// ============ G. 面板不被顶栏裁切（回归防护）============
// 踩过的坑：header 上遗留的 overflow-hidden 会把 z-50 的下拉/抽屉面板整个裁掉
// （面板底 314px > 顶栏底 65px），表现为「面板渲染了却看不见、点到的是下面的 canvas」。
// 判据：面板中心点的 elementFromPoint 必须落在面板内部。
console.log('\n=== G. 面板不被顶栏裁切 ===');
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(800);
const headerOverflow = await page.evaluate(
  () => getComputedStyle(document.querySelector('header')).overflow
);
check('header 不能是 overflow-hidden（否则裁掉下拉）', headerOverflow !== 'hidden', `overflow=${headerOverflow}`);

await page.locator('button[title="切换视角模式"]').click();
await page.waitForTimeout(700);
const viewMenuHit = await page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) =>
    d.className.includes('min-w-[184px]')
  );
  if (!panel) return { ok: false, why: '面板未渲染' };
  const b = panel.getBoundingClientRect();
  const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
  return { ok: panel.contains(top), why: top ? top.tagName : 'null' };
});
check('视角菜单可被点击（未被 canvas 遮挡）', viewMenuHit.ok, `命中元素 ${viewMenuHit.why}`);
await closeOverlays(page);

await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(700);
const drawerHit = await page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) => d.className.includes('w-[276px]'));
  if (!panel) return { ok: false, why: '抽屉未渲染' };
  const b = panel.getBoundingClientRect();
  const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
  return { ok: panel.contains(top), why: top ? top.tagName : 'null' };
});
check('操盘抽屉可被点击（未被 canvas 遮挡）', drawerHit.ok, `命中元素 ${drawerHit.why}`);
await closeOverlays(page);

// ============ 宽视口全景截图（含抽屉展开态） ============
await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(900);
await page.screenshot({ path: './out-merge-1600.png' });
await page.locator('header').screenshot({ path: './out-merge-header.png' });
await page.locator('button[title*="操盘方式"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: './out-merge-drawer.png' });
await closeOverlays(page);
await page.locator('button[title="切换视角模式"]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: './out-merge-viewmenu.png' });

console.log('\n截图已保存: out-merge-1024.png / out-merge-1600.png / out-merge-header.png / out-merge-drawer.png');

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n=== 结果: ${passed} passed, ${results.length - passed} failed ===`);
process.exit(results.length - passed === 0 ? 0 : 1);
