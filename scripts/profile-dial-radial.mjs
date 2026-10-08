/**
 * 3D 实拍盘面的「极坐标径向剖面」量测。
 *
 * 目的：不靠肉眼，直接回答「某个环带里到底住着几层文字」。
 * 做法：截图 → 在页面里把 PNG 画进离屏 canvas → 以盘心为原点做极坐标扫描，
 *       按半径分箱统计「金色/亮色文字像素」占比 → 输出剖面曲线。
 *
 * 判据：一个健康的环带内应呈「单峰」；
 *       若出现「双峰 + 中间低谷」，说明该环带混入了邻环内容（用户反馈的"被切"）。
 *
 * 用法: SHOT_W=891 SHOT_H=776 node scripts/profile-dial-radial.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const VW = Number(process.env.SHOT_W || 891);
const VH = Number(process.env.SHOT_H || 776);
const OUT = process.env.SHOT_OUT || './out-profile.png';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(2500);

// 暂停自转，取稳定帧
const pause = page.locator('button[title*="暂停天行自转"]');
if (await pause.count()) await pause.click();
await page.waitForTimeout(500);

// 全屏截图（不隐藏 HUD 也行，盘心靠探测）
const shot = await page.screenshot({ path: OUT });
console.log('截图:', OUT, `${VW}x${VH}`);

const dataUrl = 'data:image/png;base64,' + shot.toString('base64');

const res = await page.evaluate(
  async ({ dataUrl, VW, VH }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = VW;
    cv.height = VH;
    const c = cv.getContext('2d');
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, VW, VH).data;

    const at = (x, y) => {
      const i = (y * VW + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    const lum = (x, y) => {
      const [r, g, b] = at(x, y);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    // ---- 1) 探测盘心：找画面中央区域的「圆心对称点」 ----
    // 用简单办法：扫一条水平中线，找回字形亮暗分布的对称中心；
    // 更稳的是用盘面外缘（最亮的一圈）拟合。
    // 这里用「亮像素重心」作为初值，再用 8 向扫描精修。
    let sx = 0, sy = 0, sw = 0;
    for (let y = 0; y < VH; y += 2) {
      for (let x = 0; x < VW; x += 2) {
        const L = lum(x, y);
        if (L > 120) { sx += x * L; sy += y * L; sw += L; }
      }
    }
    let cx = sx / sw, cy = sy / sw;

    // 精修：在候选点附近找「最亮的圆周」（盘沿金边）
    let best = { r: 0, cx, cy, score: -1 };
    for (let dx = -12; dx <= 12; dx += 2) {
      for (let dy = -12; dy <= 12; dy += 2) {
        const px = cx + dx, py = cy + dy;
        for (let r = Math.min(VW, VH) * 0.28; r < Math.min(VW, VH) * 0.5; r += 1) {
          let s = 0, n = 0;
          for (let a = 0; a < 720; a++) {
            const th = (a / 720) * Math.PI * 2;
            const x = Math.round(px + Math.cos(th) * r);
            const y = Math.round(py + Math.sin(th) * r);
            if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
            s += lum(x, y);
            n++;
          }
          if (n < 400) continue;
          const avg = s / n;
          // 盘沿应「亮且连续」，加权半径让大圈略占优（外圈才是真盘沿）
          const sc = avg * (1 + r / (Math.min(VW, VH) * 0.5)) * 0.5;
          if (sc > best.score) best = { r, cx: px, cy: py, score: sc };
        }
      }
    }
    const R = best.r;
    cx = best.cx;
    cy = best.cy;

    // ---- 2) 径向剖面：按 r/R 分 200 箱，统计亮字像素占比 ----
    const NB = 200;
    const hit = new Float64Array(NB);
    const tot = new Float64Array(NB);
    const GOLD = (x, y) => {
      const L = lum(x, y);
      // 任意「够亮的文字像素」都算 —— 早先只判金色，把廿四山(#fff176/#ff8c69)、
      // 廿八宿(#4ade80/#67e8f9/#ff7875) 这些非金色字全漏掉了，误报「外三环无字」。
      return L > 105;
    };
    for (let a = 0; a < 2880; a++) {
      const th = (a / 2880) * Math.PI * 2;
      const dx = Math.cos(th), dy = Math.sin(th);
      for (let r = 2; r <= R; r += 1) {
        const x = Math.round(cx + dx * r);
        const y = Math.round(cy + dy * r);
        if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
        const bi = Math.min(NB - 1, Math.floor((r / R) * NB));
        tot[bi]++;
        if (GOLD(x, y)) hit[bi]++;
      }
    }

    const prof = [];
    for (let i = 0; i < NB; i++) {
      prof.push(tot[i] ? (hit[i] / tot[i]) * 100 : 0);
    }
    return { cx, cy, R, prof, VW, VH };
  },
  { dataUrl, VW, VH }
);

console.log(`\n盘心 (${res.cx.toFixed(1)}, ${res.cy.toFixed(1)})   盘半径 R = ${res.R.toFixed(1)} px`);
console.log(`盘面占屏：宽 ${((res.R * 2) / res.VW * 100).toFixed(1)}%  高 ${((res.R * 2) / res.VH * 100).toFixed(1)}%`);

// 环带系数（贴图 r0..r6 / maxR）—— 映射到屏幕 r/R
// 注意：贴图内容 maxR 与 3D 盘面几何 MAX_DIAL_RADIUS 是同一比例，
// 屏幕 R 对应贴图 maxR。
const coef = [0.25, 0.355, 0.515, 0.63, 0.79, 0.91, 1.0];
const names = ['天池边', '八卦环', '五行环', '节气环', '廿四山', '廿八宿', '周天环'];

console.log('\n各环带内「金色文字」占比（每带切 8 个子段，找层）：');
console.log('  ★ = 该子段占比显著高于带内均值 → 一个「文字层」');
for (let i = 0; i < coef.length - 1; i++) {
  const a = Math.floor(coef[i] * res.R);
  const b = Math.floor(coef[i + 1] * res.R);
  const subs = [];
  let bandSum = 0, bandN = 0;
  for (let k = a; k < b; k++) { bandSum += res.prof[k] ?? 0; bandN++; }
  const bandAvg = bandN ? bandSum / bandN : 0;
  const SUB = 8;
  for (let s = 0; s < SUB; s++) {
    const s0 = a + Math.floor(((b - a) * s) / SUB);
    const s1 = a + Math.floor(((b - a) * (s + 1)) / SUB);
    let sum = 0, n = 0;
    for (let k = s0; k < s1; k++) { sum += res.prof[k] ?? 0; n++; }
    const v = n ? sum / n : 0;
    subs.push(`${v.toFixed(1).padStart(5)}${v > bandAvg * 1.5 && v > 1.5 ? '★' : ' '}`);
  }
  console.log(
    `${names[i + 1].padEnd(6)} ${String(a).padStart(3)}~${String(b).padStart(3)}px  均${bandAvg.toFixed(1)}%  [${subs.join('|')}]`
  );
}

// 局部峰
console.log('\n径向剖面局部峰（每个峰≈一层内容）：');
const p = res.prof;
for (let i = 2; i < p.length - 2; i++) {
  const v = p[i];
  if (v > p[i - 1] && v > p[i + 1] && v > p[i - 2] && v > p[i + 2] && v > 3.0) {
    const rc = i / res.R;
    let band = '—';
    for (let k = 0; k < coef.length - 1; k++) if (rc >= coef[k] && rc < coef[k + 1]) band = names[k + 1];
    console.log(`  r/R=${rc.toFixed(3)}  ${(rc * res.R).toFixed(0).padStart(3)}px  峰 ${v.toFixed(1).padStart(5)}%  落于 ${band}`);
  }
}

await browser.close().catch(() => {});
