import * as THREE from 'three';
import { MOUNTAINS_24, MANSIONS_28, TRIGRAMS, FIVE_ELEMENTS } from '../data/taoData';
import { SOLAR_TERMS_24 } from '../data/taoCalendar';

/**
 * Procedural texture generator for authentic 3D Taoist Luopan components
 */

// Generate the central Tianchi (天池) Taiji Disc
export function createTianchiTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  // Background deep celestial lacquer
  const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 1.1);
  bgGrad.addColorStop(0, '#151a24');
  bgGrad.addColorStop(0.8, '#0b0e14');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer golden bronze rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#6b4f23';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Subtle concentric guide rings
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Taiji (太极双鱼图)
  ctx.save();
  ctx.translate(cx, cy);

  // Taiji S-curve Yin & Yang
  const taijiR = r * 0.58;

  // 1. Yang (Light/Gold) base half circle
  ctx.beginPath();
  ctx.arc(0, 0, taijiR, -Math.PI / 2, Math.PI / 2, false);
  ctx.fillStyle = '#e8dcb8';
  ctx.fill();

  // 2. Yin (Dark/Obsidian) base half circle
  ctx.beginPath();
  ctx.arc(0, 0, taijiR, Math.PI / 2, -Math.PI / 2, false);
  ctx.fillStyle = '#161920';
  ctx.fill();

  // 3. Yang small circle at top
  ctx.beginPath();
  ctx.arc(0, -taijiR / 2, taijiR / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#e8dcb8';
  ctx.fill();

  // 4. Yin small circle at bottom
  ctx.beginPath();
  ctx.arc(0, taijiR / 2, taijiR / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#161920';
  ctx.fill();

  // 5. Yin eye inside Yang top (Obsidian dot with gold halo)
  ctx.beginPath();
  ctx.arc(0, -taijiR / 2, taijiR * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#161920';
  ctx.fill();
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 6. Yang eye inside Yin bottom (Light dot with gold halo)
  ctx.beginPath();
  ctx.arc(0, taijiR / 2, taijiR * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#e8dcb8';
  ctx.fill();
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Boundary ring around Taiji
  ctx.beginPath();
  ctx.arc(0, 0, taijiR, 0, Math.PI * 2);
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();

  // Traditional Tianxin Red Crosshairs (天心十道)
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.95);
  ctx.lineTo(cx, cy + r * 0.95);
  ctx.moveTo(cx - r * 0.95, cy);
  ctx.lineTo(cx + r * 0.95, cy);
  ctx.stroke();

  // Cardinal markers (南/北/东/西) with high-contrast outlines
  ctx.font = 'bold 38px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const drawCardinal = (char: string, x: number, y: number, color: string) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(char, x, y);
    ctx.fillStyle = color;
    ctx.fillText(char, x, y);
  };

  drawCardinal('北', cx, cy - r * 0.84, '#67e8f9'); // Cyan North (子)
  drawCardinal('南', cx, cy + r * 0.84, '#ff6b6b'); // Vermilion South (午)
  drawCardinal('东', cx + r * 0.84, cy, '#4ade80'); // Green East (卯)
  drawCardinal('西', cx - r * 0.84, cy, '#ffffff'); // White West (酉)

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// High-contrast text helper ensuring crisp, vivid readability against metallic dark backgrounds
function drawRingText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  fillColor: string,
  outlineColor = '#000000',
  outlineWidth = 4.5
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // Dimensional dark shadow for maximum legibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  // Solid dark background stroke
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = outlineWidth;
  ctx.strokeText(text, x, y);

  // Vivid luminous foreground fill
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Generate the Main Dial with concentric rings: Bagua, Wu Xing, 24 Mountains, 28 Mansions
export function createCompassDialTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.485;

  // Background antique cinnabar & bronze lacquer with clearer contrast
  const bgGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, maxR);
  bgGrad.addColorStop(0, '#16120e');
  bgGrad.addColorStop(0.35, '#201610');
  bgGrad.addColorStop(0.7, '#1a120c');
  bgGrad.addColorStop(1, '#0e0906');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Concentric ring radii
  const r0 = maxR * 0.25; // Inner edge (surrounds Tianchi)
  const r1 = maxR * 0.38; // Ring 1: Bagua (八卦)
  const r2 = maxR * 0.49; // Ring 2: Wu Xing (五行气数)
  const r3 = maxR * 0.63; // Ring 3: 道历二十四节气环 (24 Solar Terms)
  const r4 = maxR * 0.79; // Ring 4: 24 Mountains (二十四山天向)
  const r5 = maxR * 0.91; // Ring 5: 28 Mansions (二十八星宿天纬)
  const r6 = maxR * 1.0;  // Ring 6: 360 Degree scale & 道历天铭

  const rings = [r0, r1, r2, r3, r4, r5, r6];

  const drawRingBorder = (r: number, color = '#c5a059', width = 3) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  rings.forEach((r, idx) => {
    drawRingBorder(r, idx === 0 || idx === rings.length - 1 ? '#ffd54f' : '#b8944d', idx === rings.length - 1 ? 5 : 2.5);
  });

  // ========== RING 1: EARLY HEAVEN & LATER HEAVEN BAGUA (r0 to r1) ==========
  const baguaCount = 8;
  for (let i = 0; i < baguaCount; i++) {
    const angle = (i * Math.PI * 2) / baguaCount - Math.PI / 2;
    const midR = (r0 + r1) / 2;
    const item = TRIGRAMS[i];

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle - Math.PI / 8) * r0, cy + Math.sin(angle - Math.PI / 8) * r0);
    ctx.lineTo(cx + Math.cos(angle - Math.PI / 8) * r1, cy + Math.sin(angle - Math.PI / 8) * r1);
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx + Math.cos(angle) * midR, cy + Math.sin(angle) * midR);
    ctx.rotate(angle + Math.PI / 2);

    // Trigram character (enlarged & high-contrast)
    drawRingText(ctx, item.name, 0, -20, 'bold 44px "Noto Serif SC", serif', '#fff8e1', '#000000', 4.5);

    // 3 Yao lines
    const yaoW = 44;
    const yaoH = 5.5;
    const yaoGap = 6;
    const yaoStartY = 4;

    for (let y = 0; y < 3; y++) {
      const isYang = item.yao[y];
      const lineY = yaoStartY + y * (yaoH + yaoGap);

      if (isYang) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(-yaoW / 2 - 1, lineY - 1, yaoW + 2, yaoH + 2);
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(-yaoW / 2, lineY, yaoW, yaoH);
      } else {
        const halfW = (yaoW - 9) / 2;
        ctx.fillStyle = '#000000';
        ctx.fillRect(-yaoW / 2 - 1, lineY - 1, halfW + 2, yaoH + 2);
        ctx.fillRect(-yaoW / 2 + halfW + 9 - 1, lineY - 1, halfW + 2, yaoH + 2);
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(-yaoW / 2, lineY, halfW, yaoH);
        ctx.fillRect(-yaoW / 2 + halfW + 9, lineY, halfW, yaoH);
      }
    }

    ctx.restore();
  }

  // ========== RING 2: FIVE ELEMENTS (五行气数) (r1 to r2) ==========
  const elementKeys = ['wood', 'fire', 'earth', 'metal', 'water'];
  const elemCount = elementKeys.length;
  for (let i = 0; i < elemCount; i++) {
    const startA = (i * Math.PI * 2) / elemCount - Math.PI / 2;
    const endA = ((i + 1) * Math.PI * 2) / elemCount - Math.PI / 2;
    const midA = (startA + endA) / 2;
    const midR = (r1 + r2) / 2;
    const elem = FIVE_ELEMENTS[elementKeys[i]];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r2, startA, endA);
    ctx.arc(cx, cy, r1, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = elem.id === 'fire' ? 'rgba(239, 68, 68, 0.16)' :
                    elem.id === 'water' ? 'rgba(56, 189, 248, 0.16)' :
                    elem.id === 'wood' ? 'rgba(52, 211, 153, 0.16)' :
                    elem.id === 'metal' ? 'rgba(248, 250, 252, 0.16)' :
                    'rgba(245, 158, 11, 0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cx + Math.cos(midA) * midR, cy + Math.sin(midA) * midR);
    ctx.rotate(midA + Math.PI / 2);

    const vividElemColor = elem.id === 'wood' ? '#4ade80' :
                           elem.id === 'fire' ? '#ff4d4f' :
                           elem.id === 'earth' ? '#facc15' :
                           elem.id === 'metal' ? '#ffffff' : '#38bdf8';

    drawRingText(ctx, elem.name, 0, -12, 'bold 42px "Ma Shan Zheng", "Noto Serif SC", serif', vividElemColor, '#000000', 4.5);
    drawRingText(ctx, elem.season, 0, 16, 'bold 16px "Noto Serif SC", serif', '#fffbeb', '#000000', 3.0);

    ctx.restore();
  }

  // ========== RING 3: 道历二十四节气同心环 (24 Solar Terms with Four Seasons colors) (r2 to r3) ==========
  const termCount = SOLAR_TERMS_24.length;
  for (let i = 0; i < termCount; i++) {
    const item = SOLAR_TERMS_24[i];
    const angle = (item.angle * Math.PI) / 180 - Math.PI / 2;
    const stepA = (Math.PI * 2) / termCount;
    const midR = (r2 + r3) / 2;

    const divA = angle - stepA / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(divA) * r2, cy + Math.sin(divA) * r2);
    ctx.lineTo(cx + Math.cos(divA) * r3, cy + Math.sin(divA) * r3);
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx + Math.cos(angle) * midR, cy + Math.sin(angle) * midR);
    ctx.rotate(angle + Math.PI / 2);

    // Color corresponding to seasonal phase (春翠/夏赤/秋金/冬蓝) with brilliant contrast
    const termColor = item.season === '春' ? '#4ade80' :
                      item.season === '夏' ? '#ff7875' :
                      item.season === '秋' ? '#fde047' : '#60a5fa';

    // Solstices & Equinoxes prominent star highlight
    const isMajorCardinalTerm = ['冬至', '夏至', '春分', '秋分', '立春', '立夏', '立秋', '立冬'].includes(item.name);
    const displayName = isMajorCardinalTerm ? `·${item.name}·` : item.name;

    drawRingText(ctx, displayName, 0, 0, 'bold 31px "Noto Serif SC", serif', termColor, '#000000', 4.5);

    ctx.restore();
  }

  // ========== RING 4: 24 MOUNTAINS (二十四山 - 大字高对比度) (r3 to r4) ==========
  const mountCount = MOUNTAINS_24.length;
  for (let i = 0; i < mountCount; i++) {
    const item = MOUNTAINS_24[i];
    const angle = (item.angle * Math.PI) / 180 - Math.PI / 2;
    const stepA = (Math.PI * 2) / mountCount;
    const midR = (r3 + r4) / 2;

    const divA = angle - stepA / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(divA) * r3, cy + Math.sin(divA) * r3);
    ctx.lineTo(cx + Math.cos(divA) * r4, cy + Math.sin(divA) * r4);
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx + Math.cos(angle) * midR, cy + Math.sin(angle) * midR);
    ctx.rotate(angle + Math.PI / 2);

    // Yang Mountains: Luminous Vermilion Coral #ff8c69; Yin Mountains: Pure Imperial Gold #fff176
    const isYangMountain = ['甲','庚','丙','壬','乾','坤','艮','巽','寅','申','巳','亥'].includes(item.name);
    const mountColor = isYangMountain ? '#ff8c69' : '#fff176';

    drawRingText(ctx, item.name, 0, 0, 'bold 42px "Noto Serif SC", serif', mountColor, '#000000', 5.0);

    ctx.restore();
  }

  // ========== RING 5: 28 LUNAR MANSIONS (二十八宿 - 高对比度明亮色) (r4 to r5) ==========
  const manCount = MANSIONS_28.length;
  for (let i = 0; i < manCount; i++) {
    const item = MANSIONS_28[i];
    const angle = (i * Math.PI * 2) / manCount - Math.PI / 2;
    const stepA = (Math.PI * 2) / manCount;
    const midR = (r4 + r5) / 2;

    const divA = angle - stepA / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(divA) * r4, cy + Math.sin(divA) * r4);
    ctx.lineTo(cx + Math.cos(divA) * r5, cy + Math.sin(divA) * r5);
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx + Math.cos(angle) * midR, cy + Math.sin(angle) * midR);
    ctx.rotate(angle + Math.PI / 2);

    const vividMansionColor = item.beast === '青龙' ? '#4ade80' :
                              item.beast === '玄武' ? '#67e8f9' :
                              item.beast === '白虎' ? '#ffffff' : '#ff7875';

    drawRingText(ctx, item.name, 0, 0, 'bold 31px "Noto Serif SC", serif', vividMansionColor, '#000000', 4.2);

    ctx.restore();
  }

  // ========== RING 6: 360 DEGREES & 道历天铭 (周天度数与轩辕黄帝纪元铭文) (r5 to r6) ==========
  for (let d = 0; d < 360; d++) {
    const rad = (d * Math.PI) / 180 - Math.PI / 2;
    const isMajor = d % 10 === 0;
    const isFive = d % 5 === 0;
    const tickLen = isMajor ? (r6 - r5) * 0.70 : isFive ? (r6 - r5) * 0.42 : (r6 - r5) * 0.22;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * (r6 - tickLen), cy + Math.sin(rad) * (r6 - tickLen));
    ctx.lineTo(cx + Math.cos(rad) * r6, cy + Math.sin(rad) * r6);
    ctx.strokeStyle = isMajor ? '#ffd54f' : 'rgba(218, 165, 32, 0.6)';
    ctx.lineWidth = isMajor ? 3 : 1.2;
    ctx.stroke();

    if (isMajor && d % 30 === 0) {
      ctx.save();
      const textR = r5 + (r6 - r5) * 0.30;
      ctx.translate(cx + Math.cos(rad) * textR, cy + Math.sin(rad) * textR);
      ctx.rotate(rad + Math.PI / 2);
      drawRingText(ctx, `${d}°`, 0, 0, 'bold 20px "Cinzel", monospace', '#ffe082', '#000000', 3.0);
      ctx.restore();
    }
  }

  // Outer Edge Taoist Calendar Inscription Ring (外圈道历黄帝纪元天铭)
  const taoistInscription = '道历开元四千七百二十三年 · 岁次丙午 · 赤马当令 · 轩辕黄帝纪历 · 周天三百六十五度 · 天运乾坤';
  const insChars = taoistInscription.split('');
  const insLen = insChars.length;
  const insR = r6 - 13;
  const arcSpan = Math.PI * 1.6; // span across arc
  const startInsAngle = -Math.PI / 2 - arcSpan / 2;

  for (let k = 0; k < insLen; k++) {
    const charA = startInsAngle + (k / (insLen - 1)) * arcSpan;
    ctx.save();
    ctx.translate(cx + Math.cos(charA) * insR, cy + Math.sin(charA) * insR);
    ctx.rotate(charA + Math.PI / 2);
    drawRingText(ctx, insChars[k], 0, 0, 'bold 18px "Noto Serif SC", serif', '#ffd54f', '#000000', 3.5);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

/**
 * Procedural Vector Little Seal Script (小篆) character renderer for the four corner gates (四维: 巽、坤、艮、乾)
 */
function drawSealCharacter(
  ctx: CanvasRenderingContext2D,
  charName: '巽' | '坤' | '艮' | '乾',
  cx: number,
  cy: number,
  boxSize: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // 1. Antique Red & Gold Lacquer Seal Plate with richer vermilion cinnabar
  const half = boxSize / 2;
  const sealGrad = ctx.createRadialGradient(0, 0, half * 0.2, 0, 0, half * 1.3);
  sealGrad.addColorStop(0, '#8b231c');
  sealGrad.addColorStop(0.7, '#521410');
  sealGrad.addColorStop(1, '#2c0a07');
  ctx.fillStyle = sealGrad;
  ctx.fillRect(-half, -half, boxSize, boxSize);

  // Double gold borders for ancient Han bronze seal (汉印重规)
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 4.5;
  ctx.strokeRect(-half + 3, -half + 3, boxSize - 6, boxSize - 6);

  ctx.strokeStyle = 'rgba(255, 213, 79, 0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-half + 9, -half + 9, boxSize - 18, boxSize - 18);

  // Four corner brackets
  ctx.fillStyle = '#ffd54f';
  [[-half + 6, -half + 6], [half - 6, -half + 6], [-half + 6, half - 6], [half - 6, half - 6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Vector Little Seal Script (小篆) Inscription Strokes (Bold, luminous gold with engraving shadow)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1.5;
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const s = boxSize * 0.32; // stroke scale

  if (charName === '巽') {
    // 小篆「巽」: 上部双己并立，下部丌
    // Left 己
    ctx.beginPath();
    ctx.arc(-s * 0.38, -s * 0.55, s * 0.22, Math.PI * 1.1, 0, false);
    ctx.lineTo(-s * 0.16, -s * 0.2);
    ctx.arc(-s * 0.38, -s * 0.1, s * 0.22, 0, Math.PI * 0.9, false);
    ctx.stroke();

    // Right 己
    ctx.beginPath();
    ctx.arc(s * 0.38, -s * 0.55, s * 0.22, Math.PI * 1.1, 0, false);
    ctx.lineTo(s * 0.6, -s * 0.2);
    ctx.arc(s * 0.38, -s * 0.1, s * 0.22, 0, Math.PI * 0.9, false);
    ctx.stroke();

    // Bottom 丌
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, s * 0.22);
    ctx.lineTo(s * 0.75, s * 0.22);
    ctx.moveTo(-s * 0.35, s * 0.22);
    ctx.lineTo(-s * 0.35, s * 0.85);
    ctx.moveTo(s * 0.35, s * 0.22);
    ctx.lineTo(s * 0.35, s * 0.85);
    ctx.stroke();
  } else if (charName === '坤') {
    // 小篆「坤」: 左土，右申
    // Left 土
    ctx.beginPath();
    ctx.moveTo(-s * 0.52, -s * 0.7);
    ctx.lineTo(-s * 0.52, s * 0.75);
    ctx.moveTo(-s * 0.78, -s * 0.25);
    ctx.lineTo(-s * 0.26, -s * 0.25);
    ctx.moveTo(-s * 0.82, s * 0.75);
    ctx.lineTo(-s * 0.22, s * 0.75);
    ctx.stroke();

    // Right 申
    ctx.beginPath();
    ctx.moveTo(s * 0.45, -s * 0.85);
    ctx.lineTo(s * 0.45, s * 0.85);
    ctx.stroke();

    // Rounded rectangle for 申 body
    ctx.beginPath();
    ctx.roundRect(s * 0.15, -s * 0.45, s * 0.6, s * 0.9, 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(s * 0.15, 0);
    ctx.lineTo(s * 0.75, 0);
    ctx.stroke();
  } else if (charName === '艮') {
    // 小篆「艮」: 上目，下反曲足
    // Top 目
    ctx.beginPath();
    ctx.roundRect(-s * 0.45, -s * 0.85, s * 0.9, s * 0.9, 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.55);
    ctx.lineTo(s * 0.45, -s * 0.55);
    ctx.moveTo(-s * 0.45, -s * 0.25);
    ctx.lineTo(s * 0.45, -s * 0.25);
    ctx.stroke();

    // Bottom legs (spreading symmetrical curves)
    ctx.beginPath();
    ctx.moveTo(0, 0.05);
    ctx.lineTo(0, s * 0.45);
    ctx.arc(-s * 0.35, s * 0.55, s * 0.35, 0, Math.PI * 0.6, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, s * 0.45);
    ctx.arc(s * 0.35, s * 0.55, s * 0.35, Math.PI, Math.PI * 0.4, true);
    ctx.stroke();
  } else if (charName === '乾') {
    // 小篆「乾」: 左十日十，右乞
    // Left: 十日十 (倝之偏旁)
    ctx.beginPath();
    ctx.moveTo(-s * 0.48, -s * 0.85);
    ctx.lineTo(-s * 0.48, s * 0.85);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.75, -s * 0.55);
    ctx.lineTo(-s * 0.22, -s * 0.55);
    ctx.stroke();

    // Center circular/oval sun
    ctx.beginPath();
    ctx.arc(-s * 0.48, -s * 0.05, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.76, s * 0.52);
    ctx.lineTo(-s * 0.2, s * 0.52);
    ctx.stroke();

    // Right: 乞 (curved graceful hook)
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.75);
    ctx.lineTo(s * 0.62, -s * 0.75);
    ctx.arc(s * 0.42, -s * 0.35, s * 0.2, Math.PI * 1.5, Math.PI * 0.5, true);
    ctx.lineTo(s * 0.25, s * 0.25);
    ctx.arc(s * 0.48, s * 0.55, s * 0.24, Math.PI * 1.1, 0, false);
    ctx.lineTo(s * 0.72, s * 0.35);
    ctx.stroke();
  }

  ctx.restore();
}

// Generate the Square Earth Base Plate ("地盘方台") texture with authentic Seal Script Four Corners (四维: 巽、坤、艮、乾)
export function createEarthBaseTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Antique aged rosewood / dark ebony lacquer gradient
  const grad = ctx.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, '#22150f');
  grad.addColorStop(0.7, '#150c08');
  grad.addColorStop(1, '#0b0604');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Outer gold borders and auspicious framing
  ctx.strokeStyle = '#c5a059';
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, size - 60, size - 60);

  ctx.strokeStyle = 'rgba(197, 160, 89, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, size - 96, size - 96);

  // Authentic Qin Little Seal Script (小篆) Four Dimensions (四维方位方印)
  // 西北: 乾(天门), 东北: 艮(鬼门), 西南: 坤(人门), 东南: 巽(风门)
  const sealBoxSize = 92;
  const inset = 96;

  // 1. Top-Left: 西北 · 乾 (Qian - 天门)
  drawSealCharacter(ctx, '乾', inset, inset, sealBoxSize);

  // 2. Top-Right: 东北 · 艮 (Gen - 鬼门)
  drawSealCharacter(ctx, '艮', size - inset, inset, sealBoxSize);

  // 3. Bottom-Left: 西南 · 坤 (Kun - 人门)
  drawSealCharacter(ctx, '坤', inset, size - inset, sealBoxSize);

  // 4. Bottom-Right: 东南 · 巽 (Xun - 风门)
  drawSealCharacter(ctx, '巽', size - inset, size - inset, sealBoxSize);

  // High-contrast corner captions below/beside seals
  drawRingText(ctx, '乾 · 西北天门', inset, inset + sealBoxSize / 2 + 22, 'bold 18px "Noto Serif SC", serif', '#ffd54f', '#000000', 3.5);
  drawRingText(ctx, '艮 · 东北鬼门', size - inset, inset + sealBoxSize / 2 + 22, 'bold 18px "Noto Serif SC", serif', '#ffd54f', '#000000', 3.5);
  drawRingText(ctx, '坤 · 西南人门', inset, size - inset - sealBoxSize / 2 - 16, 'bold 18px "Noto Serif SC", serif', '#ffd54f', '#000000', 3.5);
  drawRingText(ctx, '巽 · 东南风门', size - inset, size - inset - sealBoxSize / 2 - 16, 'bold 18px "Noto Serif SC", serif', '#ffd54f', '#000000', 3.5);

  // Circular guide ring where the circular dial rotates
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.4)';
  ctx.lineWidth = 4;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}
