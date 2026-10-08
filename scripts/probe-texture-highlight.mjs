/**
 * 直接在 Node 里烘焙贴图，量各环带的实际亮度（绕开 3D 光照/相机干扰）。
 * 用 jsdom-free 的方式：canvas 用 node-canvas 不可用 → 改在浏览器里跑。
 */
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const specs = {
    'none(总览)': undefined,
    'elements(五行)': mod.DIAL_HIGHLIGHTS.elements,
    'bagua(八卦)': mod.DIAL_HIGHLIGHTS.bagua,
  };
  const out = {};
  for (const [k, spec] of Object.entries(specs)) {
    const tex = mod.createCompassDialTexture(spec);
    const src = tex.image;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const size = src.width, cx = size/2, cy = size/2, maxR = size*0.485;
    const bands = { R1:[0.25,0.355], R2:[0.355,0.515], R3:[0.515,0.63], R4:[0.63,0.79], R5:[0.79,0.91], R6:[0.91,1.0] };
    const res = {};
    for (const [bn,[lo,hi]] of Object.entries(bands)) {
      const d = g.getImageData(0,0,size,size).data;
      let s=0,n=0;
      for (let y=0;y<size;y+=3) for (let x=0;x<size;x+=3) {
        const r0 = Math.hypot(x-cx,y-cy)/maxR;
        if (r0>=lo && r0<hi) { const i=(y*size+x)*4; s += 0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]; n++; }
      }
      res[bn] = n ? s/n : 0;
    }
    out[k] = res;
  }
  return out;
});
console.log('贴图环带平均亮度（0~255）\n');
const bands = ['R1','R2','R3','R4','R5','R6'];
console.log('band'.padEnd(6) + Object.keys(r).map(k=>k.padStart(16)).join(''));
for (const b of bands) {
  console.log(b.padEnd(6) + Object.entries(r).map(([,v])=>v[b].toFixed(1).padStart(16)).join(''));
}
await browser.close();
