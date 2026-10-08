import { MOUNTAINS_24 } from '../data/taoData';
import { SOLAR_TERMS_24 } from '../data/taoCalendar';
import type { ElementType, Mountain24 } from '../types/tao';

/**
 * 二十四山（二十四方位）换算工具
 *
 * 二十四山以子（0°）为起点，每 15° 一山，逆时针顺布：
 *   子0 癸15 丑30 艮45 寅60 甲75 卯90 乙105 辰120 巽135
 *   巳150 丙165 午180 丁195 未210 坤225 申240 庚255 酉270
 *   辛285 戌300 乾315 亥330 壬345
 *
 * 注意：山位「中心」在 i*15°，山位「扇区」为 [i*15 - 7.5, i*15 + 7.5)。
 */

/** 阳山（与 textureGenerator 中罗盘贴图配色保持一致） */
export const YANG_MOUNTAINS_24: readonly string[] = [
  '甲', '庚', '丙', '壬', '乾', '坤', '艮', '巽', '寅', '申', '巳', '亥',
];

const MOUNTAIN_TYPE_LABEL: Record<Mountain24['type'], string> = {
  tianGan: '天干',
  diZhi: '地支',
  gua: '卦山',
};

export const ELEMENT_HANZI: Record<ElementType, string> = {
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土',
};

export const ELEMENT_COLOR: Record<ElementType, string> = {
  metal: '#e2e8f0',
  wood: '#4ade80',
  water: '#38bdf8',
  fire: '#ff6b6b',
  earth: '#facc15',
};

/** 阳山 / 阴山 展示色 */
export const MOUNTAIN_COLOR = {
  yang: '#ff8c69',
  yin: '#fff176',
} as const;

/** 角度归一化到 [0, 360) */
export function normalizeDegrees(deg: number): number {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/**
 * 读数角度归一化
 *
 * 重要：罗盘 3D 贴图的「镜像翻转文字」开关只翻转了 ring geometry 的 UV 采样方向
 * （见 Luopan3D 的 toggleTextMirror），属于**渲染层**的左右翻转，
 * 并不改变 mainAssembly / globalMasterAngle 的物理旋转方向。
 *
 * 因此 HUD 读数一律直接使用物理角度，绝不做 360-x 反向补偿——
 * 否则读数会与盘面刻度对不上。
 *
 * 而 HUD 本身是 DOM/SVG 图层，根本不参与 WebGL 的 UV 采样，
 * 所以无论罗盘贴图是否镜像，读数文字永远正向、不会镜像翻转。
 */
export function resolveDisplayAngle(deg: number): number {
  return normalizeDegrees(deg);
}

/** 盘面左右翻转时，指针视觉朝向的补偿（仅用于图元绘制，不影响读数语义） */
export function resolveVisualBearing(deg: number, mirrored: boolean): number {
  const d = normalizeDegrees(deg);
  return mirrored ? normalizeDegrees(360 - d) : d;
}

/** 角度 → 二十四山序号（0..23） */
export function getMountainIndex(deg: number): number {
  return Math.floor(((normalizeDegrees(deg) + 7.5) % 360) / 15) % 24;
}

export interface BearingReading {
  /** 3D 引擎上报的原始旋转角（0..360） */
  rawDegrees: number;
  /** 显示角（0..360），= 物理角度，未做镜像反算 */
  degrees: number;
  /** 形如 "345.2°" */
  degreesDisplay: string;
  /** 罗盘贴图是否处于镜像态（仅用于提示，不改变读数） */
  mirrored: boolean;

  index: number;
  mountain: Mountain24;
  /** 单字山名，如「壬」 */
  name: string;
  /** 带山后缀，如「壬山」 */
  label: string;
  element: ElementType;
  /** 天干 / 地支 / 卦山 */
  typeLabel: string;
  /** 阳 / 阴 */
  yinYang: '阳' | '阴';
  isYangMountain: boolean;
  /** 主色（随五行变化） */
  accent: string;

  /** 当前山位扇区起止角（显示坐标系） */
  sectorStart: number;
  sectorEnd: number;
  /** 扇区中心角（扇区指针刻度高亮用） */
  sectorCenter: number;
  /** 扇区内进度 0..1 */
  sectorRatio: number;
  /** 对应节气（与山位同为15° 网格） */
  solarTerm: string;
}

/**
 * 把 3D 旋转角实时转换为二十四方位读数
 */
export function getBearingReading(rawDeg: number, mirrored = false): BearingReading {
  const degrees = resolveDisplayAngle(rawDeg);
  const index = getMountainIndex(degrees);
  const mountain = MOUNTAINS_24[index];

  const sectorCenter = index * 15;
  const sectorStart = normalizeDegrees(sectorCenter - 7.5);
  const sectorEnd = sectorStart + 15;
  const sectorRatio = normalizeDegrees(degrees - sectorStart) / 15;

  const isYangMountain = YANG_MOUNTAINS_24.includes(mountain.name);

  return {
    rawDegrees: normalizeDegrees(rawDeg),
    degrees,
    degreesDisplay: `${degrees.toFixed(1)}°`,
    mirrored,

    index,
    mountain,
    name: mountain.name,
    label: `${mountain.name}山`,
    element: mountain.element,
    typeLabel: MOUNTAIN_TYPE_LABEL[mountain.type],
    yinYang: isYangMountain ? '阳' : '阴',
    isYangMountain,
    accent: ELEMENT_COLOR[mountain.element],

    sectorStart,
    sectorEnd,
    sectorCenter,
    sectorRatio,
    solarTerm: SOLAR_TERMS_24[index]?.name ?? '',
  };
}

/* ------------------------------------------------------------------ *
 * SVG 极坐标小工具（0° 指向正上方，顺时针为正，与罗盘盘面一致）
 * ------------------------------------------------------------------ */

export interface Point {
  x: number;
  y: number;
}

export function polarPoint(cx: number, cy: number, r: number, bearingDeg: number): Point {
  const rad = ((bearingDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 生成环形扇形 path（以bearingDeg 为起始角，顺时针扫过 sweepDeg） */
export function annularSectorPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  bearingDeg: number,
  sweepDeg: number
): string {
  const largeArc = sweepDeg > 180 ? 1 : 0;
  const s = polarPoint(cx, cy, rOuter, bearingDeg);
  const e = polarPoint(cx, cy, rOuter, bearingDeg + sweepDeg);
  const ei = polarPoint(cx, cy, rInner, bearingDeg + sweepDeg);
  const si = polarPoint(cx, cy, rInner, bearingDeg);
  return [
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
    `L ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}