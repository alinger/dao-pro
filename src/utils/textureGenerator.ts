import * as THREE from 'three';
import { MOUNTAINS_24, MANSIONS_28, TRIGRAMS, FIVE_ELEMENTS } from '../data/taoData';
import { WUXING_ARCS, isMainArc, isSatelliteArc } from './wuxingArc';
import { SOLAR_TERMS_24 } from '../data/taoCalendar';

/**
 * Procedural texture generator for authentic 3D Taoist Luopan components
 */

/**
 * ★ 盘面「聚光」规格 —— 让每个视角模式拥有真实的画面差异。
 *
 * 背景：`viewMode` 原先只影响相机位置与铜环显隐，其中「五行生克」「八卦推演」
 * 直接落到 else 兜底分支，与「天元总览」的镜头完全一致 →
 * 用户反馈「顶部的菜单好像区别不大」。
 *
 * 这里给出第二维差异：**盘面本身的图层聚光**。
 * 做法是重新烘焙一整张 2048 盘面贴图（不是叠一个遮罩层 —— 遮罩会透出
 * 盘底 earthBaseTex 的棕褐色，形成刺眼的异色环，见 drawRingBorder 注释里
 * 同类教训），把与当前模式无关的环整体降亮、压暗，只留目标环满亮。
 */
export interface DialHighlight {
  /** 满亮保留的环索引（0..6，对应 r0..r6 之间的 6 条环带） */
  keep: readonly number[];
  /** 保留环的额外提亮系数（1 = 不提亮） */
  keepBoost?: number;
  /** 压暗环的亮度系数（0 = 全黑，1 = 原样） */
  dimFactor: number;
  /**
   * 五行环内只突出这些五行（其余五行色块降到 dimFactor）。
   * 未指定则五行环整体按 keep 规则处理。
   */
  focusElements?: readonly string[];
  /** 八卦环内只突出这些卦（按 id） */
  focusTrigrams?: readonly string[];
}

