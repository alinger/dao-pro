import { MOUNTAINS_24 } from '../data/taoData';
import type { ElementType } from '../types/tao';

/**
 * 五行环落位工具
 * ==============
 *
 * 背景（2026-10-07 修复）
 * ----------------------
 * 五行环此前硬编码为「5 等分 × 72°、起点正北、首字木」，
 * 与二十四山自身的五行归属完全脱节，导致：
 *   - 正北（子）恰好落在「水」与「木」的分界线上，谁都不包含它
 *   - 水居亥/北偏西、木居丑/东北、火居乙/东偏南、金居庚/西偏南
 *   - 与八卦环、二十四山环、节气环、二十八宿环各说各话
 *
 * 根因：它是**唯一一个不采用权威角度数据的环**，其他环都用各自数据里的 angle。
 *
 * 本模块的取法
 * ------------
 * 五行不独立定位，而是**由 MOUNTAINS_24 的五行归属反推**，
 * 保证「盘面所见」与「山位数据」永远同源、不会各自漂移：
 *   水 → 亥330 壬345 子0 癸15      → 连续 330°~30°（跨 0°），居正北
 *   木 → 寅60 甲75 卯90 乙105 巽135 → 60°~120° 为主段，居正东；巽135 独立成段
 *   火 → 巳150 丙165 午180 丁195    → 连续 150°~210°，居正南
 *   金 → 申240 庚255 酉270 辛285 乾315 → 240°~300° 为主段，居正西；乾315 独立成段
 *   土 → 丑30 艮45 / 辰120 / 未210 坤225 / 戌300 → 四隅四段
 *
 * 角度约定与 MOUNTAINS_24.angle、BearingReadout 完全一致：
 *   0° = 子/正北，顺时针为正，每山 15°，山位扇区为 [angle, angle+15)。
 */

/** 五行环上「主字」的排布顺序（与相生序 木→火→土→金→水 一致，便于顺读） */
export const ELEMENT_ORDER: readonly ElementType[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/**
 * 一段连续的五行区间（数据角度制，顺时针）。
 * start/end 可能超出 [0,360)（跨 0° 的段如水的 330~390）。
 */
export interface ElementArc {
  element: ElementType;
  startDeg: number;
  endDeg: number;
}

/** 五行汉字，与 ELEMENT_HANZI 保持一致（此处独立导出避免循环依赖） */
export const WUXING_HANZI: Record<ElementType, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

/** 山位格宽（度）。二十四山每山 15° */
export const MOUNTAIN_CELL_DEG = 15;

/**
 * 把某个五行的全部山位合并成连续区间。
 * 注意：跨越 0° 的段（如水 330/345/0/15）会合并为 start=330, end=390。
 */
function buildArcs(element: ElementType): ElementArc[] {
  const angles = MOUNTAINS_24.filter((m) => m.element === element)
    .map((m) => m.angle)
    .sort((a, b) => a - b);

  if (angles.length === 0) return [];

  const raw: ElementArc[] = [];
  let start = angles[0];
  let prev = angles[0];

  for (let i = 1; i < angles.length; i++) {
    const a = angles[i];
    if (a === prev + MOUNTAIN_CELL_DEG) {
      prev = a;
      continue;
    }
    raw.push({ element, startDeg: start, endDeg: prev + MOUNTAIN_CELL_DEG });
    start = a;
    prev = a;
  }
  raw.push({ element, startDeg: start, endDeg: prev + MOUNTAIN_CELL_DEG });

  // 首尾相接（首格为 0 且末格收在 360）时合并为一段
  if (raw.length > 1) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if (first.startDeg === 0 && last.endDeg === 360) {
      raw.pop();
      raw[0] = { element, startDeg: last.startDeg, endDeg: first.endDeg + 360 };
    }
  }

  return raw;
}

/**
 * 五行环的全部着色区间，按 ELEMENT_ORDER 顺序，每行内按起始角升序。
 * 渲染时逐段annular sector 填充即可，天然覆盖 24 格且互不重叠。
 */
export const WUXING_ARCS: readonly ElementArc[] = ELEMENT_ORDER.flatMap(buildArcs);

/**
 * 每个五行的「主字」落位。
 *
 * 取该五行**最宽连续段的中点**，这样：
 *   水 → 最宽段 330~390，中点 360° → 正北（子）✓
 *   木 → 最宽段 60~120，中点 90° → 正东（卯）✓
 *   火 → 150~210，中点 180° → 正南（午）✓
 *   金 → 最宽段 240~300，中点 270° → 正西（酉）✓
 *   土 → 四段等宽（30°），取首段 30~60，中点 45° → 丑艮（东北）
 *
 * 土的落位刻意保持在四隅而非正位，因为「土居中央 / 布于四隅」是传统正解；
 * 正中位置由天池占据。
 */
export const WUXING_MAIN_ARC: Record<ElementType, { startDeg: number; endDeg: number }> =
  ELEMENT_ORDER.reduce((acc, el) => {
    const arcs = WUXING_ARCS.filter((a) => a.element === el);
    const widest = arcs.reduce((a, b) =>
      b.endDeg - b.startDeg > a.endDeg - a.startDeg ? b : a
    );
    acc[el] = { startDeg: widest.startDeg, endDeg: widest.endDeg };
    return acc;
  }, {} as Record<ElementType, { startDeg: number; endDeg: number }>);

/**
 * 「副段」判定阈值（度）。
 *
 * 背景（2026-10-07 二次修正）：
 *   由山位数据反推出的五行弧其实是 **10 段**而非 5 段：
 *     水60 土30 木15(巽) 火60 土30 金60 土15 金15(乾) 水60 土15
 *   其中「巽135°属木」「乾315°属金」是古法正解（各地典籍一致），
 *   但它们各自被孤零零插在 土+火 / 土+水 之间，形成两条 15° 窄条。
 *   窄条若与主段同等着色描边，环上会出现 10 个并列色块，
 *   肉眼读成「金木水火土被多画了一层」。
 *
 * 处理：宽度 < 30° 的段降级为「副段」——
 *   填色减淡、描边变细、字缩小压暗，使其读作主段的延伸而非独立色块。
 *   **数据本身不变**，山位五行归属仍然准确。
 */
export const SATELLITE_MAX_DEG = 30;

/** 段宽（度）。跨 0° 的段（如水的 330~390）会得到 60。 */
export function arcWidth(arc: ElementArc): number {
  return arc.endDeg - arc.startDeg;
}

/** 该段是否为主段（= 该元素最宽的一段）。 */
export function isMainArc(arc: ElementArc): boolean {
  const main = WUXING_MAIN_ARC[arc.element];
  return arc.startDeg === main.startDeg && arc.endDeg === main.endDeg;
}

/**
 * 该段是否应降级为「副段」。
 * 判据：不是主段，且宽度不足 SATELLITE_MAX_DEG。
 */
export function isSatelliteArc(arc: ElementArc): boolean {
  return !isMainArc(arc) && arcWidth(arc) < SATELLITE_MAX_DEG;
}

/** 主字中心角度（度，顺时针，0=正北）。可能 >360，取模后使用。 */
export function wuxingGlyphAngle(element: ElementType): number {
  const { startDeg, endDeg } = WUXING_MAIN_ARC[element];
  return ((startDeg + endDeg) / 2) % 360;
}