/**
 * 验证「五行生克 / 八卦推演 / 天元总览」三个模式是否真有画面差异。
 *
 * 判据（不靠肉眼）：
 *   1) 三个模式各截一张纯净盘面图（隐藏 HUD，避免面板遮挡干扰）
 *   2) 两两做像素级平均绝对差（MAE）
 *   3) 再按**径向着色带**取样：五行环带 / 八卦环带 的平均亮度，
 *      验证「点亮的环更亮、压暗的环更暗」这一聚光语义
 *
 * 用法：node scripts/verify-mode-visual-diff.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import zlib from 'zlib';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const W = 900;
const H = 900;

// ——— 纯 JS PNG 解码（本机无 Pillow / sharp）———
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit supported');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const lum = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
};

const mae = (A, B) => {
  let sum = 0;
  const px = A.width * A.height;
  for (let y = 0; y < A.height; y += 2) {
    for (let x = 0; x < A.width; x += 2) {
      sum += Math.abs(lum(A, x, y) - lum(B, x, y));
    }
  }
  return sum / (px / 4);
};

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1800);

// 隐藏全部 HUD（只留 canvas），并按需暂停自转
const prep = async () => {
  await page.evaluate(() => {
    document.querySelectorAll('header, .absolute, aside, .fixed').forEach((el) => {
      if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden';
    });
  });
  const pause = page.locator('button[title*="暂停天行自转"]');
  if (await pause.count()) {
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach((b) => (b.style.visibility = 'visible'));
    });
    await pause.click();
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    document.querySelectorAll('header, .absolute, aside, .fixed').forEach((el) => {
      if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden';
    });
  });
  await page.waitForTimeout(1600);
};

const setMode = async (label) => {
  await page.evaluate(() => {
    document.querySelectorAll('header, .absolute, aside, .fixed, button').forEach((el) => {
      if (el.tagName !== 'CANVAS') el.style.visibility = 'visible';
    });
  });
  await page.locator('button[title="切换视角模式"]').click();
  await page.waitForTimeout(400);
  await page.locator(`div.min-w-\\[184px\\] button:has-text("${label}")`).click();
  await page.waitForTimeout(1500);
  await prep();
};

const shots = {};
for (const label of ['天元总览', '五行生克', '八卦推演']) {
  await setMode(label);
  const out = `./out-mode-${label}.png`;
  await page.locator('canvas').first().screenshot({ path: out });
  shots[label] = decodePNG(fs.readFileSync(out));
  console.log(`已截 ${label} → ${out}`);
}

console.log('\n=== 1) 两两像素平均绝对差（MAE，亮度 0~255）===');
const pairs = [
  ['天元总览', '五行生克'],
  ['天元总览', '八卦推演'],
  ['五行生克', '八卦推演'],
];
const results = [];
for (const [a, b] of pairs) {
  const v = mae(shots[a], shots[b]);
  const ok = v > 6;
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${a} vs ${b}: MAE = ${v.toFixed(2)}  (判据 > 6)`);
}

console.log('\n=== 2) 环带聚光语义（各环带平均亮度）===');
// 盘面直径约占画布 97%，贴图内容半径 0.485*900/2... 直接按画布归一化取环带
const cxp = shots['天元总览'].width / 2;
const cyp = shots['天元总览'].height / 2;
const maxR = (shots['天元总览'].width / 2) * 0.97;
const bands = {
  'R1 八卦(0.25~0.355)': [0.25, 0.355],
  'R2 五行(0.355~0.515)': [0.355, 0.515],
  'R3 节气(0.515~0.63)': [0.515, 0.63],
  'R4 廿四山(0.63~0.79)': [0.63, 0.79],
};
const bandLum = (img, lo, hi) => {
  let sum = 0, n = 0;
  for (let y = 0; y < img.height; y += 3) {
    for (let x = 0; x < img.width; x += 3) {
      const dx = x - cxp, dy = y - cyp;
      const r = Math.hypot(dx, dy) / maxR;
      if (r >= lo && r < hi) { sum += lum(img, x, y); n++; }
    }
  }
  return n ? sum / n : 0;
};
const header = ['环带'.padEnd(24), '总览'.padStart(8), '五行'.padStart(8), '八卦'.padStart(8)];
console.log('  ' + header.join(''));
for (const [name, [lo, hi]] of Object.entries(bands)) {
  const a = bandLum(shots['天元总览'], lo, hi);
  const b = bandLum(shots['五行生克'], lo, hi);
  const c = bandLum(shots['八卦推演'], lo, hi);
  console.log(`  ${name.padEnd(24)}${a.toFixed(1).padStart(8)}${b.toFixed(1).padStart(8)}${c.toFixed(1).padStart(8)}`);
}

// 语义断言：五行模式下 R2 应比 R4 亮；八卦模式下 R1 应比 R4 亮
const r1 = [0.25, 0.355], r4 = [0.63, 0.79];
const elR2 = bandLum(shots['五行生克'], 0.355, 0.515);
const elR4 = bandLum(shots['五行生克'], ...r4);
results.push(elR2 > elR4 * 1.1);
console.log(`\n  ${elR2 > elR4 * 1.1 ? 'PASS' : 'FAIL'}  五行模式：五行环(${elR2.toFixed(1)}) 应明显亮于 廿四山环(${elR4.toFixed(1)})`);

const bgR1 = bandLum(shots['八卦推演'], ...r1);
const bgR4 = bandLum(shots['八卦推演'], ...r4);
results.push(bgR1 > bgR4 * 1.1);
console.log(`  ${bgR1 > bgR4 * 1.1 ? 'PASS' : 'FAIL'}  八卦模式：八卦环(${bgR1.toFixed(1)}) 应明显亮于 廿四山环(${bgR4.toFixed(1)})`);

await browser.close();
const passed = results.filter(Boolean).length;
console.log(`\n=== 结果：${passed}/${results.length} 通过 ===`);
process.exit(passed === results.length ? 0 : 1);
