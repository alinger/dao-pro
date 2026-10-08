import React, { useState } from 'react';
import { ViewMode } from '../types/tao';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Compass,
  Layers,
  StepForward,
  SlidersHorizontal,
  Move3d,
  Rotate3d,
  FlipHorizontal2,
  ChevronDown,
  X,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { audioEngine } from '../utils/audio';
import { SPEED_PRESETS, ROTATION_DEG_PER_SEC, SINGLE_STEP_DEG } from './Luopan3D';

export type DragMode = 'spin' | 'orbit';

interface HUDTopBarProps {
  currentMode: ViewMode;
  onModeSelect: (mode: ViewMode) => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  armillaryProgress: number;
  onToggleArmillary: () => void;
  speedScale: number;
  onSpeedScaleChange: (speed: number) => void;
  onStep: () => void;
  /** 操作模式：拨动罗盘 / 三维天球视角（原左下角两按钮，现已融合进顶栏） */
  dragMode: DragMode;
  onDragModeChange: (mode: DragMode) => void;
  /** 盘面文字镜像态（原左下角第三按钮，现已融合进顶栏） */
  isMirroredDial: boolean;
  onToggleMirrorDial: () => void;
  /** 打开道韵百科抽屉 */
  onToggleEncyclopedia?: () => void;
  /** 打开使用手册全景页面 */
  onOpenUserManual?: () => void;
}

