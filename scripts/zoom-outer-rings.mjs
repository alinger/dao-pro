/**
 * 放大裁剪：只裁外三环（廿四山 / 廿八宿 / 周天），2.5 倍放大。
 * 用法: node scripts/zoom-outer-rings.mjs
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const SRC = process.env.SRC || 'F:/gitcode/dao-pro/out-clean.png';
const OUTNAME = process.env.OUTNAME || 'F:/gitcode/dao-pro/out-zoom-outer.png';
// 裁剪区域（用户截图坐标系）：盘面右上外环
const X0 = Number(process.env.X0 || 300), Y0 = Number(process.env.Y0 || 60);
const X1 = Number(process.env.X1 || 700), Y1 = Number(process.env.Y1 || 360);
const S = Number(process.env.S || 2.4);

const buf = fs.readFileSync(SRC);
function dec(b) {
  let o = 8, w = 0, h = 0, ct = 0; const id = [];
  while (o < b.length) {
    const l = b.readUInt32BE(o); const t = b.toString('ascii', o + 4, o + 8);
    const d = b.subarray(o + 8, o + 8 + l);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') id.push(d); else if (t === 'IEND') break;
    o += 12 + l;
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(id));
  const st = w * ch; const out = Buffer.alloc(w * h * ch);
  let pv = Buffer.alloc(st), p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++]; const ln = raw.subarray(p, p + st); p += st;
    const cu = Buffer.alloc(st);
    for (let x = 0; x < st; x++) {
      const a = x >= ch ? cu[x - ch] : 0, bb = pv[x], c = x >= ch ? pv[x - ch] : 0;
      let v = ln[x];
      if (f === 1) v += a; else if (f === 2) v += bb;
      else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cu[x] = v & 255;
    }
    cu.copy(out, y * st); pv = cu;
  }
  return { w, h, ch, px: out };
}
let T = null;
function crc(b) {
  if (!T) { T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function enc(w, h, px, ch) {
  const st = w * ch; const raw = Buffer.alloc((st + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (st + 1)] = 0; px.copy(raw, y * (st + 1) + 1, y * st, (y + 1) * st); }
  const id = zlib.deflateSync(raw);
  const mk = (t, d) => { const L = Buffer.alloc(4); L.writeUInt32BE(d.length); const tt = Buffer.from(t); const cc = Buffer.alloc(4); cc.writeUInt32BE(crc(Buffer.concat([tt, d]))); return Buffer.concat([L, tt, d, cc]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = ch === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mk('IHDR', ih), mk('IDAT', id), mk('IEND', Buffer.alloc(0))]);
}

const { w, h, ch, px } = dec(buf);
const cw = X1 - X0, chh = Y1 - Y0;
const out = Buffer.alloc(cw * chh * ch);
for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
  const sx = X0 + x, sy = Y0 + y;
  for (let k = 0; k < ch; k++) out[(y * cw + x) * ch + k] = px[(sy * w + sx) * ch + k];
}
const ZW = Math.round(cw * S), ZH = Math.round(chh * S);
const zo = Buffer.alloc(ZW * ZH * ch);
for (let y = 0; y < ZH; y++) for (let x = 0; x < ZW; x++) {
  const sx = Math.min(cw - 1, Math.floor(x / S)), sy = Math.min(chh - 1, Math.floor(y / S));
  for (let k = 0; k < ch; k++) zo[(y * ZW + x) * ch + k] = out[(sy * cw + sx) * ch + k];
}
fs.writeFileSync(OUTNAME, enc(ZW, ZH, zo, ch));
console.log(`裁 (${X0},${Y0})-(${X1},${Y1}) ×${S} → ${OUTNAME} (${ZW}x${ZH})`);