/** 各视角模式的盘面聚光规格；未列出的模式（天元总览/阴阳吐纳等）不聚光。 */
export const DIAL_HIGHLIGHTS: Record<string, DialHighlight> = {
  /**
   * 五行生克：点亮 RING2 五行环（含 RING3 节气环，作为五行「时节」的延伸），
   * 压暗八卦 / 廿四山 / 廿八宿 / 周天。
   * 同时把环带整体提亮到 1.28 倍 —— 五行色块本身就偏淡（alpha 0.42），
   * 不额外提亮的话「点亮」的观感不够。
   */
  elements: {
    keep: [1, 2],
    keepBoost: 1.28,
    dimFactor: 0.3,
  },
  /**
   * 八卦推演：点亮 RING1 八卦环，压暗其余全部。
   * 八卦环只有 104px 宽，是最容易被忽略的一环；这里不提亮只压暗，
   * 靠「周围全暗」的对比把它顶出来，避免提亮后金色爻线过曝。
   */
  bagua: {
    keep: [0],
    keepBoost: 1.16,
    dimFactor: 0.24,
  },
  /**
   * 分层透视：同样是五环全保留，但把五行环做轻度聚焦，
   * 强调「环与环是分离的层次」而不是某一层的内容。
   */
  exploded: {
    keep: [0, 1, 2, 3, 4, 5],
    dimFactor: 0.62,
  },
};

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
export function createCompassDialTexture(highlight?: DialHighlight): THREE.CanvasTexture {
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
  const r1 = maxR * 0.355; // Ring 1: Bagua (八卦) —— 因 RING2 加宽而由 0.38 内收
  const r2 = maxR * 0.515; // Ring 2: Wu Xing (五行气数) —— 由 0.38~0.49 加宽到 0.355~0.515
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

  /**
   * ★ 环边界线的画法（本轮第四轮重构）。
   *
   * 历史问题：7 条边界线全部用 2.5px 实线 `#b8944d` 绘制，
   * 相当于在盘面上刻了 7 道完整圆周线，把盘面切成 7 个封闭条带。
   * 后果（用户反复反馈了四轮）：
   *   - 亮米黄的五行动词/季字紧贴这些线 → 字被线"压边"，读成"文字显示不完整"；
   *   - 相邻环的分隔竖线角度不同（五行 10 段 vs 节气 24 格，错开 7.5°），
   *     在环边界处形成 Z 形错位 →
   *     用户原话「圆环还是定位有问题，不属于同一圆环的内容被切到一个圆环了」；
   *   - 尤其是 r2（五行外沿 / 节气内沿），它同时是五行色块的收边和节气环的起边，
   *     一条线身兼两个角色，最容易被读成"这里被切开"。
   *
   * 现改为分级：
   *   - 最外沿 r6：保持醒目金线 3px（那是盘沿，本来就该有）
   *   - 最内沿 r0：保持 2.5px（天池边界）
   *   - **中间的 r1~r5：降为 1.1px、透明度 0.34 的暗铜线**，
   *     只用来"提示分环位置"，不再构成视觉切割。
   */
  const EDGE_STRONG = new Set([0, rings.length - 1]);
  rings.forEach((r, idx) => {
    if (EDGE_STRONG.has(idx)) {
      drawRingBorder(r, '#ffd54f', idx === rings.length - 1 ? 4 : 2.5);
    } else {
      drawRingBorder(r, 'rgba(184, 148, 77, 0.34)', 1.1);
    }
  });

  /**
   * ★ 环间「视觉隔离带」（本轮第四轮新增）。
   *
   * 上面的 drawRingBorder 已经把中间环界线降为极淡的暗铜线，
   * 但仅"降淡"还不够 —— 五行环的色块会一直铺到 r2 边缘，
   * 与节气环的内容只隔一条细线，两环内容仍然"顶"在一起。
   *
   * 这里在每个内部环边界上叠一条 **3px 宽的半透明深色带**，
   * 作用类似印刷上的"分栏留白"：环与环之间出现一条明确的暗缝
   * → 读作「两环」而不是「一环被切开」。
   *
   * 注意用「叠加深色」而不是 destination-out：
   * 后者会把贴图挖成透明，3D 里会透出盘底的 earthBaseTex 棕褐色，
   * 反而形成一条更刺眼的异色条（这正是"断成 2 个环"曾经的成因之一）。
   */
  const SEAM_WIDTH = 3.0;
  ctx.save();
  ctx.lineWidth = SEAM_WIDTH;
  ctx.strokeStyle = 'rgba(8, 5, 3, 0.58)';
  // 只对内部界线（r1..r5）做隔离，r0/r6 是盘体边缘不动
  for (let idx = 1; idx < rings.length - 1; idx++) {
    ctx.beginPath();
    ctx.arc(cx, cy, rings[idx], 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // ========== RING 1: EARLY HEAVEN & LATER HEAVEN BAGUA (r0 to r1) ==========
  // 角度基准：**必须用 item.angleLater（后天/文王方位）**，不能用下标 × 45°。
  // TRIGRAMS 数组是先天方位顺序（乾正南、兑东南、离正东…），
  // 下标 × 45° 会整体错位（艮从应落的东北 45° 掉到正西 270°，偏 135°）。
  // 修正后与二十四山卦山逐一吻合：坎0 · 艮45 · 巽135 · 离180 · 坤225 · 兑270 · 乾315。
  // 分隔线画在每个卦的**起始角**（angleLater - 22.5°），使卦位居中于自己的扇格。
  const baguaCount = 8;
  for (let i = 0; i < baguaCount; i++) {
    const item = TRIGRAMS[i];
    const angle = (item.angleLater * Math.PI) / 180 - Math.PI / 2;
    const midR = (r0 + r1) / 2;

    // 八卦二级聚焦：非选中卦整体隐去（连分隔线一起），只留目标卦。
    // 与五行环同理 —— 直接不画最干净，叠暗色会与金色爻线叠出脏边。
    if (highlight?.focusTrigrams && !highlight.focusTrigrams.includes(item.id)) continue;

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
    // 环带由 0.38 内收到 0.355（宽度 129→104px，半宽 64.5→52.2），
    // 卦名 + 三爻的纵向占位必须同比缩到 0.81，否则会溢出到相邻的五行环里。
    drawRingText(ctx, item.name, 0, -16, 'bold 36px "Noto Serif SC", serif', '#fff8e1', '#000000', 3.8);

    // 3 Yao lines
    const yaoW = 36;
    const yaoH = 4.5;
    const yaoGap = 5;
    const yaoStartY = 3;

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
  // 角度**不再硬编码**，改由 MOUNTAINS_24 的五行归属反推（见 utils/wuxingArc.ts）。
  // 旧实现是「5 等分 × 72°、起点正北、首字木」，导致正北子位落在水/木分界线上，
  // 水居亥、木居丑、火居乙、金居庚，与二十四山、八卦环各说各话。
  // 现在：水居正北(子)、木居正东(卯)、火居正南(午)、金居正西(酉)、土布四隅。
  //
  // 填色 alpha 说明（2026-10-07 二次修正）：
  //   原用 0.16，叠在深棕木纹(rgb≈29,20,14)上后五个色全部落到 mx<70 的区间，
  //   在 3D 场景里几乎看不见 → 用户的观感是「五行环不存在，只剩旁边那条节气色带」，
  //   于是把紧邻的节气环(按季节着色的高饱和文字)当成了五行环，
  //   读成「金木水火土被切成两个环」。
  //   现提到 0.42 并加 2.4px 实色描边，保证在 3D 透视+环境光下仍能明确辨色。
  const midR = (r1 + r2) / 2;

  const WUXING_FILL_ALPHA = 0.42;
  const wuxingFill = (id: string, alpha = WUXING_FILL_ALPHA) =>
    id === 'fire' ? `rgba(239, 68, 68, ${alpha})` :
    id === 'water' ? `rgba(56, 189, 248, ${alpha})` :
    id === 'wood' ? `rgba(52, 211, 153, ${alpha})` :
    id === 'metal' ? `rgba(226, 232, 240, ${alpha})` :
                     `rgba(245, 158, 11, ${alpha})`;

  // 副段（宽 < 30°，如 巽135°属木 / 乾315°属金）减淡到 0.20 并描边变细，
  // 使其读作主段的延伸而不是并列的独立色块 —— 否则 10 段会看起来像"多了一层"。
  const SATELLITE_FILL_ALPHA = 0.20;

  for (const arc of WUXING_ARCS) {
    const startA = (arc.startDeg * Math.PI) / 180 - Math.PI / 2;
    const endA = (arc.endDeg * Math.PI) / 180 - Math.PI / 2;
    const elem = FIVE_ELEMENTS[arc.element];
    const sat = isSatelliteArc(arc);

    /**
     * 聚光：未点亮的五行色块直接跳过，露出底色。
     * 若换成「填一层暗色」会与相邻的暗缝/描边叠出浑浊色边，
     * 直接不画反而最干净 —— 底色本身就是深棕木纹，天然就是"未选中"。
     */
    if (highlight?.focusElements && !highlight.focusElements.includes(arc.element)) continue;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r2, startA, endA);
    ctx.arc(cx, cy, r1, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = wuxingFill(elem.id, sat ? SATELLITE_FILL_ALPHA : WUXING_FILL_ALPHA);
    ctx.fill();
    /**
     * ★ 色块描边（本轮第四轮修正）。
     *
     * 改前：主段 `rgba(255,226,150,0.85)` 2.4px、副段 `0.32` 1.2px。
     * 问题：亮金 2.4px 的径向描边与环边界线叠加后，会把色块"框"成一个
     *       独立的小格子；相邻色块的金框并排 → 盘面上出现 10 条额外的
     *      径向金线，与节气环（24 格）的径向线角度错开 7.5°，
     *       交界处形成 Z 形错位，用户读成「不属于同一圆环的内容被切到一个圆环了」。
     *
     * 改后：描边只保留**极淡的暖色描边**用于分色边界，不再抢镜；
     *       分色依靠色块本身的填充差异（0.42 vs 0.20 的透明度层级）。
     */
    // 只保留外端 12px 的「格界刻记」，不画整条径向金线。
    // 原因：五行环分格线角度（30/60/120/…）与紧邻的节气环 / 廿四山环
    // 分格线角度（7.5°+15°n）错开 7.5°，两者在 r2 处形成 Z 形接头，
    // 是用户四轮反馈「断层 / 不属于同一圆环的内容被切到一个圆环」的几何根因。
    // 缩短到外端一小段后，既保留分格可读性，又不与节气环竖线迎面撞上。
    const notchLen = 12;
    const notchAlpha = sat ? 0.22 : 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(startA) * (r2 - notchLen), cy + Math.sin(startA) * (r2 - notchLen));
    ctx.lineTo(cx + Math.cos(startA) * r2, cy + Math.sin(startA) * r2);
    ctx.moveTo(cx + Math.cos(endA) * (r2 - notchLen), cy + Math.sin(endA) * (r2 - notchLen));
    ctx.lineTo(cx + Math.cos(endA) * r2, cy + Math.sin(endA) * r2);
    ctx.strokeStyle = `rgba(255, 226, 150, ${notchAlpha})`;
    ctx.lineWidth = sat ? 1.0 : 1.6;
    ctx.stroke();
    ctx.restore();
  }

  for (const arc of WUXING_ARCS) {
    const midA = (((arc.startDeg + arc.endDeg) / 2) * Math.PI) / 180 - Math.PI / 2;
    const elem = FIVE_ELEMENTS[arc.element];
    const isMain = isMainArc(arc);
    const isSat = isSatelliteArc(arc);

    // 与上面填色阶段同一判据：未点亮的五行连字一起省掉，
    // 否则会出现"暗底上浮着亮字"的中间态，读起来像渲染错误。
    if (highlight?.focusElements && !highlight.focusElements.includes(arc.element)) continue;

    ctx.save();
    ctx.translate(cx + Math.cos(midA) * midR, cy + Math.sin(midA) * midR);
    ctx.rotate(midA + Math.PI / 2);

    const vividElemColor = elem.id === 'wood' ? '#4ade80' :
                           elem.id === 'fire' ? '#ff4d4f' :
                           elem.id === 'earth' ? '#facc15' :
                           elem.id === 'metal' ? '#ffffff' : '#38bdf8';

    // 三档字级：主段全尺寸 / 常规副段（四隅的土）0.68 / 窄副段（巽·乾）0.60 且更暗。
    // 窄段字再小一档，是为了让它明确读作"主段的延伸"而不是另一个独立元素。
    // 三档**都补季节字** —— 早先窄副段不画季字，邻段有、它没有，
    // 视觉上像"这几个字没写完"，这才是"显示不完整"观感的真正来源。
    //
    // ★ 纵向排版的重大修正（本轮第四轮）：
    //   改前是「元素名压到上半带(y=-20)、季字甩到下半带(y=+28)」——
    //   66px 大字占 -56~+16，28px 季字占 +11~+45，两者在 +11~+16 处**重叠**，
    //   而环带正中心 0 附近几乎无字。实测极坐标亮字率曲线呈
    //   「峰(上半) → 谷(中部空) → 峰(下半)」的双峰，
    //   用户据此读成"五行环里塞了两个环的内容"（原话：「不属于同一圆环的内容
    //   被切到一个圆环了」），且下峰紧邻 r2 边框，看着像被切到节气环去。
    //   正解：把两行字**收拢成居中的一组**（大字上移、季字紧贴大字下沿），
    //   让环带内呈单峰、重心落在正中心，读起来是一个完整单元。
    //
    // 纵向收拢后的占位（环带半宽 79.5px）。
    //
    // ★ 关键：本函数处在 rotate(midA + π/2) 后的**局部坐标系**里，
    //   局部 +y 指向**盘心**（向内），局部 -y 指向**盘外**。
    //   （推导：θ = midA + π/2，局部 +y 单位向量 → 全局 (-cos midA, -sin midA)）
    //   所以：
    //     y < 0 → 偏向环带**外侧**（靠 r2）
    //     y > 0 → 偏向环带**内侧**（靠 r1）
    //
    // 排版决策：**元素名居中偏外、季字紧贴其内侧**，两行合成一个居中的整组。
    //   为什么要收拢：改前是「名 @-20 / 季 @+28」，形成
    //     名 中径 452（贴 r2=511 那侧）｜季 中径 404（贴 r1=353 那侧）
    //   两行被拉到环带两端、中间空 60px，用户读成"五行环里塞了两个环"。
    //   且季字贴 r1 内边界，紧邻八卦环，看起来像"被切到八卦环去了"。
    //
    //   （注：local y 正负与"内外"的关系在历史上被我搞反过一次，
    //     教训记牢：改这里的数值必须同时改注释，并用
    //     scripts/profile-dial-radial.mjs 量测复核。）
    const alpha = isMain ? 1 : isSat ? 0.62 : 0.82;

    ctx.globalAlpha = alpha;
    if (isMain) {
      // 名 中径 450（占 417~483）｜季 中径 397（占 380~414）
      // 整组占 380~483，居中于 midR=432 略偏外 → 与环带的几何中心对齐
      // 与两条边界都留 25px 以上余量，杜绝"贴边看起来像被切到邻环"
      drawRingText(ctx, elem.name, 0, -18, 'bold 66px "Ma Shan Zheng", "Noto Serif SC", serif', vividElemColor, '#000000', 6.0);
      drawRingText(ctx, elem.season, 0, 35, 'bold 30px "Noto Serif SC", serif', '#fffbeb', '#000000', 4.2);
    } else if (isSat) {
      drawRingText(ctx, elem.name, 0, -10, 'bold 40px "Ma Shan Zheng", "Noto Serif SC", serif', vividElemColor, '#000000', 4.2);
      drawRingText(ctx, elem.season, 0, 21, 'bold 20px "Noto Serif SC", serif', '#fffbeb', '#000000', 3.0);
    } else {
      drawRingText(ctx, elem.name, 0, -12, 'bold 46px "Ma Shan Zheng", "Noto Serif SC", serif', vividElemColor, '#000000', 4.6);
      drawRingText(ctx, elem.season, 0, 24, 'bold 23px "Noto Serif SC", serif', '#fffbeb', '#000000', 3.2);
    }
    ctx.globalAlpha = 1;

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

    // 配色说明（2026-10-07 修正）：
    //   原本按季节着色（春#4ade80绿 / 夏#ff7875粉 / 秋#fde047黄 / 冬#60a5fa蓝），
    //   而季节色与紧邻内环的五行色几乎一一对应（春=木绿、夏=火红、秋=金黄、冬=水蓝），
    //   两环又物理相邻（共用 r2 边框），24 格里有 16 格撞色 ——
    //   肉眼会把「内环淡色扇区 + 外环高饱和文字」读成
    //   「同一个颜色被切成内外两条带，且起止角差 15° 像是错位半格」。
    //   现在节气环改为**中性米白**，季节信息交给高亮底纹（`·` 包裹）承担，
    //   两环各管一件事：五行环管颜色，节气环管时序。
    const isMajorCardinalTerm = ['冬至', '夏至', '春分', '秋分', '立春', '立夏', '立秋', '立冬'].includes(item.name);
    const termColor = isMajorCardinalTerm ? '#fff3c4' : '#e8dcc0';

    // ★ 去掉「·」包裹（本轮第四轮修正）。
    //   `·冬至·` 是 4 个字符位（2 汉字 + 2 间隔点），实测宽度 ≈156px，
    //   而本环每格弧长仅 148.9px（rMid=568.7，24 格）——**超格 5%**，
    //   8 个重要节气字会横向侵入左右相邻格，与邻格文字在视觉上连成一片，
    //   再加上相邻的 r2 边框线，就被读成"内容被切到另一个圆环"。
    //   改用「加粗 + 更亮的米黄」区分重要节气：不占额外宽度，
    //   且与其余节气的字号一致，纵横都不越界（2 字 ×31px = 62px，仅占格 42%）。
    const termFont = isMajorCardinalTerm
      ? 'bold 32px "Noto Serif SC", serif'
      : 'bold 31px "Noto Serif SC", serif';

    drawRingText(ctx, item.name, 0, 0, termFont, termColor, '#000000', 4.5);

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

  /**
   * ★ 环间古典错金弦槽与连珠间隔纹（精修接缝工艺）
   *
   * 在每个同心环交界线（r1..r5）以及天池外沿 r0、盘沿 r6 处绘制工艺级间隔带：
   * 1. 阴刻玄漆嵌槽（深古铜暗槽，宽 4.8px）：形成立体沉降凹槽，完美消灭相邻环径向分割线的参差错位感；
   * 2. 内外双道错金弦（宽 1.0px，金珀色）：优雅收边，将各环内容封纳在清晰整肃的法器轨道之内；
   * 3. 微细青铜连珠星目（Micro-Pearl Dots）：在 r2（五行/节气界）与 r4（廿四山/廿八宿界）以度数点缀连珠金星，呼应星宿经纬与周天气运。
   */
  ctx.save();
  for (let idx = 1; idx < rings.length - 1; idx++) {
    const r = rings[idx];
    const seamHalfWidth = 2.4;

    // 阴刻凹槽底色 (深古铜玄漆暗影槽)
    ctx.beginPath();
    ctx.arc(cx, cy, r + seamHalfWidth, 0, Math.PI * 2);
    ctx.arc(cx, cy, r - seamHalfWidth, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(8, 5, 3, 0.92)';
    ctx.fill();

    // 内侧错金细弦
    ctx.beginPath();
    ctx.arc(cx, cy, r - seamHalfWidth, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225, 185, 85, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 外侧错金细弦
    ctx.beginPath();
    ctx.arc(cx, cy, r + seamHalfWidth, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(225, 185, 85, 0.75)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 中轴微细暗铜分界导线
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(175, 135, 60, 0.40)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 在关键大界环 r2 (五行/节气界) 与 r4 (廿四山/廿八宿界) 嵌刻古典青铜连珠星点
    if (idx === 2 || idx === 4) {
      const dotCount = idx === 2 ? 24 : 48;
      for (let d = 0; d < dotCount; d++) {
        const ang = (d * Math.PI * 2) / dotCount - Math.PI / 2;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffe082';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 2.0;
        ctx.fill();
      }
    }
  }

  // 天池内沿 r0 边界：高规制双金弦加固
  ctx.beginPath();
  ctx.arc(cx, cy, r0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r0 + 2.6, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(218, 165, 32, 0.60)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 盘沿 r6 外边界：重装金圈
  ctx.beginPath();
  ctx.arc(cx, cy, r6, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 3.6;
  ctx.stroke();
  ctx.restore();

  /**
   * ★ 环级聚光（压暗非目标环）—— 必须在所有环都画完之后执行。
   *
   * 实现方式：先算出「非保留环」的环形区域，再用 **source-atop** 叠一层
   * 半透明深色。source-atop 只作用在已有像素上、且保留原有 alpha，
   * 因此不会像 destination-out 那样挖出透明（那会透出盘底棕褐色，
   * 形成比原图更刺眼的异色环 —— 这个坑在 drawRingBorder 一节踩过）。
   *
   * 为什么要按环带逐条画、而不是画一个大圆：
   *   保留环可能落在中间（如 elements 保留 [1,2]），
   *   大圆会把内部的 r0~r1 八卦环一起保住，聚光就失效了。
   */
  if (highlight && highlight.keep.length < rings.length - 1) {
    const dim = Math.max(0, Math.min(1, highlight.dimFactor));
    const shade = `rgba(6, 4, 2, ${(1 - dim) * 0.86})`;
    // 环带 band 覆盖 rings[band] ~ rings[band+1]；rings 有 7 个值 → 6 条环带。
    for (let band = 0; band < rings.length - 1; band++) {
      if (highlight.keep.includes(band)) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.beginPath();
      ctx.arc(cx, cy, rings[band + 1], 0, Math.PI * 2);
      // 反向画内圆形成环形
      ctx.arc(cx, cy, rings[band], 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 保留环的额外提亮（keepBoost > 1）。
   * 用 'lighter' 做加法混合：只提亮已有像素，不改形状、不产生透明。
   * 对五行色块（原本 alpha 0.42 偏淡）尤其有效。
   */
  if (highlight && (highlight.keepBoost ?? 1) > 1.001) {
    const amount = Math.min(0.5, (highlight.keepBoost! - 1) * 0.9);
    for (const band of highlight.keep) {
      if (band >= rings.length - 1) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(cx, cy, rings[band + 1], 0, Math.PI * 2);
      ctx.arc(cx, cy, rings[band], 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(180, 150, 90, ${amount})`;
      ctx.fill();
      ctx.restore();
    }
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

/**
 * Procedural Bump/Height map to produce authentic tactile 3D relief engravings on ring seams
 */
export function createCompassBumpTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.485;

  // Neutral mid-gray base (128)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const r0 = maxR * 0.25;
  const r1 = maxR * 0.355;
  const r2 = maxR * 0.515;
  const r3 = maxR * 0.63;
  const r4 = maxR * 0.79;
  const r5 = maxR * 0.91;
  const r6 = maxR * 1.0;
  const rings = [r0, r1, r2, r3, r4, r5, r6];

  // Deep recessed groove and raised relief strings at each ring boundary
  for (let idx = 1; idx < rings.length - 1; idx++) {
    const r = rings[idx];
    const seamHalf = 2.4;

    // Recessed shadow channel (dark = recessed groove)
    ctx.beginPath();
    ctx.arc(cx, cy, r + seamHalf, 0, Math.PI * 2);
    ctx.arc(cx, cy, r - seamHalf, 0, Math.PI * 2, true);
    ctx.fillStyle = '#222222';
    ctx.fill();

    // Raised inner gold cordons (bright = raised relief)
    ctx.beginPath();
    ctx.arc(cx, cy, r - seamHalf, 0, Math.PI * 2);
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Raised outer gold cordons
    ctx.beginPath();
    ctx.arc(cx, cy, r + seamHalf, 0, Math.PI * 2);
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Raised pearl beaded studs (bright spots in height map)
    const dotCount = idx === 2 ? 24 : idx === 4 ? 48 : 36;
    for (let d = 0; d < dotCount; d++) {
      const ang = (d * Math.PI * 2) / dotCount - Math.PI / 2;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  // Inner Tianchi raised boundary
  ctx.beginPath();
  ctx.arc(cx, cy, r0, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Outer rim raised bevel
  ctx.beginPath();
  ctx.arc(cx, cy, r6, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.0;
  ctx.stroke();

  const bumpTex = new THREE.CanvasTexture(canvas);
  bumpTex.anisotropy = 16;
  return bumpTex;
}
