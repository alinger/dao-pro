import React, { useEffect, useRef } from 'react';
import {
  getBearingReading,
  polarPoint,
  annularSectorPath,
  normalizeDegrees,
  ELEMENT_HANZI,
  MOUNTAIN_COLOR,
  type BearingReading,
} from '../utils/bearing';
import { bearingStore } from '../utils/bearingStore';

/* ------------------------------------------------------------------ *
 * 几何常量（viewBox 200x200，圆心100,100）
 * ------------------------------------------------------------------ */
const VB = 200;
const C = VB / 2;
const R_OUTER = 92;
const R_TICK_OUT = 88;
const R_TICK_IN = 80;
const R_LABEL = 68;
const R_SECTOR_OUT = 76;
const R_SECTOR_IN = 50;
const R_HUB = 42;

/** 四正（子午卯酉）刻度加粗 */
const CARDINAL_INDICES = new Set([0, 6, 12, 18]);

interface BearingReadoutProps {
  /** 3D 引擎每帧上报的物理旋转角（0..360） */
  angle: number;
  /** 罗盘贴图是否处于左右镜像态（仅用于角标提示，不影响读数） */
  isMirroredDial?: boolean;
  /** 是否处于天球（浑天仪）展开态，用于轻微淡出避让 */
  dimmed?: boolean;
}

