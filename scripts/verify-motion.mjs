/**
 * 转速 / 档位 / 单步 / 默认朝向 综合实测。
 *
 * 全部通过监听页面内读数面板的度数文本完成，不依赖任何日志输出，
 * 因此测到的是用户真正看到的数字。
 *
 * 用法：READOUT_URL=http://127.0.0.1:3002/ node scripts/verify-motion.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.READOUT_URL || 'http://127.0.0.1:3000/';
const EXPECTED_DEG_PER_SEC = 1.0;
const TOLERANCE = 0.12; // 允许 ±12% 误差（采样首尾各含半帧量化误差）

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const readDeg = () =>
  page.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find(
      (d) => d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
    );
    if (!panel) return null;
    const deg = panel.querySelector('span.font-mono span');
    const char = panel.querySelector('span.font-calligraphy');
    const v = parseFloat(deg?.textContent || 'NaN');
    return { deg: v, char: (char?.textContent || '').trim() };
  });

/** 归一化角度差到 (-180, 180]，用于跨 0 回绕 */
const wrapDelta = (d) => (d < -180 ? d + 360 : d > 180 ? d - 360 : d);

/** 采样 durationMs，返回角速度与步进平稳度 */
async function measure(durationMs, intervalMs = 500) {
  const samples = [];
  const t0 = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    samples.push({ t: (Date.now() - t0) / 1000, ...(await readDeg()) });
    if (Date.now() - t0 >= durationMs) break;
    await page.waitForTimeout(intervalMs);
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const delta = wrapDelta(last.deg - first.deg);
  const dur = last.t - first.t;
  const degPerSec = delta / dur;

  const steps = [];
  for (let i = 1; i < samples.length; i++) {
    steps.push(wrapDelta(samples[i].deg - samples[i - 1].deg));
  }
  const avgStep = steps.length ? steps.reduce((a, b) => a + b, 0) / steps.length : 0;
  const jitter = steps.length ? Math.max(...steps.map((s) => Math.abs(s - avgStep))) : 0;
  return { degPerSec, samples, avgStep, jitter, span: dur };
}

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name} — ${detail}`);
};

await page.goto(URL, { waitUntil: 'domcontentloaded' });

// ——— 1. 默认朝向：尽早采样，应读「子」且接近 0° ———
console.log('\n=== 1. 默认朝向（第一视角） ===');
// 只等 DOM，不等 networkidle：网络空闲本身就要几百毫秒，1°/s 下会明显漂移
await page.waitForSelector('canvas', { timeout: 15000 });
const initial = await readDeg();
console.log(`  首个读数: ${initial?.deg}° → ${initial?.char}山`);
check(
  '初始朝向为子（北）',
  initial?.char === '子',
  `读到 ${initial?.char}山 ${initial?.deg}°`
);
check(
  '初始角度接近 0°（含 3 秒内自动流转的余量）',
  initial?.deg !== undefined && initial.deg <= 6,
  `${initial?.deg}° ≤ 6°`
);

// 记录初始朝向截图（此时盘面几乎没转，最能反映默认第一视角）
await page.screenshot({ path: '../out-default-facing.png' });

// ——— 2. 基准转速 1°/s ———
console.log('\n=== 2. 基准转速（沉稳 1.0x = 1°/s） ===');
await page.waitForTimeout(1200);
const base = await measure(16000, 500);
const baseOk = Math.abs(base.degPerSec - EXPECTED_DEG_PER_SEC) <= EXPECTED_DEG_PER_SEC * TOLERANCE;
console.log(
  `  实测 ${base.degPerSec.toFixed(3)} °/s，一圈 ${(360 / base.degPerSec).toFixed(0)}s，` +
    `过一座山 ${(15 / base.degPerSec).toFixed(1)}s，每 0.5s 平均步进 ${base.avgStep.toFixed(3)}°，抖动 ±${base.jitter.toFixed(3)}°`
);
check('基准转速 ≈ 1.000 °/s', baseOk, `实测 ${base.degPerSec.toFixed(3)} °/s（容差 ±${TOLERANCE * 100}%）`);
check('转动连续无顿挫（抖动 < 0.35°）', base.jitter < 0.35, `抖动 ±${base.jitter.toFixed(3)}°`);

// ——— 3. 档位切换：悠缓 0.25x → 灵动 3.0x ———
// 融合后转速有两档 UI：
//   ≥1536px(2xl) 分段控件：三档同屏，可直接点选（本次改造新增的能力）
//   <1536px      降级为循环按钮（原行为，避免 7 控件横排溢出 1024 视口）
// 两种形态都要能切到目标档，故分别给选择器，按是否可见取用。
console.log('\n=== 3. 速度档位 ===');
const segFast = page.locator('button:has-text("灵动 (3.0x)")').first();
const segVisible = await segFast.isVisible().catch(() => false);
const cycleBtn = page.locator('button[title*="切换转速档位"]');
const readLabel = async () =>
  segVisible ? (await segFast.textContent()) : (await cycleBtn.textContent());
console.log(`  档位 UI 形态: ${segVisible ? '分段控件' : '循环按钮'}，当前 ${(await readLabel())?.trim()}`);

/** 切到指定倍率档：分段控件直接点，循环按钮则最多循环 4 次找目标 */
const gotoPreset = async (label) => {
  if (segVisible) {
    await page.locator(`button:has-text("${label}")`).first().click();
  } else {
    for (let i = 0; i < 5; i++) {
      const t = (await cycleBtn.textContent()) ?? '';
      if (t.includes(label)) break;
      await cycleBtn.click();
      await page.waitForTimeout(250);
    }
  }
  await page.waitForTimeout(600);
};

// 切到「灵动 3.0x」
await gotoPreset('灵动 (3.0x)');
console.log(`  切档后: ${(await readLabel())?.trim()}`);
await page.waitForTimeout(800);
const fast = await measure(7000, 400);
console.log(`  实测 ${fast.degPerSec.toFixed(3)} °/s（期望 ≈3.000）`);
check(
  '灵动档 ≈ 3.000 °/s',
  Math.abs(fast.degPerSec - 3.0) <= 3.0 * TOLERANCE,
  `实测 ${fast.degPerSec.toFixed(3)} °/s`
);

// 切到「悠缓 0.25x」
await gotoPreset('悠缓 (0.25x)');
console.log(`  切档后: ${(await readLabel())?.trim()}`);
await page.waitForTimeout(800);
const slow = await measure(9000, 600);
console.log(`  实测 ${slow.degPerSec.toFixed(3)} °/s（期望 ≈0.250）`);
check(
  '悠缓档 ≈ 0.250 °/s',
  Math.abs(slow.degPerSec - 0.25) <= 0.25 * 0.25,
  `实测 ${slow.degPerSec.toFixed(3)} °/s`
);

// ——— 4. 单步拨齿 ———
console.log('\n=== 4. 单步拨齿 ===');
// 先手动暂停自转再测单步。
// 若在自转中测，「读取起始角度」到「click 事件真正生效」之间罗盘仍在流动
// （1°/s × 数百毫秒 ≈ 0.5~0.6°），会污染单步增量这个 1° 级的测量。
const pauseBtn = page.locator('button[title*="暂停天行自转"]');
if (await pauseBtn.count()) {
  await pauseBtn.click();
  await page.waitForTimeout(500);
}
const paused0 = await readDeg();
await page.waitForTimeout(900);
const paused1 = await readDeg();
check(
  '暂停后完全静止（0.9s 内位移 < 0.1°）',
  Math.abs(paused1.deg - paused0.deg) < 0.1,
  `位移 ${Math.abs(paused1.deg - paused0.deg).toFixed(3)}°`
);

const stepBtn = page.locator('button[title*="单步拨动一齿"]');
const beforeStep = await readDeg();
await stepBtn.click();
await page.waitForTimeout(500);
const afterStep = await readDeg();
const stepDelta = wrapDelta(afterStep.deg - beforeStep.deg);
console.log(`  拨齿前 ${beforeStep.deg}° → 拨齿后 ${afterStep.deg}°，增量 ${stepDelta.toFixed(2)}°`);
check('单步 = 1.00°', Math.abs(stepDelta - 1) <= 0.1, `实测增量 ${stepDelta.toFixed(2)}°`);

const still1 = await readDeg();
await page.waitForTimeout(1200);
const still2 = await readDeg();
check(
  '单步后仍保持静止（1.2s 内位移 < 0.1°）',
  Math.abs(still2.deg - still1.deg) < 0.1,
  `位移 ${Math.abs(still2.deg - still1.deg).toFixed(3)}°`
);

// 连点 3 次应累计 3°
const base2 = await readDeg();
for (let i = 0; i < 3; i++) {
  await stepBtn.click();
  await page.waitForTimeout(160);
}
await page.waitForTimeout(500);
const after3 = await readDeg();
const multiDelta = wrapDelta(after3.deg - base2.deg);
console.log(`  连点 3 次增量: ${multiDelta.toFixed(2)}°（期望 3.00°）`);
check('连点 3 次累计 3.00°', Math.abs(multiDelta - 3) <= 0.15, `实测 ${multiDelta.toFixed(2)}°`);

// 单步按钮应自动暂停自转：先恢复自转，再点单步，验证它会停
const playBtn = page.locator('button[title*="开启天行动转"]');
await playBtn.click();
await page.waitForTimeout(600);
const spinA = await readDeg();
await page.waitForTimeout(1000);
const spinB = await readDeg();
// 此时档位是「悠缓 0.25x」，1 秒应走约 0.25°，不是 1°
const expectedStep = 0.25;
const spinDelta = wrapDelta(spinB.deg - spinA.deg);
check(
  `恢复自转后确实在转（1s 位移 ≈ ${expectedStep}°）`,
  Math.abs(spinDelta - expectedStep) <= 0.1,
  `1s 位移 ${spinDelta.toFixed(2)}°`
);
await stepBtn.click();
await page.waitForTimeout(500);
const afterStepSpin = await readDeg();
await page.waitForTimeout(1000);
const afterStepSpin2 = await readDeg();
check(
  '自转中点单步会自动暂停',
  Math.abs(afterStepSpin2.deg - afterStepSpin.deg) < 0.1,
  `拨齿后 1s 位移 ${Math.abs(afterStepSpin2.deg - afterStepSpin.deg).toFixed(3)}°`
);

// ——— 5. 切回基准档并复测 ———
console.log('\n=== 5. 切回基准档复测 ===');
await gotoPreset('沉稳 (1.0x)');
console.log(`  归位档位: ${(await readLabel())?.trim()}`);
check(
  '可切回沉稳 1.0x',
  ((await readLabel()) ?? '').includes('1.0x'),
  (await readLabel())?.trim() ?? ''
);

const playAgain = page.locator('button[title*="开启天行动转"]');
if (await playAgain.count()) {
  await playAgain.click();
  await page.waitForTimeout(500);
}
const resumed = await measure(10000, 500);
console.log(`  实测 ${resumed.degPerSec.toFixed(3)} °/s`);
check(
  '回到基准档后 ≈ 1.000 °/s',
  Math.abs(resumed.degPerSec - 1.0) <= 1.0 * TOLERANCE,
  `实测 ${resumed.degPerSec.toFixed(3)} °/s`
);

// ——— 6. HUD 速度上报（rad/s）——
// 自转时 angularVelocityRef 恒为 0，旧实现会导致气场仪永远显示「恬淡中和」。
// 面板默认展开，显示的文案是「活跃充盈」；「运转充盈」是折叠态的简写。
console.log('\n=== 6. HUD 速度上报 ===');
const readGaugeState = () =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) =>
      /活跃充盈|运转充盈|恬淡中和/.test(s.textContent || '')
    );
    return el ? el.textContent.trim() : null;
  });
const gauge = await readGaugeState();
console.log(`  气场仪状态: ${gauge}`);
check(
  '自转中气场仪显示「活跃充盈」',
  gauge === '活跃充盈' || gauge === '运转充盈',
  `读到「${gauge}」`
);

await page.screenshot({ path: '../out-motion-final.png' });

// ——— 汇总 ———
const failed = results.filter((r) => !r.pass);
console.log(`\n=== 汇总：${results.length - failed.length}/${results.length} 通过 ===`);
failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
process.exit(failed.length ? 1 : 0);
