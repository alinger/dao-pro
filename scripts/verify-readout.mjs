/**
 * 用无头浏览器验证读数组件：
 *  1) 组件是否渲染
 *  2) 文字内容是否随角度变化
 *  3) 文字是否发生镜像（用 scaleX / transform 矩阵检测）
 *  4) 镜像开关切换后读数是否仍正向
 * 运行： node scripts/verify-readout.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.READOUT_URL || 'http://127.0.0.1:3000/';
const shots = [];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
// 只收集真正的运行时 JS 异常；资源类404（favicon 等）与本功能无关
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
    errors.push(m.text());
  }
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const readout = page.locator('text=周天方位 · 实时').first();
const exists = await readout.count();
console.log(`读数面板存在: ${exists > 0 ? 'PASS' : 'FAIL'}`);

if (exists === 0) {
  console.log('页面错误:', errors.slice(0, 5));
  await browser.close();
  process.exit(1);
}

// 采样函数
const sample = async () => page.evaluate(() => {
  const panel = [...document.querySelectorAll('div')].find((d) =>
    d.textContent?.includes('周天方位 · 实时') && d.className.includes('rounded-2xl')
  );
  if (!panel) return null;
  const char = panel.querySelector('span.font-calligraphy');
  const deg = panel.querySelector('span.font-mono span');
  const label = [...panel.querySelectorAll('span')].find((s) => /山 ·/.test(s.textContent || ''));
  return {
    char: char?.textContent ?? '',
    deg: deg?.textContent ?? '',
    label: label?.textContent ?? '',
    charTransform: char ? getComputedStyle(char).transform : 'none',
    panelTransform: getComputedStyle(panel).transform,
  };
});

console.log('\n=== 采样 1（初始） ===');
const s1 = await sample();
console.log(JSON.stringify(s1, null, 2));

console.log('\n=== 采样 2（3.5秒后，应已转动） ===');
await page.waitForTimeout(3500);
const s2 = await sample();
console.log(JSON.stringify(s2, null, 2));

const changed = s1.deg !== s2.deg || s1.char !== s2.char;
console.log(`\n读数随旋转实时变化: ${changed ? 'PASS' : 'FAIL'} (${s1.deg}° ${s1.char} -> ${s2.deg}° ${s2.char})`);

// 镜像检测：字符所在元素不得有 scaleX(-1) 之类的翻转矩阵
const flipTest = (t) => {
  if (!t || t === 'none') return false;
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return false;
  const parts = m[1].split(',').map(Number);
  return parts[0] < 0; // scaleX 为负 = 水平翻转
};
const charFlipped = flipTest(s1.charTransform);
const panelFlipped = flipTest(s1.panelTransform);
console.log(`单字未被水平翻转: ${!charFlipped ? 'PASS' : 'FAIL'} (transform=${s1.charTransform})`);
console.log(`面板未被水平翻转: ${!panelFlipped ? 'PASS' : 'FAIL'} (transform=${s1.panelTransform})`);

// 切换镜像开关，验证读数文字仍正向
console.log('\n=== 切换罗盘「镜像翻转文字」后 ===');
await page.getByTitle(/切换罗盘盘面文字左右镜像/).click();
await page.waitForTimeout(1200);
const s3 = await sample();
console.log(JSON.stringify(s3, null, 2));
const charFlipped2 = flipTest(s3.charTransform);
console.log(`镜像态下单字仍正向: ${!charFlipped2 ? 'PASS' : 'FAIL'} (transform=${s3.charTransform})`);

const badge = await page.locator('text=盘面镜像 · 读数不随之翻转').count();
console.log(`镜像态角标出现: ${badge > 0 ? 'PASS' : 'FAIL'}`);

// 截图存档
const shot1 = '../out-readout-fullpage.png';
const shot2 = 'out-readout-mirrored.png';
await page.screenshot({ path: shot1 });
await page.locator('text=周天方位 · 实时').first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: shot2, clip: { x: 360, y: 380, width: 720, height: 340 } });
shots.push(shot1, shot2);

console.log('\n页面错误:', errors.length === 0 ? '无' : errors.slice(0, 5));
console.log('截图:', shots.join(', '));

await browser.close();

const ok = exists > 0 && changed && !charFlipped && !panelFlipped && !charFlipped2 && errors.length === 0;
console.log(`\n=== 总判定: ${ok ? '全部通过' : '存在问题'} ===`);
process.exit(ok ? 0 : 1);