export const HUDTopBar: React.FC<HUDTopBarProps> = ({
  currentMode,
  onModeSelect,
  isAutoRotate,
  onToggleAutoRotate,
  isMuted,
  onToggleMute,
  armillaryProgress,
  onToggleArmillary,
  speedScale,
  onSpeedScaleChange,
  onStep,
  dragMode,
  onDragModeChange,
  isMirroredDial,
  onToggleMirrorDial,
  onToggleEncyclopedia,
  onOpenUserManual,
}) => {
  /** 「操盘」二级面板开合态（融合原左下角三按钮） */
  const [opPanelOpen, setOpPanelOpen] = useState(false);
  /** 视角菜单开合态（取代原横向导航 + 窄屏 select 双套 UI） */
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const navLinks: { mode: ViewMode; label: string }[] = [
    { mode: 'compass', label: '天元总览' },
    { mode: 'armillary', label: '浑天演象' },
    { mode: 'elements', label: '五行生克' },
    { mode: 'bagua', label: '八卦推演' },
    { mode: 'exploded', label: '分层透视' },
    { mode: 'meditation', label: '阴阳吐纳' },
  ];

  // Cycle forward through the speed presets; wrap around at the end.
  // Matching is done by index rather than by threshold so that an externally
  // injected speedScale (e.g. restored from settings) can never fall through
  // every branch and leave the label blank.
  const currentSpeedIndex = SPEED_PRESETS.findIndex((p) => p.value === speedScale);
  const speedLabel =
    currentSpeedIndex >= 0
      ? SPEED_PRESETS[currentSpeedIndex].label
      : `自定义 (${speedScale.toFixed(2)}x)`;

  const cycleSpeed = () => {
    const nextIndex = (currentSpeedIndex + 1) % SPEED_PRESETS.length;
    onSpeedScaleChange(SPEED_PRESETS[nextIndex].value);
    audioEngine.playBronzeBell();
  };

  const currentNavLabel =
    navLinks.find((n) => n.mode === currentMode)?.label ?? '天元总览';

  return (
    // 顶栏固定单行：main 用 h-[calc(100vh-65px)] 硬编码了 65px 顶栏高度，
    // 若这里 flex 换行（窄视口下 Zone1 标题 + Zone2 导航 + Zone3 五个按钮放不下），
    // 顶栏会涨到 200px+ 并把 main 整体下推，导致所有绝对定位的 HUD 越出视口。
    // 故：h-[65px] 锁高 + shrink-0 防收缩 + whitespace-nowrap 防内部换行。
    // 注意：这里绝对不能保留 overflow-hidden —— 它是历史遗留的「防顶栏换行撑高」手段，
    // 但会把 z-50 的下拉/抽屉面板一起裁掉（面板底 314px > 顶栏底 65px），
    // 表现为「面板明明渲染了却看不到、点到的是下面的 canvas」。
    // 防换行改由 h-[65px] 锁高 + 内部 whitespace-nowrap + 右侧控件断点降级共同保证。
    <header className="relative z-40 flex items-center justify-between gap-3 h-[65px] px-4 xl:px-6 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <span className="text-[24px] font-bold tracking-wider text-[#f5ebd7] font-calligraphy text-shadow whitespace-nowrap truncate">
          道韵乾坤 · 太极五行罗盘
        </span>
      </div>

      {/* Zone 2: 统一视角菜单（单一入口，取代原先 xl:flex 横向导航 + xl:hidden 下拉两套并行 UI）。
       * 融合前：≥1280px 显示 6 个横排链接、<1280px 显示 select —— 同一份数据两套 UI，
       * 且与右侧操作区争夺横向空间（曾导致顶栏换行、main 被下推 274px）。
       * 融合后：一个常驻下拉，任何视口宽度都不换行。 */}
      <div className="relative shrink-0 min-w-0">
        <button
          onClick={() => {
            setViewMenuOpen((v) => !v);
            audioEngine.playSingingBowl(320, 1.4);
          }}
          onContextMenu={(e) => e.preventDefault()}
          title="切换视角模式"
          className={`flex items-center gap-2 px-3.5 py-1.5 text-[17px] font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
            viewMenuOpen
              ? 'bg-[#c5a059]/25 border-[#c5a059] text-[#f5ebd7]'
              : 'border-[#c5a059]/35 bg-[#c5a059]/10 text-[#f5ebd7] hover:border-[#c5a059] hover:bg-[#c5a059]/20'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          <span className="font-calligraphy">{currentNavLabel}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#c5a059] shrink-0 transition-transform duration-200 ${
              viewMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {viewMenuOpen && (
          <>
            {/* 点击遮罩关闭：绝对定位面板必须配遮罩，否则选完要再点一次按钮才收 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setViewMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[184px] py-1.5 bg-[#080b12]/95 backdrop-blur-md border border-[#c5a059]/40 rounded-xl shadow-2xl overflow-hidden">
              {navLinks.map((item) => {
                const isActive = currentMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => {
                      onModeSelect(item.mode);
                      setViewMenuOpen(false);
                      audioEngine.playSingingBowl(320, 1.8);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-[16px] transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#c5a059]/20 text-[#f5ebd7] font-semibold'
                        : 'text-[#c5a059]/85 hover:bg-[#c5a059]/10 hover:text-[#f5ebd7]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] shadow-[0_0_8px_#c5a059] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Zone 3: 统一「操盘」控制簇
       * 融合前散落三处、语义互相重叠：
       *   顶栏 4 键：乾坤破阵 / 转速档 / 拨齿 / 天行动转 / 静音
       *   左下角 3 键：拨动罗盘 / 三维天球视角 / 镜像翻转文字
       * 其中「乾坤破阵」「浑天演象」「横向导航·浑天演象」三者做的是同一件事，
       * 「拨齿」与「转速档」同属「盘的转动」，三个拖拽/镜像键同属「看待盘的方式」。
       * 融合后收敛为：主控簇（天行动转 · 转速 · 拨齿 · 静音）+「操盘」抽屉（含乾坤形态 / 拖拽方式 / 文字镜像）。 */}
      <div className="flex items-center gap-1.5 2xl:gap-3 shrink-0">
        {/* 乾坤形态（原「乾坤破阵」按钮 = 浑天仪展开/复位） */}
        <button
          onClick={onToggleArmillary}
          title={
            armillaryProgress > 0.5
              ? '复位成盘：收起浑天铜环，回到平面罗盘'
              : '乾坤破阵：展开浑天铜环，切入立体浑天仪'
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[16px] font-semibold rounded-lg border transition-all cursor-pointer shrink-0 ${
            armillaryProgress > 0.5
              ? 'bg-[#c5a059] text-black border-[#e8dcb8] shadow-[0_0_14px_rgba(229,190,111,0.5)]'
              : 'border-[#c5a059]/40 bg-[#c5a059]/10 text-[#f5ebd7] hover:border-[#c5a059] hover:bg-[#c5a059]/20'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          {/* ≥1024 显示全称；<1024 只留图标（实测 900/820/768 三档合计仍溢出约 230px） */}
          <span className="hidden lg:inline whitespace-nowrap">
            {armillaryProgress > 0.5 ? '复位成盘' : '乾坤破阵'}
          </span>
        </button>

        {/* 转速档位：分段控件（取代原「点一下循环下一档」的盲点击，
         * 融合前用户无法直接跳到指定档位，也看不出共几档）。
         * 断点必须用 2xl(1536) 而非 md(768)：实测 1024 视口下 7 个控件横排
         * 需要 ~1533px，分段控件（~310px）必须让位给循环按钮，
         * 否则整簇溢出到 header 右边界之外（实测到 1227px > 1024）。 */}
        <div
          className="hidden 2xl:flex items-center gap-0.5 p-0.5 border border-[#c5a059]/30 rounded-lg shrink-0"
          title={`转速档位。基准 ${ROTATION_DEG_PER_SEC}°/秒（约 6 分钟转一圈，24 山各停 15 秒）`}
        >
          {SPEED_PRESETS.map((preset) => {
            const isActive = preset.value === speedScale;
            return (
              <button
                key={preset.value}
                onClick={() => {
                  onSpeedScaleChange(preset.value);
                  audioEngine.playBronzeBell();
                }}
                className={`px-2.5 py-1 text-[15px] rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#c5a059] text-black font-semibold'
                    : 'text-[#c5a059]/80 hover:text-[#f5ebd7] hover:bg-[#c5a059]/10'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        {/* 窄视口降级：仍用循环点击，避免分段控件撑破 1024~1535 宽度 */}
        <button
          onClick={cycleSpeed}
          title="切换转速档位"
          className="2xl:hidden px-2.5 py-1.5 text-[16px] font-mono tabular-nums border border-[#c5a059]/30 rounded-lg text-[#e8dcb8] hover:border-[#c5a059]/60 hover:text-[#f5ebd7] transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          {speedLabel}
        </button>

        {/* 拨齿：单步推进一个刻度 */}
        <button
          onClick={onStep}
          title={`单步拨动一齿：每次前进 ${SINGLE_STEP_DEG}°（一山为 15°）`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[16px] font-medium border border-[#c5a059]/30 rounded-lg text-[#e8dcb8] hover:border-[#c5a059]/60 hover:text-[#f5ebd7] transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <StepForward className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          {/* 文案三档：≥1440 全称、1024~1439 只留「拨齿」、<1024 纯图标 */}
          <span className="hidden xl:inline">拨齿 {SINGLE_STEP_DEG}°</span>
          <span className="hidden lg:inline xl:hidden">拨齿</span>
        </button>

        {/* 天行动转 / 定盘凝神（唯一的自转开关） */}
        <button
          onClick={onToggleAutoRotate}
          title={isAutoRotate ? '暂停天行自转' : '开启天行动转'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[16px] font-medium rounded-lg border transition-all cursor-pointer shrink-0 ${
            isAutoRotate
              ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#f5ebd7]'
              : 'border-[#c5a059]/30 text-[#c5a059]/80 hover:text-[#f5ebd7] hover:border-[#c5a059]/60'
          }`}
        >
          {isAutoRotate ? (
            <Pause className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          ) : (
            <Play className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          )}
          <span className="hidden lg:inline whitespace-nowrap">
            {isAutoRotate ? '天行动转' : '定盘凝神'}
          </span>
        </button>

        {/* 操盘抽屉：收纳「拖拽方式」与「文字镜像」这两组原左下角能力。
         * 用总括按钮 + 二级面板，避免让 5 个并列按钮把顶栏挤爆。 */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              setOpPanelOpen((v) => !v);
              audioEngine.playBronzeBell();
            }}
            title="操盘方式：拖拽行为与盘面文字镜像"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[16px] font-medium rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              opPanelOpen || dragMode === 'orbit' || isMirroredDial
                ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#f5ebd7]'
                : 'border-[#c5a059]/30 text-[#c5a059]/80 hover:text-[#f5ebd7] hover:border-[#c5a059]/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            {/* 文字档位：≥1440 显示「操盘」，1024~1439 只留图标（避免溢出） */}
            <span className="hidden xl:inline">操盘</span>
            <ChevronDown
              className={`hidden lg:block w-3 h-3 text-[#c5a059] shrink-0 transition-transform duration-200 ${
                opPanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {opPanelOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpPanelOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[276px] p-3 bg-[#080b12]/95 backdrop-blur-md border border-[#c5a059]/40 rounded-xl shadow-2xl">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[15px] text-[#c5a059]/90 font-medium tracking-wider">
                    操盘方式
                  </span>
                  <button
                    onClick={() => setOpPanelOpen(false)}
                    className="p-0.5 text-[#c5a059]/70 hover:text-[#f5ebd7] transition-colors cursor-pointer"
                    title="收起"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 拖拽行为：二选一分段（原「拨动罗盘 / 三维天球视角」） */}
                <div className="text-[14px] text-[#c5a059]/70 mb-1.5">拖拽手势</div>
                <div className="flex items-center gap-1 p-0.5 bg-[#c5a059]/8 border border-[#c5a059]/25 rounded-lg mb-3">
                  <button
                    onClick={() => {
                      onDragModeChange('spin');
                      audioEngine.playBronzeBell();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[15px] rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      dragMode === 'spin'
                        ? 'bg-[#c5a059] text-black font-semibold'
                        : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                    }`}
                  >
                    <Rotate3d className="w-3.5 h-3.5 shrink-0" />
                    拨动罗盘
                  </button>
                  <button
                    onClick={() => {
                      onDragModeChange('orbit');
                      audioEngine.playBronzeBell();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[15px] rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      dragMode === 'orbit'
                        ? 'bg-[#c5a059] text-black font-semibold'
                        : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                    }`}
                  >
                    <Move3d className="w-3.5 h-3.5 shrink-0" />
                    三维天球
                  </button>
                </div>

                {/* 文字镜像：开关行 */}
                <button
                  onClick={() => {
                    onToggleMirrorDial();
                    audioEngine.playBronzeBell();
                  }}
                  title="切换罗盘盘面文字左右镜像（HUD 方位读数始终保持正向）"
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer hover:bg-[#c5a059]/10"
                  style={{
                    borderColor: isMirroredDial
                      ? 'rgba(197,160,89,0.6)'
                      : 'rgba(197,160,89,0.22)',
                  }}
                >
                  <span className="flex items-center gap-2 text-[15px] text-[#e8dcb8] whitespace-nowrap">
                    <FlipHorizontal2 className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                    盘面文字镜像
                  </span>
                  <span
                    className={`text-[14px] font-medium shrink-0 ${
                      isMirroredDial ? 'text-[#ffd54f]' : 'text-[#c5a059]/65'
                    }`}
                  >
                    {isMirroredDial ? '已翻转' : '正向'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* 道韵百科入口按钮 */}
        <button
          onClick={() => {
            onToggleEncyclopedia?.();
            audioEngine.playSingingBowl(340, 1.2);
          }}
          title="打开道韵百科（Google 实时联网考据五行八卦二十四山修学典籍 [E]）"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[15px] font-semibold text-[#f5ebd7] bg-[#c5a059]/15 hover:bg-[#c5a059]/30 border border-[#c5a059]/40 hover:border-[#ffd54f]/80 rounded-lg shadow-sm hover:shadow-[0_0_16px_rgba(197,160,89,0.35)] transition-all cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4 text-[#ffd54f] shrink-0" />
          <span className="font-calligraphy hidden sm:inline">道韵百科</span>
        </button>

        {/* 使用手册入口按钮 */}
        <button
          onClick={() => {
            onOpenUserManual?.();
            audioEngine.playSingingBowl(360, 1.4);
          }}
          title="打开使用手册（全套视界、操盘手势、周天六环与快捷键指引 [H]）"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[15px] font-semibold text-[#f5ebd7] bg-[#c5a059]/20 hover:bg-[#c5a059]/35 border border-[#c5a059]/50 hover:border-[#ffd54f] rounded-lg shadow-sm hover:shadow-[0_0_16px_rgba(255,213,79,0.4)] transition-all cursor-pointer shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-[#ffd54f] shrink-0" />
          <span className="font-calligraphy hidden sm:inline">使用手册</span>
        </button>

        {/* 静音 */}
        <button
          onClick={onToggleMute}
          title={isMuted ? '开启清音' : '静音'}
          className="flex items-center justify-center w-9 h-9 text-[16px] font-medium text-[#c5a059] border border-[#c5a059]/30 rounded-lg hover:border-[#c5a059]/60 hover:text-[#f5ebd7] transition-all cursor-pointer shrink-0"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-slate-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-[#c5a059]" />
          )}
        </button>
      </div>
    </header>
  );
};
