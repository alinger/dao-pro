/**
 * 逐环核验：从贴图 PNG 里按「半径带」统计文字像素分布，
 * 判定每个环带内到底住了几层内容。
 *
 * 判据：把 2048 贴图按极坐标展开（θ × r），在每个 r 上统计非背景像素占比。
 * 若某个环带内出现多个「密度峰」，说明该带混入了邻环内容。
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const file = path.resolve(process.cwd(), 'out-tex-dial-raw.png');
const buf = fs.readFileSync(file);

// ---- 极简 PNG 解码（8-bit RGBA / RGB，filter 0-4） ----
function decodePNG(buf) {
  let off = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('expect 8-bit, got ' + bitDepth);
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 4;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, ch, px: out };
}

const { w, h, ch, px } = decodePNG(buf);
console.log(`PNG ${w}x${h} ch=${ch}`);

const cx = w / 2, cy = h / 2;
const maxR = w * 0.485;

// 背景：采样每个半径下的「最常见亮度」作为基线
function lumAt(x, y) {
  const i = (y * w + x) * ch;
  return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
}

// 在极坐标下扫描：每个 R（相对 maxR 的系数）统计「亮像素」比例
const NBINS = 400;
const bins = new Float64Array(NBINS);
const counts = new Float64Array(NBINS);
const ANGLES = 1440;

for (let a = 0; a < ANGLES; a++) {
  const th = (a / ANGLES) * Math.PI * 2;
  const dx = Math.cos(th), dy = Math.sin(th);
  for (let r = 0; r < maxR; r += 1) {
    const x = Math.round(cx + dx * r);
    const y = Math.round(cy + dy * r);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const L = lumAt(x, y);
    const bi = Math.min(NBINS - 1, Math.floor((r / maxR) * NBINS));
    counts[bi]++;
    if (L > 150) bins[bi]++;   // 亮文字像素
  }
}

const coef = [0.25, 0.355, 0.515, 0.63, 0.79, 0.91, 1.0];
const names = ['R0 天池边', 'R1 八卦', 'R2 五行', 'R3 节气', 'R4 廿四山', 'R5 廿八宿', 'R6 周天'];

console.log('\n半径带内「亮文字」占比（按 20 个细分子带切分，用于找层）：');
for (let i = 0; i < coef.length - 1; i++) {
  const a = Math.floor(coef[i] * NBINS);
  const b = Math.floor(coef[i + 1] * NBINS);
  const n = b - a;
  const SUB = 8;
  const parts = [];
  for (let s = 0; s < SUB; s++) {
    const s0 = a + Math.floor((s * n) / SUB);
    const s1 = a + Math.floor(((s + 1) * n) / SUB);
    let sum = 0, cnt = 0;
    for (let k = s0; k < s1; k++) { sum += bins[k]; cnt += counts[k]; }
    const v = cnt ? (sum / cnt) * 100 : 0;
    parts.push(`${v.toFixed(1).padStart(5)}`);
  }
  const rA = (coef[i] * maxR).toFixed(0), rB = (coef[i + 1] * maxR).toFixed(0);
  console.log(
    `${names[i + 1].padEnd(9)} r=${rA.padStart(4)}~${rB.padStart(4)}px (宽 ${(Number(rB) - Number(rA)).toString().padStart(3)})  ` +
    `细分8段亮字率: ${parts.join(' | ')}`
  );
}

// 找「亮字率」曲线的局部峰，标出它们各自的半径
console.log('\n亮字率曲线局部峰（可能代表「一层内容」）：');
const smooth = new Float64Array(NBINS);
for (let i = 1; i < NBINS - 1; i++) smooth[i] = (bins[i - 1] + 2 * bins[i] + bins[i + 1]) / (counts[i] * 4 + 1e-9);
for (let i = 2; i < NBINS - 2; i++) {
  const v = smooth[i];
  if (v > smooth[i - 1] && v > smooth[i + 1] && v > smooth[i - 2] && v > smooth[i + 2] && v > 0.05) {
    console.log(`  r=${(i / NBINS * maxR).toFixed(0).padStart(4)}px  系数 ${(i / NBINS).toFixed(3)}  峰值 ${(v * 100).toFixed(1)}%`);
  }
}
