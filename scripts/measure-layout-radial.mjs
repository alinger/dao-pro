/**
 * 从展开图里量测两行文字的径向位置，用像素说话（不再靠符号推导）。
 * 判据：在「切向」上积分每个径向位置的亮像素数 → 得到径向亮度剖面 →
 *       找峰值 → 峰值所在的「归一化径向位置」即该行文字的实际落点。
 *
 * 用法：node scripts/measure-layout-radial.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const res = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const size = 2048;
  const maxR = size * 0.485;
  const r1 = maxR * 0.355;
  const r2 = maxR * 0.515;
  const midR = (r1 + r2) / 2;

  const A = (deg) => (deg * Math.PI) / 180 - Math.PI / 2;

  // 重画一棵布局，返回「径向亮度剖面」
  function profile(nameY, nameFS, seasonY, seasonFS) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    c.fillStyle = '#0a0a0a';
    c.fillRect(0, 0, size, size);

    // 只画水·冬藏一段（-20°~+20°，居中 0°）
    const rad = A(0);
    const px = size / 2 + Math.cos(rad) * midR;
    const py = size / 2 + Math.sin(rad) * midR;
    c.save();
    c.translate(px, py);
    c.rotate(rad + Math.PI / 2);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${nameFS}px "Ma Shan Zheng","Noto Serif SC",serif`;
    c.fillStyle = '#ffffff';
    c.fillText('水', 0, nameY);
    c.font = `bold ${seasonFS}px "Noto Serif SC",serif`;
    c.fillText('冬藏', 0, seasonY);
    c.restore();

    // 径向剖面：扫正上方竖直中线（x = size/2, y 从 size/2 - r2-40 到 size/2 - r1+40）
    const d = c.getImageData(0, 0, size, size).data;
    const prof = [];
    const rr = [];
    for (let r = r1 - 30; r <= r2 + 30; r += 1) {
      let sum = 0;
      // 沿切向积 30 条平行线（覆盖 ±2°），避免单线穿字缝
      for (let k = -15; k <= 15; k++) {
        const deg = k * 0.15;
        const a2 = A(deg);
        const x = Math.round(size / 2 + Math.cos(a2) * r);
        const y = Math.round(size / 2 + Math.sin(a2) * r);
        const i = (y * size + x) * 4;
        sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
      }
      prof.push(sum / 31);
      rr.push(r);
    }
    // 找峰
    const peaks = [];
    for (let i = 2; i < prof.length - 2; i++) {
      const v = prof[i];
      if (v > prof[i - 1] && v > prof[i + 1] && v > prof[i - 2] && v > prof[i + 2] && v > 25) {
        peaks.push({ r: rr[i], v });
      }
    }
    return { peaks, r1, r2, midR };
  }

  const out = [];
  const variants = [
    ['A 现状', -21, 66, 38, 30],
    ['B 交换', 21, 66, -38, 30],
    ['C 收拢', -18, 66, 35, 30],
    ['D 紧贴', -6, 66, 30, 30],
    ['原版', -20, 66, 28, 28],
  ];
  for (const [name, ny, nfs, sy, sfs] of variants) {
    const p = profile(ny, nfs, sy, sfs);
    out.push({ name, peaks: p.peaks, ny, sy, r1: p.r1, r2: p.r2, midR: p.midR });
  }
  return { out, r1, r2, midR };
});

console.log(`环带 r1=${res.r1.toFixed(1)}  midR=${res.midR.toFixed(1)}  r2=${res.r2.toFixed(1)}\n`);
console.log('（局部 y 符号 vs 实际径向落点，实测）：\n');
for (const v of res.out) {
  console.log(`${v.name.padEnd(8)} 传入 nameY=${String(v.ny).padStart(3)} seasonY=${String(v.sy).padStart(3)}`);
  for (const pk of v.peaks) {
    const pos = pk.r > v.midR ? '偏外(近r2)' : '偏内(近r1)';
    console.log(`    峰 r=${pk.r.toFixed(0).padStart(4)}  强度${pk.v.toFixed(0).padStart(4)}  ${pos}`);
  }
  // 推导：哪个 peek 是名、哪个是季
  if (v.peaks.length >= 2) {
    const rName = v.ny; const rSeason = v.sy;
    const namePeak = v.peaks.reduce((a, b) => Math.abs(Math.abs(b.r - v.midR) - Math.abs(rName)) < Math.abs(Math.abs(a.r - v.midR) - Math.abs(rName)) ? b : a);
    console.log(`    → nameY=${rName} 的落点应为 ${rName < 0 ? '半径 ' + (v.midR - rName).toFixed(0) : '半径 ' + (v.midR - rName).toFixed(0)}  (即 ${rName < 0 ? '外' : '内'}侧)`);
  }
  console.log('');
}
await browser.close();