export const BearingReadout: React.FC<BearingReadoutProps> = ({
  angle,
  isMirroredDial = false,
  dimmed = false,
}) => {
  const reading = getBearingReading(angle, false);

  /* --- 命令式更新节点（每帧写，不触发 React 重渲染） --- */
  const needleRef = useRef<SVGGElement | null>(null);
  const degreeTextRef = useRef<HTMLSpanElement | null>(null);
  const sectorArcRef = useRef<SVGCircleElement | null>(null);

  /* --- 跨山位时才更新的文字节点 --- */
  const charRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const metaRef = useRef<HTMLSpanElement | null>(null);
  const hubRingRef = useRef<SVGCircleElement | null>(null);
  const sectorPathRef = useRef<SVGPathElement | null>(null);
  const activeTickRef = useRef<SVGCircleElement | null>(null);

  /** 上一帧写入的角度与山位索引，避免重复 DOM 操作 */
  const lastAngleRef = useRef<number>(-1);
  const lastIndexRef = useRef<number>(-1);

  /* ---------------- 每帧：数字 + 指针 + 扇区进度 ----------------
   * 只在挂载时订阅一次。3D 引擎每帧通过 bearingStore 主动推送，
   * 避免把 angle 放进依赖数组导致每帧重订阅。 */
  useEffect(() => {
    const applyFrame = (deg: number) => {
      if (deg === lastAngleRef.current) return;
      lastAngleRef.current = deg;

      // 指针：仅旋转 SVG 图元组，文字不在此组内，天然不会翻转
      if (needleRef.current) {
        needleRef.current.setAttribute('transform', `rotate(${deg.toFixed(2)} ${C} ${C})`);
      }

      // 数字读数
      if (degreeTextRef.current) {
        degreeTextRef.current.textContent = deg.toFixed(1).padStart(5, '0');
      }

      // 扇区内进度弧：周长 2πr，用 dasharray 表示占比
      if (sectorArcRef.current) {
        const r = (R_SECTOR_OUT + R_SECTOR_IN) / 2;
        const circumference = 2 * Math.PI * r;
        const idx = Math.floor(((normalizeDegrees(deg) + 7.5) % 360) / 15) % 24;
        const start = normalizeDegrees(idx * 15 - 7.5);
        const ratio = normalizeDegrees(deg - start) / 15;
        sectorArcRef.current.setAttribute(
          'stroke-dasharray',
          `${(ratio * circumference).toFixed(2)} ${circumference.toFixed(2)}`
        );
      }
    };

    // 立即同步一次，避免首帧空白
    applyFrame(normalizeDegrees(angle));
    // 补齐挂载期间可能已经推进的角度
    applyFrame(normalizeDegrees(bearingStore.get().angle));

    const unsub = bearingStore.subscribe((s) => applyFrame(normalizeDegrees(s.angle)));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- 跨山位：更新单字/配色/扇区/刻度 ----------------
   * 每帧检查一次山位索引，只有真正跨过 15° 边界时才写 DOM / setState。 */
  useEffect(() => {
    const syncMountain = (rawDeg: number) => {
      const full = getBearingReading(rawDeg, false);
      if (full.index === lastIndexRef.current) return;
      lastIndexRef.current = full.index;

      const mountainColor = full.isYangMountain ? MOUNTAIN_COLOR.yang : MOUNTAIN_COLOR.yin;

      if (charRef.current) {
        charRef.current.textContent = full.name;
        charRef.current.style.color = mountainColor;
        charRef.current.style.textShadow = `0 0 18px ${mountainColor}66, 0 2px 4px rgba(0,0,0,0.9)`;
      }
      if (labelRef.current) {
        labelRef.current.textContent = `${full.label} · ${full.typeLabel}`;
      }
      if (metaRef.current) {
        metaRef.current.textContent = `${full.yinYang}${ELEMENT_HANZI[full.element]} · ${full.solarTerm}`;
      }
      if (hubRingRef.current) {
        hubRingRef.current.setAttribute('stroke', full.accent);
      }
      if (sectorPathRef.current) {
        sectorPathRef.current.setAttribute(
          'd',
          annularSectorPath(C, C, R_SECTOR_OUT, R_SECTOR_IN, full.sectorStart, 15)
        );
        sectorPathRef.current.setAttribute('fill', full.accent);
      }
      if (activeTickRef.current) {
        const p = polarPoint(C, C, R_TICK_OUT, full.sectorCenter);
        activeTickRef.current.setAttribute('cx', p.x.toFixed(2));
        activeTickRef.current.setAttribute('cy', p.y.toFixed(2));
        activeTickRef.current.setAttribute('fill', mountainColor);
      }
    };

    // 首帧同步（JSX 已按初始 reading 渲染，此处仅补齐 ref 引用后的颜色一致性）
    lastIndexRef.current = -1;
    syncMountain(reading.rawDegrees);

    const unsub = bearingStore.subscribe((s) => syncMountain(s.angle));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- 静态刻度盘（仅渲染一次） ---------------- */
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const bearing = i * 15;
    const outer = polarPoint(C, C, R_TICK_OUT, bearing);
    const inner = polarPoint(C, C, R_TICK_IN, bearing);
    const isCardinal = CARDINAL_INDICES.has(i);
    return { i, bearing, outer, inner, isCardinal };
  });

  const MOUNTAIN_LABELS = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'];
  const initialMountainColor = reading.isYangMountain ? MOUNTAIN_COLOR.yang : MOUNTAIN_COLOR.yin;

  return (
    <div
      // 容器改为「底部锚定」：面板贴在画面下方 8% 处，从下往上生长。
      // 放大字号后面板高度从 108px 涨到 184px，若继续用 top 百分比锚定，
      // 矮视口（1024x768）下会整体溢出画面外 —— 底部锚定天然不会越界。
      className={`pointer-events-none absolute inset-x-0 bottom-[6%] z-20 flex justify-center transition-opacity duration-500 ${
        dimmed ? 'opacity-30' : 'opacity-100'
      }`}
    >
      {/* 面板横向内边距与图文间距：xl 以下用紧凑档，xl 及以上用宽松档。
       *
       * 为什么要分档（实测推导，见 scripts/probe-readout-width.mjs）
       * ------------------------------------------------------
       * 读数面板是 relative 全屏居中的，右栏 aside 也是绝对定位贴右，
       * 两者在 1024x768 这类窄视口下会横向对撞：
       *   读数 388 宽居中 → 右缘 706；右栏 360 宽贴右 → 左缘 640 → 重叠 66px。
       * 可用中间通道 = 气场仪右缘(227) ~ 右栏左缘，1024 下只有 413px。
       *
       * 压缩时刻意不动刻度盘：SVG 用 viewBox 缩放，缩小外层会让盘内
       * 15.3px 的四正山名等比缩到 12px 以下（computed fontSize 不变，
       * 审计脚本测不出来，但肉眼就是"看不清"）。所以只压 padding/gap/min-w：
       *   宽松 24+150+20+168+2 = 388
       *   紧凑 16+150+12+148+2 = 328
       * 文字列 148 > 最长行自然宽 138（「二十四山 · 每山十五度」），不会折行。 */}
      <div className="relative flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#05070a]/92 backdrop-blur-md border border-[#c5a059]/50 shadow-[0_0_28px_rgba(0,0,0,0.85)] xl:gap-5 xl:px-6">
        {/* ============ 迷你刻度盘（SVG，纯图元，无文字翻转风险） ============
         * 尺寸从 108 提到 150（1.39x）：盘面本身随文字放大后需要更大的画布，
         * 否则中心单字会顶到刻度圈内圈。 */}
        <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            width="150"
            height="150"
            className="overflow-visible"
            aria-hidden="true"
          >
            {/* 外圈 */}
            <circle cx={C} cy={C} r={R_OUTER} fill="rgba(3,5,8,0.92)" stroke="#c5a059" strokeOpacity="0.45" strokeWidth="1" />
            <circle cx={C} cy={C} r={R_LABEL} fill="none" stroke="#c5a059" strokeOpacity="0.14" strokeWidth="0.8" />

            {/* 二十四山刻度 */}
            {ticks.map((t) => (
              <line
                key={t.i}
                x1={t.inner.x}
                y1={t.inner.y}
                x2={t.outer.x}
                y2={t.outer.y}
                stroke={t.isCardinal ? '#ffd54f' : '#c5a059'}
                strokeOpacity={t.isCardinal ? 0.85 : 0.42}
                strokeWidth={t.isCardinal ? 1.8 : 1}
                strokeLinecap="round"
              />
            ))}

            {/* 当前山位高亮刻点（跨山位时移动） */}
            <circle ref={activeTickRef} r="2.6" fill={initialMountainColor} />

            {/* 四正山名：子(上) 卯(右) 午(下) 酉(左)
             * fontSize 随 SVG 从 108→150 放大：11 × (150/108) ≈ 15.3，
             * 让刻度盘内的字与面板正文同步变大。 */}
            {[0, 6, 12, 18].map((i) => {
              const p = polarPoint(C, C, R_LABEL, i * 15);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="15.3"
                  fontFamily="'Noto Serif SC', serif"
                  fontWeight="700"
                  fill="#f5ebd7"
                  fillOpacity="0.9"
                >
                  {MOUNTAIN_LABELS[i]}
                </text>
              );
            })}

            {/* 当前山位扇区 */}
            <path
              ref={sectorPathRef}
              d={annularSectorPath(C, C, R_SECTOR_OUT, R_SECTOR_IN, reading.sectorStart, 15)}
              fill={reading.accent}
              fillOpacity="0.16"
              stroke={reading.accent}
              strokeOpacity="0.55"
              strokeWidth="0.8"
            />

            {/* 扇区内进度弧 */}
            <circle
              ref={sectorArcRef}
              cx={C}
              cy={C}
              r={(R_SECTOR_OUT + R_SECTOR_IN) / 2}
              fill="none"
              stroke="#ffd54f"
              strokeOpacity="0.75"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(-90 ${C} ${C})`}
            />

            {/* 指针组：只含线段与箭头，绝不含任何文字 */}
            <g ref={needleRef}>
              <line
                x1={C}
                y1={C}
                x2={C}
                y2={C - (R_SECTOR_OUT - 4)}
                stroke="#ffe082"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <polygon
                points={`${C},${C - (R_SECTOR_OUT + 1)} ${C - 4},${C - (R_SECTOR_OUT - 8)} ${C + 4},${C - (R_SECTOR_OUT - 8)}`}
                fill="#ffd54f"
              />
            </g>

            {/* 天池中心环 */}
            <circle ref={hubRingRef} cx={C} cy={C} r={R_HUB} fill="rgba(4,6,10,0.9)" stroke={reading.accent} strokeWidth="1.2" />
            <circle cx={C} cy={C} r={R_HUB - 5} fill="none" stroke="#c5a059" strokeOpacity="0.22" strokeWidth="0.8" strokeDasharray="3 4" />
          </svg>

          {/* 中心单字：DOM 覆盖在 SVG 之上，文字永远正向 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              ref={charRef}
              className="font-calligraphy leading-none"
              style={{
                fontSize: 45,
                color: initialMountainColor,
                textShadow: `0 0 22px ${initialMountainColor}66, 0 2px 5px rgba(0,0,0,0.9)`,
              }}
            >
              {reading.name}
            </span>
            <span className="font-mono text-[14px] text-[#c5a059]/85 tabular-nums leading-none mt-1">
              <span ref={degreeTextRef}>{normalizeDegrees(angle).toFixed(1).padStart(5, '0')}</span>°
            </span>
          </div>
        </div>

        {/* ============ 文字读数区 ============
         * 字号整体 ×1.5：9→14 / 14→21 / 10→15。
         * min-w 从 104 一路加到 168px（字号 ×1.5 后的需求）。
         * 窄视口降到 148px：> 最长行「二十四山 · 每山十五度」自然宽 138px，仍不折行。
         * 每山十五度 */}
        <div className="flex flex-col gap-1 min-w-[148px] xl:min-w-[168px]">
          {/* 对比度：实测截图里 opacity /60 与 /50 的金色小字在深底上偏暗发灰，
           * 放大后更明显。统一提到 /90 与 /75，与正文层级仍可区分。 */}
          <span className="text-[14px] tracking-[0.25em] text-[#c5a059]/90">周天方位 · 实时</span>
          <span ref={labelRef} className="font-serif-sc text-[21px] font-semibold text-[#f5ebd7] leading-tight">
            {reading.label} · {reading.typeLabel}
          </span>
          <span ref={metaRef} className="text-[15px] text-[#e8dcb8]/90 leading-tight">
            {reading.yinYang}
            {ELEMENT_HANZI[reading.element]} · {reading.solarTerm}
          </span>
          <span className="text-[14px] text-[#c5a059]/75 leading-tight mt-0.5">
            二十四山 · 每山十五度
          </span>
        </div>

        {/* 镜像态角标：说明读数独立于贴图镜像 */}
        {isMirroredDial && (
          <span className="absolute -top-3 right-3 px-2 py-1 rounded bg-black/70 border border-[#c5a059]/40 text-[13px] text-[#c5a059]/90 whitespace-nowrap">
            盘面镜像 · 读数不随之翻转
          </span>
        )}
      </div>
    </div>
  );
};

export default BearingReadout;