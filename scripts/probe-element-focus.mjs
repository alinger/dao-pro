/**
 * 验证「五行环元素聚焦」：选中某一元素后，该元素色块保留、其余消失。
 * 判据：五行环带内，各元素代表色（木绿/火红/土黄/金白/水蓝）的像素占比变化。
 */
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const mod = await import('/src/utils/textureGenerator.ts');
  const sample = (spec) => {
    const tex = mod.createCompassDialTexture(spec);
    const src = tex.image, size = src.width, cx = size/2, cy = size/2, maxR = size*0.485;
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const d = g.getImageData(0,0,size,size).data;
    // 五行环带 0.355~0.515
    const hueCount = { green:0, red:0, yellow:0, white:0, blue:0, other:0 };
    let n=0;
    for (let y=0;y<size;y+=2) for (let x=0;x<size;x+=2) {
      const rr = Math.hypot(x-cx,y-cy)/maxR;
      if (rr<0.355 || rr>=0.515) continue;
      const i=(y*size+x)*4, R=d[i],G=d[i+1],B=d[i+2];
      const mx=Math.max(R,G,B), mn=Math.min(R,G,B);
      if (mx<48) { n++; continue; }
      const sat=mx===0?0:(mx-mn)/mx;
      if (sat>0.25 && G>=R && G>=B) hueCount.green++;
      else if (sat>0.25 && R>G && R>B && G<B*1.3) hueCount.red++;
      else if (sat>0.25 && R>=G && G>B) hueCount.yellow++;
      else if (sat<0.2 && mx>120) hueCount.white++;
      else if (sat>0.2 && B>R && B>=G) hueCount.blue++;
      else hueCount.other++;
      n++;
    }
    const pct = {}; for (const k in hueCount) pct[k]=+(100*hueCount[k]/n).toFixed(1);
    return { pct, total: n };
  };
  return {
    all:   sample(mod.DIAL_HIGHLIGHTS.elements),
    wood:  sample({ ...mod.DIAL_HIGHLIGHTS.elements, focusElements:['wood'] }),
    fire:  sample({ ...mod.DIAL_HIGHLIGHTS.elements, focusElements:['fire'] }),
    metal: sample({ ...mod.DIAL_HIGHLIGHTS.elements, focusElements:['metal'] }),
  };
});
console.log('五行环带内各色像素占比 (%)\n');
console.log('case'.padEnd(8) + ['green','red','yellow','white','blue','other'].map(s=>s.padStart(9)).join(''));
for (const [k,v] of Object.entries(r)) {
  console.log(k.padEnd(8) + ['green','red','yellow','white','blue','other'].map(s=>String(v.pct[s]).padStart(9)).join(''));
}
await browser.close();
